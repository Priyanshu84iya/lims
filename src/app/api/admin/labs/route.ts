import { db } from "@/prisma/db";
import { forbidden, getAuth, hashPassword, unauthorized } from "@/lib/auth";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function labResponse(lab: {
  id: number; name: string; email: string; loginEmail: string;
  phoneCountryCode: string | null; phone: string | null; address: string | null;
  city: string | null; state: string | null; pincode: string | null;
  registrationNumber: string | null; licenseNumber: string | null; gstNumber: string | null;
  website: string | null; directorName: string | null; directorQualification: string | null;
  logoUrl: string | null; signatureUrl: string | null; createdAt: string;
}) {
  return {
    id: lab.id,
    name: lab.name,
    email: lab.email,
    loginEmail: lab.loginEmail,
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
    createdAt: lab.createdAt,
  };
}

export async function GET(request: Request) {
  const auth = await getAuth(request);
  if (!auth) return unauthorized();
  if (auth.role !== "ADMIN") return forbidden();

  try {
    const labs = await db.orm.public.Lab.where({}).all();
    const counts = await Promise.all(
      labs.map(async (lab) => ({
        patients: (await db.orm.public.Patient.where({ labId: lab.id }).all()).length,
        reports: (await db.orm.public.Report.where({ labId: lab.id }).all()).length,
      }))
    );
    return Response.json({
      success: true,
      labs: labs.map((lab, index) => ({ ...labResponse(lab), patientsCount: counts[index].patients, reportsCount: counts[index].reports })),
    });
  } catch (error) {
    console.error("LOAD LABS ERROR:", error);
    return Response.json({ success: false, error: "Failed to load laboratories." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await getAuth(request);
  if (!auth) return unauthorized();
  if (auth.role !== "ADMIN") return forbidden();

  try {
    const body = await request.json();
    const {
      name, email, loginEmail, password,
      phoneCountryCode, phone, address, city, state, pincode,
      registrationNumber, licenseNumber, gstNumber, website,
      directorName, directorQualification, logoUrl, signatureUrl,
    } = body;

    if (!name?.trim() || !loginEmail?.trim() || !password) {
      return Response.json({ success: false, error: "Lab name, login email, and password are required." }, { status: 400 });
    }
    if (!EMAIL_PATTERN.test(String(loginEmail).trim())) {
      return Response.json({ success: false, error: "Login email must be a valid email address." }, { status: 400 });
    }
    if (email && !EMAIL_PATTERN.test(String(email).trim())) {
      return Response.json({ success: false, error: "Lab email must be a valid email address." }, { status: 400 });
    }
    if (String(password).length < 8) {
      return Response.json({ success: false, error: "Password must be at least 8 characters." }, { status: 400 });
    }
    if (phone && !/^\d{10}$/.test(String(phone))) {
      return Response.json({ success: false, error: "Phone number must be exactly 10 digits." }, { status: 400 });
    }

    const normalizedLogin = String(loginEmail).trim().toLowerCase();
    const existing = await db.orm.public.Lab.where({ loginEmail: normalizedLogin }).first();
    if (existing) {
      return Response.json({ success: false, error: "A lab with this login email already exists." }, { status: 409 });
    }

    const lab = await db.orm.public.Lab.create({
      name: String(name).trim(),
      email: email ? String(email).trim() : normalizedLogin,
      loginEmail: normalizedLogin,
      passwordHash: hashPassword(String(password)),
      phoneCountryCode: phone ? (phoneCountryCode || "+91") : null,
      phone: phone ? String(phone) : null,
      address: address || null,
      city: city || null,
      state: state || null,
      pincode: pincode || null,
      registrationNumber: registrationNumber || null,
      licenseNumber: licenseNumber || null,
      gstNumber: gstNumber || null,
      website: website || null,
      directorName: directorName || null,
      directorQualification: directorQualification || null,
      logoUrl: logoUrl || null,
      signatureUrl: signatureUrl || null,
    });

    return Response.json({ success: true, lab: labResponse(lab) });
  } catch (error) {
    console.error("CREATE LAB ERROR:", error);
    return Response.json({ success: false, error: "Failed to register laboratory." }, { status: 500 });
  }
}
