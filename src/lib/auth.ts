import { createHash, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { db } from "@/prisma/db";

export const SESSION_COOKIE = "lims_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

export type AuthContext =
  | { role: "ADMIN"; adminId: number; name: string; email: string }
  | { role: "LAB"; labId: number; name: string; email: string };

async function readToken(request?: Request) {
  if (request) {
    const header = request.headers.get("cookie") || "";
    const match = header.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`));
    return match ? decodeURIComponent(match[1]) : null;
  }
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value || null;
}

export async function getAuth(request?: Request): Promise<AuthContext | null> {
  const token = await readToken(request);
  if (!token) return null;

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const session = await db.orm.public.Session.where({ token: tokenHash }).first();
  if (!session) return null;

  if (new Date(session.expiresAt).getTime() < Date.now()) {
    await db.orm.public.Session.where({ id: session.id }).delete();
    return null;
  }

  if (session.role === "ADMIN" && session.adminId) {
    const admin = await db.orm.public.Admin.where({ id: session.adminId }).first();
    if (!admin) return null;
    return { role: "ADMIN", adminId: admin.id, name: admin.name, email: admin.email };
  }

  if (session.role === "LAB" && session.labId) {
    const lab = await db.orm.public.Lab.where({ id: session.labId }).first();
    if (!lab) return null;
    return { role: "LAB", labId: lab.id, name: lab.name, email: lab.loginEmail };
  }

  return null;
}

export async function createSession(role: "ADMIN" | "LAB", subjectId: number) {
  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  await db.orm.public.Session.create({
    token: tokenHash,
    role,
    adminId: role === "ADMIN" ? subjectId : null,
    labId: role === "LAB" ? subjectId : null,
    expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
  });
  return token;
}

export async function destroySession(request?: Request) {
  const token = await readToken(request);
  if (!token) return;
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const session = await db.orm.public.Session.where({ token: tokenHash }).first();
  if (session) await db.orm.public.Session.where({ id: session.id }).delete();
}

export function sessionCookieHeader(token: string) {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL_MS / 1000}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;
}

export function clearSessionCookieHeader() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export function unauthorized() {
  return Response.json({ success: false, error: "Authentication required." }, { status: 401 });
}

export function forbidden() {
  return Response.json({ success: false, error: "You do not have access to this resource." }, { status: 403 });
}
