import { db } from "@/prisma/db";
import { clearFailedAttempts, clientIp, isThrottled, recordFailedAttempt, createReportAccessToken } from "@/lib/report-access";

const GENERIC_ERROR = "Unable to verify your details. Please check your registered mobile number and date of birth.";

function normalizePhone(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const digits = value.replace(/\D/g, "");
  // Accept 10-digit local numbers, or full numbers with country code (strip leading 91 etc.)
  if (digits.length === 10) return digits;
  if (digits.length > 10) return digits.slice(-10);
  return null;
}

function normalizeDob(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const date = new Date(`${match[1]}-${match[2]}-${match[3]}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

export async function POST(request: Request) {
  const ip = clientIp(request);
  if (isThrottled(ip)) {
    return Response.json(
      { success: false, error: "Too many attempts. Please wait a few minutes and try again." },
      { status: 429 }
    );
  }

  try {
    const body = await request.json().catch(() => null);
    const phone = normalizePhone(body?.phone);
    const dob = normalizeDob(body?.dateOfBirth);

    if (!phone || !dob) {
      recordFailedAttempt(ip);
      return Response.json({ success: false, error: GENERIC_ERROR }, { status: 400 });
    }

    // Find patients across all labs whose phone ends with the same 10 digits.
    // Phone alone is not identifying; DOB must also match exactly.
    const patients = await db.orm.public.Patient.where({ phone }).all();
    const matched = patients.filter((patient) => {
      if (!patient.phone) return false;
      const stored = patient.phone.replace(/\D/g, "");
      const stored10 = stored.length >= 10 ? stored.slice(-10) : stored;
      if (stored10 !== phone) return false;
      const storedDob = new Date(patient.dateOfBirth).toISOString().slice(0, 10);
      return storedDob === dob;
    });

    if (matched.length === 0) {
      recordFailedAttempt(ip);
      return Response.json({ success: false, error: GENERIC_ERROR }, { status: 401 });
    }

    clearFailedAttempts(ip);

    // Collect completed/finalized reports for all matched patients (a patient
    // record is lab-scoped, so reports stay isolated per lab automatically).
    const reportLists = await Promise.all(
      matched.map(async (patient) => {
        const reports = await db.orm.public.Report.where({ patientId: patient.id }).all();
        return reports
          .filter((report) => report.status === "COMPLETED" || report.status === "FINALIZED")
          .map((report) => ({
            reportId: report.id,
            reportNumber: report.reportNumber,
            status: report.status,
            reportDate: report.reportDate,
            patientCode: patient.patientCode,
            token: createReportAccessToken(patient.id, report.id),
          }));
      })
    );
    const reports = reportLists.flat().sort((a, b) => {
      const dateA = a.reportDate ? new Date(a.reportDate).getTime() : 0;
      const dateB = b.reportDate ? new Date(b.reportDate).getTime() : 0;
      return dateB - dateA;
    });

    return Response.json(
      {
        success: true,
        // Only non-sensitive display fields; no phone, DOB, or lab internals.
        reports: reports.map(({ reportId, ...rest }) => rest),
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return Response.json(
      { success: false, error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
