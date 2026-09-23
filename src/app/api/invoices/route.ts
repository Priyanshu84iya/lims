import { db } from "@/prisma/db";
import { forbidden, getAuth, unauthorized } from "@/lib/auth";
import { PAYMENT_MODES, createInvoiceForOrder, isValidDiscountPercent } from "@/lib/invoice";
import { isValidPrice } from "@/lib/pricing";

export async function GET(request: Request) {
  const auth = await getAuth(request);
  if (!auth) return unauthorized();
  if (auth.role !== "LAB") return forbidden();

  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim().toLowerCase() || "";
    const paymentStatus = searchParams.get("paymentStatus")?.trim().toUpperCase() || "";
    const dateFrom = searchParams.get("dateFrom")?.trim() || "";
    const dateTo = searchParams.get("dateTo")?.trim() || "";

    const invoices = await db.orm.public.Invoice
      .where({ labId: auth.labId })
      .orderBy((invoice) => invoice.id.desc())
      .all();
    const patients = await db.orm.public.Patient.where({ labId: auth.labId }).all();
    const patientById = new Map(patients.map((patient) => [patient.id, patient]));
    const orders = await db.orm.public.TestOrder.where({ labId: auth.labId }).all();
    const orderById = new Map(orders.map((order) => [order.id, order]));

    let filtered = invoices.map((invoice) => {
      const patient = patientById.get(invoice.patientId);
      const order = orderById.get(invoice.testOrderId);
      return {
        ...invoice,
        patientName: patient?.fullName || "",
        patientCode: patient?.patientCode || "",
        orderNumber: order?.orderNumber || "",
      };
    });

    if (query) {
      filtered = filtered.filter((invoice) =>
        invoice.invoiceNumber.toLowerCase().includes(query) ||
        invoice.patientName.toLowerCase().includes(query) ||
        invoice.patientCode.toLowerCase().includes(query) ||
        invoice.orderNumber.toLowerCase().includes(query)
      );
    }
    if (paymentStatus) {
      filtered = filtered.filter((invoice) => invoice.paymentStatus === paymentStatus);
    }
    if (dateFrom) {
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      filtered = filtered.filter((invoice) => new Date(invoice.createdAt) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      filtered = filtered.filter((invoice) => new Date(invoice.createdAt) <= to);
    }

    return Response.json({ success: true, invoices: filtered });
  } catch (error) {
    console.error("LOAD INVOICES ERROR:", error);
    return Response.json({ success: false, error: "Failed to load invoices." }, { status: 500 });
  }
}

// Creates the invoice for an existing order. Idempotent: when the order
// already has an invoice the existing one is returned instead of a duplicate.
export async function POST(request: Request) {
  const auth = await getAuth(request);
  if (!auth) return unauthorized();
  if (auth.role !== "LAB") return forbidden();

  try {
    const body = await request.json();
    const testOrderId = Number(body?.testOrderId);
    if (!Number.isInteger(testOrderId)) {
      return Response.json({ success: false, error: "A test order is required." }, { status: 400 });
    }

    const order = await db.orm.public.TestOrder.where({ id: testOrderId, labId: auth.labId }).first();
    if (!order) {
      return Response.json({ success: false, error: "Test order not found." }, { status: 404 });
    }

    const existing = await db.orm.public.Invoice.where({ testOrderId }).first();
    if (existing) {
      return Response.json({ success: true, invoice: existing, duplicate: true });
    }

    const orderTests = await db.orm.public.TestOrderTest.where({ testOrderId }).all();
    if (orderTests.length === 0) {
      return Response.json({ success: false, error: "The order has no tests to bill." }, { status: 400 });
    }

    const discountPercent = body?.discountPercent !== undefined ? String(body.discountPercent) : "0";
    const tax = body?.tax !== undefined ? String(body.tax) : "0";
    const amountPaid = body?.amountPaid !== undefined ? String(body.amountPaid) : "0";
    const paymentMode = body?.paymentMode ? String(body.paymentMode) : "";
    const transactionId = body?.transactionId ? String(body.transactionId).trim() : "";
    const sampleType = body?.sampleType ? String(body.sampleType).trim() : "";
    const terms = body?.terms ? String(body.terms) : "";

    if (!isValidDiscountPercent(discountPercent)) {
      return Response.json(
        { success: false, error: "Discount percentage must be between 0 and 100." },
        { status: 400 }
      );
    }
    if (!isValidPrice(tax) || !isValidPrice(amountPaid)) {
      return Response.json(
        { success: false, error: "Tax and amount paid must be non-negative amounts with at most 2 decimals." },
        { status: 400 }
      );
    }
    if (paymentMode && !PAYMENT_MODES.includes(paymentMode as (typeof PAYMENT_MODES)[number])) {
      return Response.json(
        { success: false, error: `Payment mode must be one of: ${PAYMENT_MODES.join(", ")}.` },
        { status: 400 }
      );
    }

    const result = await createInvoiceForOrder({
      labId: auth.labId,
      patientId: order.patientId,
      testOrderId: order.id,
      testCodes: orderTests.map((test) => test.testCode),
      discountPercent,
      tax,
      paymentMode,
      amountPaid,
      transactionId: transactionId || undefined,
      sampleType: sampleType || undefined,
      terms: terms || undefined,
      generatedBy: auth.labId ? `LAB-${auth.labId}` : "LAB",
    });

    if (!result) {
      const raced = await db.orm.public.Invoice.where({ testOrderId }).first();
      if (raced) return Response.json({ success: true, invoice: raced, duplicate: true });
      return Response.json({ success: false, error: "Could not create the invoice." }, { status: 500 });
    }

    const invoice = await db.orm.public.Invoice.where({ id: result.invoiceId }).first();
    return Response.json({ success: true, invoice, missingPrices: result.missingPrices });
  } catch (error) {
    console.error("CREATE INVOICE ERROR:", error);
    return Response.json({ success: false, error: "Failed to create invoice." }, { status: 500 });
  }
}
