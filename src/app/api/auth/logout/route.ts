import { clearSessionCookieHeader, destroySession } from "@/lib/auth";

export async function POST(request: Request) {
  await destroySession(request);
  return Response.json({ success: true }, { headers: { "Set-Cookie": clearSessionCookieHeader() } });
}
