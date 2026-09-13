import { db } from "@/prisma/db";
import { forbidden, getAuth, unauthorized } from "@/lib/auth";

export async function GET(request: Request) {
  const auth = await getAuth(request);
  if (!auth) return unauthorized();
  if (auth.role !== "LAB") return forbidden();

  try {
    const tests = await db.orm.public.CustomTest.where({ labId: auth.labId }).all();
    return Response.json({ success: true, tests });
  } catch (error) {
    console.error("LOAD CUSTOM TESTS ERROR:", error);
    return Response.json({ success: false, error: "Failed to load custom tests." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await getAuth(request);
  if (!auth) return unauthorized();
  if (auth.role !== "LAB") return forbidden();

  try {
    const body = await request.json();
    const { code, name, category, parameters } = body;

    if (!code || !name || !Array.isArray(parameters) || parameters.length === 0) {
      return Response.json(
        { success: false, error: "Code, name, and at least one parameter are required." },
        { status: 400 }
      );
    }

    const test = await db.orm.public.CustomTest.create({
      code: String(code).trim().toUpperCase(),
      labId: auth.labId,
      definition: JSON.stringify({
        name: String(name).trim(),
        category: category || "Custom",
        parameters,
      }),
    });

    return Response.json({ success: true, test });
  } catch (error) {
    console.error("SAVE CUSTOM TEST ERROR:", error);
    return Response.json({ success: false, error: "Failed to save custom test." }, { status: 500 });
  }
}
