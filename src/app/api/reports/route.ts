import { db } from "@/prisma/db";
import { forbidden, getAuth, unauthorized } from "@/lib/auth";
import { LABORATORY_TESTS } from "@/lib/laboratory/registry";
import {
  getReferenceRange,
  getResultStatus,
} from "@/lib/laboratory/result-status";
import type { Gender } from "@/lib/laboratory/types";

export async function GET(request: Request) {
  const auth = await getAuth(request);
  if (!auth) return unauthorized();
  if (auth.role !== "LAB") return forbidden();

  try {
    const { searchParams } = new URL(request.url);
    const reportId = searchParams.get("id");
    const patientId = searchParams.get("patientId");

    if (reportId) {
      const report = await db.orm.public.Report.where({ id: Number(reportId), labId: auth.labId }).first();

      if (!report) {
        return Response.json({ success: false, error: "Report not found." }, { status: 404 });
      }

      const patient = await db.orm.public.Patient.where({ id: report.patientId }).first();
      const tests = await db.orm.public.ReportTest.where({ reportId: report.id }).all();
      const results = await Promise.all(
        tests.map((test) => db.orm.public.ReportResult.where({ reportTestId: test.id }).all())
      );

      return Response.json({
        success: true,
        report: {
          ...report,
          patient,
          tests: tests.map((test, index) => ({ ...test, results: results[index] })),
        },
      });
    }

    const reports = await db.orm.public.Report.where(
      patientId ? { patientId: Number(patientId), labId: auth.labId } : { labId: auth.labId }
    ).all();
    const patients = await Promise.all(
      reports.map((report) => db.orm.public.Patient.where({ id: report.patientId }).first())
    );
    const tests = await Promise.all(
      reports.map((report) => db.orm.public.ReportTest.where({ reportId: report.id }).all())
    );

    return Response.json({
      success: true,
      reports: reports.map((report, index) => ({ ...report, patient: patients[index], tests: tests[index] })),
    });
  } catch (error) {
    console.error("LOAD REPORTS ERROR:", error);
    return Response.json({ success: false, error: "Failed to load reports." }, { status: 500 });
  }
}

function calculateAge(dateOfBirth: string) {
  const birthDate = new Date(dateOfBirth);
  const today = new Date();

  let age = today.getFullYear() - birthDate.getFullYear();

  const monthDifference =
    today.getMonth() - birthDate.getMonth();

  if (
    monthDifference < 0 ||
    (monthDifference === 0 &&
      today.getDate() < birthDate.getDate())
  ) {
    age--;
  }

  return age;
}

