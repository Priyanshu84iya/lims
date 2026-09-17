import { db } from "@/prisma/db";
import { forbidden, getAuth, hashPassword, unauthorized } from "@/lib/auth";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function str(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuth(request);
  if (!auth) return unauthorized();
  if (auth.role !== "ADMIN") return forbidden();

  try {
    const { id } = await params;
    const lab = await db.orm.public.Lab.where({ id: Number(id) }).first();
    if (!lab) {
      return Response.json({ success: false, error: "Laboratory not found." }, { status: 404 });
    }
    const { passwordHash: _passwordHash, ...safeLab } = lab;
    return Response.json({ success: true, lab: safeLab });
  } catch (error) {
    console.error("LOAD LAB ERROR:", error);
    return Response.json({ success: false, error: "Failed to load laboratory." }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuth(request);
  if (!auth) return unauthorized();
  if (auth.role !== "ADMIN") return forbidden();

  try {
    const { id } = await params;
    const labId = Number(id);
    if (!Number.isInteger(labId) || labId <= 0) {
      return Response.json({ success: false, error: "Invalid laboratory id." }, { status: 400 });
    }

    const lab = await db.orm.public.Lab.where({ id: labId }).first();
    if (!lab) {
      return Response.json({ success: false, error: "Laboratory not found." }, { status: 404 });
    }

    const body = await request.json();
    const {
      name, email, loginEmail, password,
      phoneCountryCode, phone, address, city, state, pincode,
      registrationNumber, licenseNumber, gstNumber, website,
      directorName, directorQualification, logoUrl, signatureUrl,
    } = body;

    if (!name?.trim()) {
      return Response.json({ success: false, error: "Lab name is required." }, { status: 400 });
    }
    if (!loginEmail?.trim()) {
      return Response.json({ success: false, error: "Login email is required." }, { status: 400 });
    }
    if (!EMAIL_PATTERN.test(String(loginEmail).trim())) {
      return Response.json({ success: false, error: "Login email must be a valid email address." }, { status: 400 });
    }
    if (email && !EMAIL_PATTERN.test(String(email).trim())) {
      return Response.json({ success: false, error: "Lab email must be a valid email address." }, { status: 400 });
    }
    if (password && String(password).length < 8) {
      return Response.json({ success: false, error: "Password must be at least 8 characters." }, { status: 400 });
    }
    if (phone && !/^\d{10}$/.test(String(phone))) {
      return Response.json({ success: false, error: "Phone number must be exactly 10 digits." }, { status: 400 });
    }

    const normalizedLogin = String(loginEmail).trim().toLowerCase();
    if (normalizedLogin !== lab.loginEmail) {
      const existing = await db.orm.public.Lab.where({ loginEmail: normalizedLogin }).first();
      if (existing) {
        return Response.json({ success: false, error: "A lab with this login email already exists." }, { status: 409 });
      }
    }

    const updates: Record<string, unknown> = {
      name: String(name).trim(),
      email: email ? String(email).trim() : normalizedLogin,
      loginEmail: normalizedLogin,
      phoneCountryCode: phone ? (phoneCountryCode || "+91") : null,
      phone: phone ? String(phone) : null,
      address: str(address),
      city: str(city),
      state: str(state),
      pincode: str(pincode),
      registrationNumber: str(registrationNumber),
      licenseNumber: str(licenseNumber),
      gstNumber: str(gstNumber),
      website: str(website),
      directorName: str(directorName),
      directorQualification: str(directorQualification),
      logoUrl: str(logoUrl),
      signatureUrl: str(signatureUrl),
    };

    if (password) {
      updates.passwordHash = hashPassword(String(password));
    }

    await db.orm.public.Lab.where({ id: labId }).update(updates);

    const updated = await db.orm.public.Lab.where({ id: labId }).first();
    return Response.json({ success: true, lab: updated });
  } catch (error) {
    console.error("UPDATE LAB ERROR:", error);
    return Response.json({ success: false, error: "Failed to update laboratory." }, { status: 500 });
  }
}
