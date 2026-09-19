import { db } from "@/prisma/db";
import { verifyReportAccessToken } from "@/lib/report-access";
import { generateReportPdf } from "@/lib/report-pdf";
import type { LabInfo, ReportRecord } from "@/lib/report-render-data";

const GENERIC_ERROR = "Your download link is invalid or has expired. Please verify your details again.";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const token = typeof body?.token === "string" ? body.token : "";
    const claims = verifyReportAccessToken(token);
    if (!claims) {
      return Response.json({ success: false, error: GENERIC_ERROR }, { status: 401 });
    }

    // The token is HMAC-signed server-side; report and patient must still match
    // so a leaked/stale token can never pull another patient's report.
    const report = await db.orm.public.Report.where({ id: claims.reportId, patientId: claims.patientId }).first();
    if (!report) {
      return Response.json({ success: false, error: GENERIC_ERROR }, { status: 401 });
    }
    if (report.status !== "COMPLETED" && report.status !== "FINALIZED") {
      return Response.json({ success: false, error: GENERIC_ERROR }, { status: 403 });
    }

    const patient = await db.orm.public.Patient.where({ id: report.patientId }).first();
    const lab = await db.orm.public.Lab.where({ id: report.labId }).first();
    if (!patient || !lab) {
      return Response.json({ success: false, error: GENERIC_ERROR }, { status: 401 });
    }

    const tests = await db.orm.public.ReportTest.where({ reportId: report.id }).all();
    const results = await Promise.all(
      tests.map((test) => db.orm.public.ReportResult.where({ reportTestId: test.id }).all())
    );

    const reportRecord: ReportRecord = {
      ...report,
      patient,
      tests: tests.map((test, index) => ({ ...test, results: results[index] })),
    };

    const labInfo: LabInfo = {
      name: lab.name,
      email: lab.email,
      phoneCountryCode: lab.phoneCountryCode,
      phone: lab.phone,
      address: lab.address,
      city: lab.city,
      state: lab.state,
      pincode: lab.pincode,
      registrationNumber: lab.registrationNumber,
      licenseNumber: lab.licenseNumber,
      gstNumber: lab.gstNumber,
      website: lab.website,
      directorName: lab.directorName,
      directorQualification: lab.directorQualification,
      logoUrl: lab.logoUrl,
      signatureUrl: lab.signatureUrl,
    };

    const pdf = await generateReportPdf({ report: reportRecord, lab: labInfo });

    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${report.reportNumber}.pdf"`,
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "Pragma": "no-cache",
      },
    });
  } catch {
    return Response.json(
      { success: false, error: "Failed to generate the report. Please try again." },
      { status: 500 }
    );
  }
}
