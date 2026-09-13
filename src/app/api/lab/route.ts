import { db } from "@/prisma/db";
import { forbidden, getAuth, unauthorized } from "@/lib/auth";

export async function GET(request: Request) {
  const auth = await getAuth(request);
  if (!auth) return unauthorized();
  if (auth.role !== "LAB") return forbidden();

  try {
    const lab = await db.orm.public.Lab.where({ id: auth.labId }).first();
    if (!lab) return Response.json({ success: false, error: "Laboratory not found." }, { status: 404 });

    return Response.json({
      success: true,
      lab: {
        id: lab.id,
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
      },
    });
  } catch (error) {
    console.error("LOAD LAB ERROR:", error);
    return Response.json({ success: false, error: "Failed to load laboratory." }, { status: 500 });
  }
}
