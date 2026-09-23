import { db } from "@/prisma/db";
import { forbidden, getAuth, unauthorized } from "@/lib/auth";
import {
  calculateAge,
  isTestComplete,
  resolveLabTests,
} from "@/lib/laboratory/test-order";
import {
  getReferenceRange,
  getResultStatus,
} from "@/lib/laboratory/result-status";
import type { Gender } from "@/lib/laboratory/types";

const ORDER_STATUSES = new Set([
  "PENDING",
  "SAMPLE_COLLECTED",
  "IN_PROGRESS",
  "COMPLETED",
  "REPORT_GENERATED",
]);

const TEST_STATUSES = new Set(["PENDING", "IN_PROGRESS", "COMPLETED"]);

async function loadOrder(orderId: number, labId: number) {
  const order = await db.orm.public.TestOrder.where({ id: orderId, labId }).first();
  if (!order) return null;
  const patient = await db.orm.public.Patient.where({ id: order.patientId }).first();
  const tests = await db.orm.public.TestOrderTest.where({ testOrderId: order.id }).all();
  const results = await Promise.all(
    tests.map((test) => db.orm.public.TestOrderResult.where({ testOrderTestId: test.id }).all())
  );
  return {
    order,
    patient,
    tests: tests.map((test, index) => ({ ...test, results: results[index] })),
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuth(request);
  if (!auth) return unauthorized();
  if (auth.role !== "LAB") return forbidden();

  try {
    const { id } = await params;
    const data = await loadOrder(Number(id), auth.labId);
    if (!data) {
      return Response.json({ success: false, error: "Test order not found." }, { status: 404 });
    }
    return Response.json({ success: true, ...data });
  } catch (error) {
    console.error("LOAD TEST ORDER ERROR:", error);
    return Response.json({ success: false, error: "Failed to load test order." }, { status: 500 });
  }
}

// Update order status / sample collection, or save results for one order test.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuth(request);
  if (!auth) return unauthorized();
  if (auth.role !== "LAB") return forbidden();

  try {
    const { id } = await params;
    const orderId = Number(id);
    const order = await db.orm.public.TestOrder.where({ id: orderId, labId: auth.labId }).first();
    if (!order) {
      return Response.json({ success: false, error: "Test order not found." }, { status: 404 });
    }
    if (order.status === "REPORT_GENERATED") {
      return Response.json(
        { success: false, error: "This order's report has been generated and can no longer be modified." },
        { status: 409 }
      );
    }

    const body = await request.json();
    const labTests = await resolveLabTests(auth.labId);
    const patient = await db.orm.public.Patient.where({ id: order.patientId }).first();
    if (!patient) {
      return Response.json({ success: false, error: "Patient not found." }, { status: 404 });
    }
    const age = calculateAge(patient.dateOfBirth);
    const gender = patient.gender as Gender;

    // ---- Save results for a single order test (draft or complete) ----
    if (body.testId !== undefined) {
      const orderTest = await db.orm.public.TestOrderTest.where({
        id: Number(body.testId),
        testOrderId: order.id,
      }).first();
      if (!orderTest) {
        return Response.json({ success: false, error: "Test not found on this order." }, { status: 404 });
      }

      const definition = labTests.get(orderTest.testCode);
      if (!definition) {
        return Response.json(
          { success: false, error: "This test's definition is no longer available." },
          { status: 409 }
        );
      }

      const incoming: Record<string, string> = {};
      if (body.results && typeof body.results === "object") {
        for (const [code, value] of Object.entries(body.results)) {
          incoming[code] = String(value ?? "");
        }
      }

      // Only accept values for parameters that belong to this test's definition.
      const knownCodes = new Set(definition.parameters.map((parameter) => parameter.code));
      for (const code of Object.keys(incoming)) {
        if (!knownCodes.has(code)) delete incoming[code];
      }

      const existing = await db.orm.public.TestOrderResult.where({
        testOrderTestId: orderTest.id,
      }).all();

      for (const parameter of definition.parameters) {
        const value = incoming[parameter.code];
        const referenceRange = getReferenceRange(parameter, { gender, age });
        const status = getResultStatus(value, parameter, { gender, age });

        const row = existing.find((item) => item.parameterCode === parameter.code);
        const fields = {
          result: value === undefined || value === "" ? null : value,
          unit: parameter.unit || null,
          referenceMin: referenceRange?.min !== undefined ? String(referenceRange.min) : null,
          referenceMax: referenceRange?.max !== undefined ? String(referenceRange.max) : null,
          referenceDisplay: referenceRange?.display || null,
          inputType: parameter.inputType || null,
          status,
        };

        if (row) {
          await db.orm.public.TestOrderResult.where({ id: row.id }).update(fields);
        } else {
          await db.orm.public.TestOrderResult.create({
            testOrderTestId: orderTest.id,
            parameterCode: parameter.code,
            parameterName: parameter.name,
            sortOrder: parameter.sortOrder,
            ...fields,
          });
        }
      }

      // Test status: explicit value, or derived from completeness.
      let nextTestStatus = orderTest.status;
      if (typeof body.testStatus === "string" && TEST_STATUSES.has(body.testStatus)) {
        nextTestStatus = body.testStatus;
      } else if (isTestComplete(definition, incoming)) {
        nextTestStatus = "COMPLETED";
      } else if (Object.values(incoming).some((value) => value !== "")) {
        nextTestStatus = "IN_PROGRESS";
      }
      await db.orm.public.TestOrderTest.where({ id: orderTest.id }).update({ status: nextTestStatus });
    }

    // ---- Update order-level status / sample collection ----
    const orderUpdates: Record<string, unknown> = {};
    if (body.sampleCollected === true && !order.sampleCollectedAt) {
      orderUpdates.sampleCollectedAt = new Date().toISOString();
      if (order.status === "PENDING") orderUpdates.status = "SAMPLE_COLLECTED";
    }
    if (typeof body.status === "string" && ORDER_STATUSES.has(body.status)) {
      // The order can only be COMPLETED when every test is COMPLETED.
      if (body.status === "COMPLETED") {
        const orderTests = await db.orm.public.TestOrderTest.where({ testOrderId: order.id }).all();
        const incomplete = orderTests.filter((test) => test.status !== "COMPLETED");
        if (incomplete.length > 0) {
          return Response.json(
            {
              success: false,
              error: `Cannot complete the order: ${incomplete.length} test(s) still have missing results.`,
            },
            { status: 409 }
          );
        }
      }
      if (body.status === "REPORT_GENERATED") {
        return Response.json(
          { success: false, error: "Use the generate-report action to finalize a report." },
          { status: 400 }
        );
      }
      orderUpdates.status = body.status;
    }
    if (Object.keys(orderUpdates).length > 0) {
      await db.orm.public.TestOrder.where({ id: order.id }).update(orderUpdates);
    }

    const data = await loadOrder(order.id, auth.labId);
    return Response.json({ success: true, ...data });
  } catch (error) {
    console.error("UPDATE TEST ORDER ERROR:", error);
    return Response.json({ success: false, error: "Failed to update test order." }, { status: 500 });
  }
}

