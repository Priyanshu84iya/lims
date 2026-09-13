import { getAuth, unauthorized } from "@/lib/auth";

export async function GET(request: Request) {
  const auth = await getAuth(request);
  if (!auth) return unauthorized();
  return Response.json({ success: true, user: auth });
}
