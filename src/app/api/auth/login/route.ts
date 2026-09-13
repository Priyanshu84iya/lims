import { db } from "@/prisma/db";
import { createSession, sessionCookieHeader, verifyPassword } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { role, email, password } = body;

    if ((role !== "ADMIN" && role !== "LAB") || !email || !password) {
      return Response.json({ success: false, error: "Email and password are required." }, { status: 400 });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    if (role === "ADMIN") {
      const admin = await db.orm.public.Admin.where({ email: normalizedEmail }).first();
      if (!admin || !verifyPassword(String(password), admin.passwordHash)) {
        return Response.json({ success: false, error: "Invalid email or password." }, { status: 401 });
      }
      const token = await createSession("ADMIN", admin.id);
      return Response.json(
        { success: true, role: "ADMIN", name: admin.name },
        { headers: { "Set-Cookie": sessionCookieHeader(token) } }
      );
    }

    const lab = await db.orm.public.Lab.where({ loginEmail: normalizedEmail }).first();
    if (!lab || !verifyPassword(String(password), lab.passwordHash)) {
      return Response.json({ success: false, error: "Invalid email or password." }, { status: 401 });
    }
    const token = await createSession("LAB", lab.id);
    return Response.json(
      { success: true, role: "LAB", name: lab.name },
      { headers: { "Set-Cookie": sessionCookieHeader(token) } }
    );
  } catch (error) {
    console.error("LOGIN ERROR:", error);
    return Response.json({ success: false, error: "Login failed. Please try again." }, { status: 500 });
  }
}