// Generate the final report from the order's entered results.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuth(request);
  if (!auth) return unauthorized();
  if (auth.role !== "LAB") return forbidden();

  try {
    const { id } = await params;
    const orderId = Number(id);
    const order = await db.orm.public.TestOrder.where({ id: orderId, labId: auth.labId }).first();
    if (!order) {
      return Response.json({ success: false, error: "Test order not found." }, { status: 404 });
    }
    if (order.reportId) {
      return Response.json(
        { success: false, error: "A report has already been generated for this order." },
        { status: 409 }
      );
    }

    const patient = await db.orm.public.Patient.where({ id: order.patientId }).first();
    if (!patient) {
      return Response.json({ success: false, error: "Patient not found." }, { status: 404 });
    }

    const orderTests = await db.orm.public.TestOrderTest.where({ testOrderId: order.id }).all();
    const labTests = await resolveLabTests(auth.labId);

    // Never fabricate results: every test must be COMPLETED with saved values.
    const incomplete = orderTests.filter((test) => test.status !== "COMPLETED");
    if (incomplete.length > 0) {
      return Response.json(
        {
          success: false,
          error: `Cannot generate the report: ${incomplete.map((test) => test.testName).join(", ")} still have missing results.`,
        },
        { status: 409 }
      );
    }

    const timestamp = Date.now();
    const report = await db.orm.public.Report.create({
      reportNumber: `RPT-${timestamp}`,
      patientId: patient.id,
      referredBy: order.referredBy,
      status: "COMPLETED",
      sampleCollectedAt: order.sampleCollectedAt,
      reportDate: new Date().toISOString(),
      labId: auth.labId,
    });

    for (let testIndex = 0; testIndex < orderTests.length; testIndex++) {
      const orderTest = orderTests[testIndex];
      const reportTest = await db.orm.public.ReportTest.create({
        reportId: report.id,
        testCode: orderTest.testCode,
        testName: orderTest.testName,
        category: orderTest.category,
        sortOrder: testIndex,
      });

      const orderResults = await db.orm.public.TestOrderResult.where({
        testOrderTestId: orderTest.id,
      }).all();

      for (const result of orderResults) {
        await db.orm.public.ReportResult.create({
          reportTestId: reportTest.id,
          parameterCode: result.parameterCode,
          parameterName: result.parameterName,
          result: result.result,
          unit: result.unit,
          referenceMin: result.referenceMin,
          referenceMax: result.referenceMax,
          referenceDisplay: result.referenceDisplay,
          inputType: result.inputType,
          status: result.status,
          sortOrder: result.sortOrder,
        });
      }
    }

    await db.orm.public.TestOrder.where({ id: order.id }).update({
      reportId: report.id,
      status: "REPORT_GENERATED",
    });

    return Response.json({
      success: true,
      message: "Report generated successfully.",
      reportId: report.id,
      reportNumber: report.reportNumber,
    });
  } catch (error) {
    console.error("GENERATE ORDER REPORT ERROR:", error);
    return Response.json({ success: false, error: "Failed to generate report." }, { status: 500 });
  }
}
