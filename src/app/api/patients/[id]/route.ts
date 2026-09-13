import { db } from "@/prisma/db";
import { forbidden, getAuth, unauthorized } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuth(request);
  if (!auth) return unauthorized();
  if (auth.role !== "LAB") return forbidden();

  try {
    const { id } = await params;
    const patient = await db.orm.public.Patient.where({ id: Number(id), labId: auth.labId }).first();

    if (!patient) {
      return Response.json({ success: false, error: "Patient not found." }, { status: 404 });
    }

    const reports = await db.orm.public.Report.where({ patientId: patient.id }).all();
    const tests = await Promise.all(
      reports.map((report) => db.orm.public.ReportTest.where({ reportId: report.id }).all())
    );

    return Response.json({
      success: true,
      patient,
      reports: reports.map((report, index) => ({ ...report, tests: tests[index] })),
    });
  } catch (error) {
    console.error("LOAD PATIENT ERROR:", error);
    return Response.json({ success: false, error: "Failed to load patient." }, { status: 500 });
  }
}
