import { db } from "@/prisma/db";
import { forbidden, getAuth, unauthorized } from "@/lib/auth";
import { resolveLabTests } from "@/lib/laboratory/test-order";
import { createInvoiceInTx, isValidDiscountPercent, prepareInvoice } from "@/lib/invoice";

export async function GET(request: Request) {
  const auth = await getAuth(request);
  if (!auth) return unauthorized();
  if (auth.role !== "LAB") return forbidden();

  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim().toLowerCase();

    const orders = await db.orm.public.TestOrder.where({ labId: auth.labId }).all();
    const patients = await Promise.all(
      orders.map((order) => db.orm.public.Patient.where({ id: order.patientId }).first())
    );
    const tests = await Promise.all(
      orders.map((order) => db.orm.public.TestOrderTest.where({ testOrderId: order.id }).all())
    );

    const enriched = orders.map((order, index) => ({
      ...order,
      patient: patients[index],
      tests: tests[index],
    }));

    const filtered = query
      ? enriched.filter((order) =>
          order.orderNumber.toLowerCase().includes(query) ||
          (order.patient?.patientCode || "").toLowerCase().includes(query) ||
          (order.patient?.fullName || "").toLowerCase().includes(query)
        )
      : enriched;

    return Response.json({ success: true, orders: filtered });
  } catch (error) {
    console.error("LOAD TEST ORDERS ERROR:", error);
    return Response.json({ success: false, error: "Failed to load test orders." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await getAuth(request);
  if (!auth) return unauthorized();
  if (auth.role !== "LAB") return forbidden();

  try {
    const body = await request.json();
    const { patientId, selectedTests, referredBy } = body;
    const discountPercent = body?.discountPercent !== undefined ? String(body.discountPercent) : "0";

    if (!patientId || !Number.isInteger(Number(patientId))) {
      return Response.json({ success: false, error: "A registered patient is required." }, { status: 400 });
    }

    if (!Array.isArray(selectedTests) || selectedTests.length === 0) {
      return Response.json({ success: false, error: "Please select at least one test." }, { status: 400 });
    }

    // Patient must belong to the caller's lab.
    const patient = await db.orm.public.Patient.where({ id: Number(patientId), labId: auth.labId }).first();
    if (!patient) {
      return Response.json({ success: false, error: "Patient not found." }, { status: 404 });
    }

    // Every requested test code must exist in the registry or this lab's custom tests.
    const labTests = await resolveLabTests(auth.labId);
    const uniqueCodes = Array.from(new Set(selectedTests.map((code: unknown) => String(code))));
    const invalid = uniqueCodes.filter((code) => !labTests.has(code));
    if (invalid.length > 0) {
      return Response.json(
        { success: false, error: `Unknown test code(s): ${invalid.join(", ")}.` },
        { status: 400 }
      );
    }

    // Server-side validation — frontend totals are never trusted.
    if (!isValidDiscountPercent(discountPercent)) {
      return Response.json(
        { success: false, error: "Discount percentage must be between 0 and 100." },
        { status: 400 }
      );
    }

    // Snapshot prices BEFORE the transaction so the DB round-trips stay short.
    const prepared = await prepareInvoice(auth.labId, uniqueCodes, discountPercent);

    const timestamp = Date.now();
    const result = await db.transaction(async (tx) => {
      const order = await tx.orm.public.TestOrder.create({
        orderNumber: `ORD-${timestamp}`,
        patientId: patient.id,
        labId: auth.labId,
        referredBy: referredBy || patient.referredBy || null,
        status: "PENDING",
      });

      const orderTests = [];
      for (let index = 0; index < uniqueCodes.length; index++) {
        const test = labTests.get(uniqueCodes[index])!;
        const orderTest = await tx.orm.public.TestOrderTest.create({
          testOrderId: order.id,
          testCode: test.code,
          testName: test.name,
          category: test.category,
          status: "PENDING",
        });
        orderTests.push(orderTest);
      }

      // Invoice is created atomically with the order — one commit, no window
      // where an order exists without its invoice.
      const invoice = await createInvoiceInTx(
        tx,
        {
          labId: auth.labId,
          patientId: patient.id,
          testOrderId: order.id,
          testCodes: uniqueCodes,
          discountPercent,
          generatedBy: patient.fullName,
        },
        prepared
      );

      return { order, orderTests, invoice };
    });

    return Response.json({
      success: true,
      order: result.order,
      tests: result.orderTests,
      invoice: result.invoice
        ? {
            id: result.invoice.invoiceId,
            invoiceNumber: result.invoice.invoiceNumber,
            missingPrices: result.invoice.missingPrices,
          }
        : null,
    });
  } catch (error) {
    console.error("CREATE TEST ORDER ERROR:", error);
    return Response.json({ success: false, error: "Failed to create test order." }, { status: 500 });
  }
}
