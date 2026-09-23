import { db } from "@/prisma/db";

// System-defined suggested prices (INR) for the registry investigations.
// These are internal defaults the lab can adopt or override — they are NOT
// market prices. Custom tests have no suggested price and must be set by the
// lab before they can be billed.
export const SUGGESTED_PRICES: Record<string, string> = {
  CBC: "300",
  HB: "100",
  ESR: "120",
  PS: "400",
  RETIC: "250",
  FBS: "100",
  PPBS: "100",
  HBA1C: "500",
  LIPID: "600",
  LFT: "500",
  KFT: "500",
  LYTES: "350",
  CA: "150",
  URIC: "150",
  THYROID: "400",
  TSH: "200",
  FT3: "250",
  FT4: "250",
  CRP: "300",
  RA: "300",
  ASO: "300",
  DENGUE: "500",
  WIDAL: "400",
  URINE: "150",
  VITD: "1200",
  VITB12: "800",
  TESTO: "600",
};

export function getSuggestedPrice(testCode: string): string | null {
  const price = SUGGESTED_PRICES[testCode];
  return price ?? null;
}

// Parse a decimal string into integer paise so all money math is exact.
export function toPaise(value: string): number {
  const trimmed = String(value).trim();
  if (!/^-?\d+(\.\d+)?$/.test(trimmed)) return 0;
  const negative = trimmed.startsWith("-");
  const [whole, fraction = ""] = trimmed.replace("-", "").split(".");
  const paddedFraction = (fraction + "00").slice(0, 2);
  const paise = Number(whole) * 100 + Number(paddedFraction);
  return negative ? -paise : paise;
}

export function fromPaise(paise: number): string {
  const negative = paise < 0;
  const absolute = Math.abs(Math.round(paise));
  const whole = Math.floor(absolute / 100);
  const fraction = String(absolute % 100).padStart(2, "0");
  return `${negative ? "-" : ""}${whole}.${fraction}`;
}

// Validate a user-supplied price string: non-negative, at most 2 decimals.
export function isValidPrice(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return false;
  return toPaise(trimmed) <= 99_999_999;
}

// All lab-specific price rows, keyed by test code.
export async function getLabTestPrices(
  labId: number
): Promise<Map<string, string>> {
  const rows = await db.orm.public.LabTestPrice.where({ labId }).all();
  const prices = new Map<string, string>();
  for (const row of rows) prices.set(row.testCode, row.price);
  return prices;
}

// Effective price for a test: the lab's configured price, else the suggested
// default. Never silently ₹0 — a missing price surfaces as null so callers
// can reject or flag it.
export function effectivePrice(
  testCode: string,
  labPrices: Map<string, string>
): string | null {
  const configured = labPrices.get(testCode);
  if (configured !== undefined) return configured;
  return getSuggestedPrice(testCode);
}
