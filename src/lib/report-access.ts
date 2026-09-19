import { createHmac, timingSafeEqual, randomBytes } from "crypto";

const TOKEN_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_FAILED_ATTEMPTS = 5;
const THROTTLE_MS = 10 * 60 * 1000; // 10 minutes

function secret() {
  return process.env.REPORT_ACCESS_SECRET || process.env.AUTH_SECRET || process.env.DATABASE_URL || "lims-fallback-secret";
}

function base64url(input: Buffer | string) {
  return Buffer.from(input).toString("base64url");
}

export function createReportAccessToken(patientId: number, reportId: number): string {
  const expiresAt = Date.now() + TOKEN_TTL_MS;
  const nonce = randomBytes(8).toString("hex");
  const payload = `${patientId}.${reportId}.${expiresAt}.${nonce}`;
  const signature = createHmac("sha256", secret()).update(payload).digest("base64url");
  return `${base64url(payload)}.${signature}`;
}

export function verifyReportAccessToken(token: string): { patientId: number; reportId: number } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const payload = Buffer.from(parts[0], "base64url").toString();
    const signature = parts[1];
    const expected = createHmac("sha256", secret()).update(payload).digest("base64url");
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

    const [patientId, reportId, expiresAt] = payload.split(".");
    if (Number(expiresAt) < Date.now()) return null;
    return { patientId: Number(patientId), reportId: Number(reportId) };
  } catch {
    return null;
  }
}

/* In-memory throttle for failed verification attempts, keyed by IP.
   Prevents brute-forcing phone+DOB pairs. Resets after the throttle window. */
const failedAttempts = new Map<string, { count: number; firstAt: number }>();

export function isThrottled(key: string): boolean {
  const entry = failedAttempts.get(key);
  if (!entry) return false;
  if (Date.now() - entry.firstAt > THROTTLE_MS) {
    failedAttempts.delete(key);
    return false;
  }
  return entry.count >= MAX_FAILED_ATTEMPTS;
}

export function recordFailedAttempt(key: string) {
  const entry = failedAttempts.get(key);
  if (!entry || Date.now() - entry.firstAt > THROTTLE_MS) {
    failedAttempts.set(key, { count: 1, firstAt: Date.now() });
  } else {
    entry.count += 1;
  }
}

export function clearFailedAttempts(key: string) {
  failedAttempts.delete(key);
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}
