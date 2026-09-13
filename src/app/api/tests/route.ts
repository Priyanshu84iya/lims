import { NextResponse } from "next/server";
import { LABORATORY_TESTS, getLaboratoryCategories } from "@/lib/laboratory/registry";
import { forbidden, getAuth, unauthorized } from "@/lib/auth";

export async function GET(request: Request) {
  const auth = await getAuth(request);
  if (!auth) return unauthorized();
  if (auth.role !== "LAB" && auth.role !== "ADMIN") return forbidden();

  return NextResponse.json({ success: true, tests: LABORATORY_TESTS, categories: getLaboratoryCategories() });
}
