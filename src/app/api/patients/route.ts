import { db } from "@/prisma/db";
import { forbidden, getAuth, unauthorized } from "@/lib/auth";

export async function GET(request: Request) {
  const auth = await getAuth(request);
  if (!auth) return unauthorized();
  if (auth.role !== "LAB") return forbidden();

  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim().toLowerCase();

    let patients = await db.orm.public.Patient.where({ labId: auth.labId }).all();

    if (query) {
      patients = patients.filter((patient) =>
        patient.patientCode.toLowerCase().includes(query) ||
        patient.fullName.toLowerCase().includes(query) ||
        (patient.phone || "").includes(query) ||
        (patient.email || "").toLowerCase().includes(query)
      );
    }

    const reportCounts = await Promise.all(
      patients.map(async (patient) => (await db.orm.public.Report.where({ patientId: patient.id }).all()).length)
    );

    return Response.json({
      success: true,
      patients: patients.map((patient, index) => ({ ...patient, reportsCount: reportCounts[index] })),
    });
  } catch (error) {
    console.error("LOAD PATIENTS ERROR:", error);
    return Response.json({ success: false, error: "Failed to load patients." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await getAuth(request);
  if (!auth) return unauthorized();
  if (auth.role !== "LAB") return forbidden();

  try {
    const body = await request.json();
    const { fullName, dateOfBirth, gender, phoneCountryCode, phone, email, address, referredBy } = body;

    if (!fullName || !dateOfBirth || !gender) {
      return Response.json({ success: false, error: "Full name, date of birth and gender are required." }, { status: 400 });
    }

    if (!phone || !/^\d{10}$/.test(phone)) {
      return Response.json({ success: false, error: "Phone number is required and must be exactly 10 digits." }, { status: 400 });
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email).trim())) {
      return Response.json({ success: false, error: "A valid email address is required." }, { status: 400 });
    }

    const existingPatients = await db.orm.public.Patient.where({ labId: auth.labId }).all();
    const maxNumber = existingPatients.reduce((max, patient) => {
      const match = patient.patientCode.match(/^P(\d+)$/);
      return match ? Math.max(max, parseInt(match[1], 10)) : max;
    }, 0);
    const patientCode = `P${String(maxNumber + 1).padStart(3, "0")}`;

    const patient = await db.orm.public.Patient.create({
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

    return Response.json({ success: true, patient });
  } catch (error) {
    console.error("CREATE PATIENT ERROR:", error);
    return Response.json({ success: false, error: "Failed to register patient." }, { status: 500 });
  }
}