export async function POST(request: Request) {
  const auth = await getAuth(request);
  if (!auth) return unauthorized();
  if (auth.role !== "LAB") return forbidden();

  try {
    const body = await request.json();

    const {
      fullName,
      dateOfBirth,
      gender,
      phoneCountryCode,
      phone,
      email,
      address,
      referredBy,
      selectedTests,
      results,
      customTests,
    } = body;

    // ==========================================
    // VALIDATION
    // ==========================================

    if (!body.patientId && (!fullName || !dateOfBirth || !gender)) {
      return Response.json(
        {
          success: false,
          error:
            "Full name, date of birth and gender are required.",
        },
        { status: 400 }
      );
    }

    if (
      !Array.isArray(selectedTests) ||
      selectedTests.length === 0
    ) {
      return Response.json(
        {
          success: false,
          error:
            "Please select at least one laboratory test.",
        },
        { status: 400 }
      );
    }

    if (!body.patientId) {
      if (!phone || !/^\d{10}$/.test(phone)) {
        return Response.json(
          {
            success: false,
            error:
              "Phone number is required and must be exactly 10 digits.",
          },
          { status: 400 }
        );
      }

      if (
        !email ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email).trim())
      ) {
        return Response.json(
          {
            success: false,
            error: "A valid email address is required.",
          },
          { status: 400 }
        );
      }
    }

    const timestamp = Date.now();

    // ==========================================
    // CREATE OR FIND PATIENT
    // ==========================================

    let patient;
    if (body.patientId) {
      patient = await db.orm.public.Patient.where({ id: Number(body.patientId), labId: auth.labId }).first();
      if (!patient) {
        return Response.json({ success: false, error: "Patient not found." }, { status: 404 });
      }
    } else {
      const existingPatients = await db.orm.public.Patient.where({ labId: auth.labId }).all();
      const maxNumber = existingPatients.reduce((max, p) => {
        const match = p.patientCode.match(/^P(\d+)$/);
        return match ? Math.max(max, parseInt(match[1], 10)) : max;
      }, 0);
      const patientCode = `P${String(maxNumber + 1).padStart(3, "0")}`;

      patient = await db.orm.public.Patient.create({
        patientCode,
        fullName,
        dateOfBirth: new Date(dateOfBirth).toISOString(),
        gender,
        phoneCountryCode: phoneCountryCode || "+91",
        phone,
        email: String(email).trim(),
        address: address || null,
        referredBy: referredBy || null,
        labId: auth.labId,
      });
    }

    // ==========================================
    // CALCULATE AGE
    // ==========================================

    const age = calculateAge(patient.dateOfBirth);

    // ==========================================
    // CREATE REPORT
    // ==========================================

    const report = await db.orm.public.Report.create({
      reportNumber: `RPT-${timestamp}`,
      patientId: patient.id,
      referredBy: referredBy || null,
      status: "COMPLETED",
      reportDate: new Date().toISOString(),
      labId: auth.labId,
    });

    // ==========================================
    // SAVE SELECTED TESTS
    // ==========================================

    for (
      let testIndex = 0;
      testIndex < selectedTests.length;
      testIndex++
    ) {
      const testCode = selectedTests[testIndex];

      // Find the test from the CODE registry
      const laboratoryTest = LABORATORY_TESTS.find(
        (test) => test.code === testCode
      );

      const customTest = Array.isArray(customTests)
        ? customTests.find((test: { code?: string }) => test.code === testCode)
        : undefined;

      if (!laboratoryTest && !customTest) {
        continue;
      }

      const testName = laboratoryTest?.name ?? customTest.name;
      const testCategory = laboratoryTest?.category ?? customTest.category ?? "Custom";
      const parameters = laboratoryTest?.parameters ?? customTest.parameters ?? [];

      // ======================================
      // CREATE REPORT TEST
      // ======================================

      const reportTest =
        await db.orm.public.ReportTest.create({
          reportId: report.id,
          testCode,
          testName,
          category: testCategory,
          sortOrder: testIndex,
        });

      // ======================================
      // SAVE PARAMETERS / RESULTS
      // ======================================

      for (
        let parameterIndex = 0;
        parameterIndex <
        parameters.length;
        parameterIndex++
      ) {
        const parameter =
          parameters[parameterIndex];

        const resultValue =
          results?.[parameter.code] ?? "";

        // Get correct range based on age + gender
        const referenceRange =
          getReferenceRange(parameter, {
            gender: (body.patientId ? patient.gender : gender) as Gender,
            age,
          });

        // Calculate result status
        const status = getResultStatus(
          resultValue,
          parameter,
          {
            gender: (body.patientId ? patient.gender : gender) as Gender,
            age,
          }
        );

        await db.orm.public.ReportResult.create({
          reportTestId: reportTest.id,

          parameterCode: parameter.code,
          parameterName: parameter.name,

          result:
            resultValue === ""
              ? null
              : String(resultValue),

          unit: parameter.unit || null,

          referenceMin:
            referenceRange?.min !== undefined
              ? String(referenceRange.min)
              : null,

          referenceMax:
            referenceRange?.max !== undefined
              ? String(referenceRange.max)
              : null,

          referenceDisplay: referenceRange?.display || null,
          inputType: parameter.inputType || null,

          status,

          sortOrder: parameterIndex,
        });
      }
    }

    // ==========================================
    // SUCCESS RESPONSE
    // ==========================================

    return Response.json({
      success: true,
      message: "Report saved successfully.",

      patientId: patient.id,

      reportId: report.id,

      reportNumber: report.reportNumber,
    });
  } catch (error) {
    console.error("SAVE REPORT ERROR:", error);

    return Response.json(
      {
        success: false,
        error: "Failed to save report.",
      },
      { status: 500 }
    );
  }
}