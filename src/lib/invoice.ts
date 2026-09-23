import { db } from "@/prisma/db";
import { effectivePrice, fromPaise, getLabTestPrices, toPaise } from "@/lib/pricing";
import { resolveLabTests } from "@/lib/laboratory/test-order";

export const PAYMENT_MODES = ["CASH", "UPI", "CARD", "ONLINE"] as const;
export type PaymentMode = (typeof PAYMENT_MODES)[number];

export const PAYMENT_STATUSES = ["UNPAID", "PARTIAL", "PAID"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const DEFAULT_TERMS =
  "1. Payment is due at the time of sample collection unless prior credit has been arranged.\n2. Please retain this invoice for any future reference or refunds.\n3. Report collection requires this invoice or a valid photo ID.";

// Sequential, lab-scoped invoice numbers: INV-<labId>-<padded sequence>.
// The unique constraint on invoiceNumber makes concurrent attempts safe —
// losers of the race retry with the next sequence.
async function nextInvoiceNumber(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  labId: number
): Promise<string> {
  const latest = await tx.orm.public.Invoice.where({ labId })
    .orderBy((invoice) => invoice.id.desc())
    .first();
  const lastSequence = latest ? Number(latest.invoiceNumber.split("-").pop()) : 0;
  return `INV-${labId}-${String(lastSequence + 1).padStart(5, "0")}`;
}

// Discount percentage: 0 to 100 with at most 2 decimals. Validated here so
// manipulated frontend values can never reach the persisted invoice.
export function isValidDiscountPercent(value: string): boolean {
  return /^\d+(\.\d{1,2})?$/.test(value) && Number(value) <= 100;
}

export interface CreateInvoiceInput {
  labId: number;
  patientId: number;
  testOrderId: number;
  testCodes: string[];
  discountPercent?: string;
  tax?: string;
  paymentMode?: string;
  amountPaid?: string;
  transactionId?: string;
  sampleType?: string;
  terms?: string;
  generatedBy: string;
}

export interface CreateInvoiceResult {
  invoiceId: number;
  invoiceNumber: string;
  missingPrices: string[];
}

export interface PreparedInvoice {
  items: { testCode: string; testName: string; quantity: number; unitPrice: string; amount: string }[];
  subtotalPaise: number;
  discountPercent: string;
  discountPaise: number;
  taxPaise: number;
  grandTotalPaise: number;
  paidPaise: number;
  paymentStatus: string;
  missingPrices: string[];
}

// Resolves effective prices and snapshots the line items. Called OUTSIDE the
// transaction so the DB round-trips stay short.
export async function prepareInvoice(
  labId: number,
  testCodes: string[],
  discountPercent?: string,
  tax?: string,
  amountPaid?: string
): Promise<PreparedInvoice> {
  const labTests = await resolveLabTests(labId);
  const labPrices = await getLabTestPrices(labId);

  const uniqueCodes = Array.from(new Set(testCodes));
  const missingPrices: string[] = [];
  const items: PreparedInvoice["items"] = [];
  let subtotalPaise = 0;
  for (const code of uniqueCodes) {
    const test = labTests.get(code);
    if (!test) continue;
    const price = effectivePrice(code, labPrices);
    if (price === null) {
      missingPrices.push(code);
      continue;
    }
    const unitPaise = toPaise(price);
    subtotalPaise += unitPaise;
    items.push({
      testCode: code,
      testName: test.name,
      quantity: 1,
      unitPrice: price,
      amount: fromPaise(unitPaise),
    });
  }
  if (items.length === 0) throw new Error("No billable tests with configured prices.");

  // Percentage → basis points keeps the math in integers: no float drift,
  // and the amount is derived server-side from the snapshotted subtotal.
  const percent = discountPercent ?? "0";
  if (!isValidDiscountPercent(percent)) {
    throw new Error("Discount percentage must be between 0 and 100.");
  }
  const percentBasisPoints = Math.round(Number(percent) * 100);
  const discountPaise = Math.round((subtotalPaise * percentBasisPoints) / 10000);
  const taxPaise = toPaise(tax ?? "0");
  const grandTotalPaise = subtotalPaise - discountPaise + taxPaise;
  const paidPaise = Math.min(toPaise(amountPaid ?? "0"), grandTotalPaise);
  const paymentStatus =
    paidPaise <= 0 ? "UNPAID" : paidPaise >= grandTotalPaise ? "PAID" : "PARTIAL";

  return {
    items,
    subtotalPaise,
    discountPercent: percent,
    discountPaise,
    taxPaise,
    grandTotalPaise,
    paidPaise,
    paymentStatus,
    missingPrices,
  };
}

// Creates the invoice rows INSIDE a caller-supplied transaction (so the order,
// its tests, and the invoice commit atomically). Returns null when an invoice
// already exists for the order (idempotent — refreshes and double-clicks
// never duplicate).
export async function createInvoiceInTx(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  input: CreateInvoiceInput,
  prepared: PreparedInvoice
): Promise<CreateInvoiceResult | null> {
  // Re-check inside the transaction so concurrent creators cannot both pass.
  const race = await tx.orm.public.Invoice.where({
    testOrderId: input.testOrderId,
  }).first();
  if (race) return null;

  let invoice: { id: number; invoiceNumber: string } | null = null;
  for (let attempt = 0; attempt < 3 && !invoice; attempt++) {
    const invoiceNumber = await nextInvoiceNumber(tx, input.labId);
    try {
      invoice = await tx.orm.public.Invoice.create({
        invoiceNumber,
        labId: input.labId,
        patientId: input.patientId,
        testOrderId: input.testOrderId,
        subtotal: fromPaise(prepared.subtotalPaise),
        discountPercent: prepared.discountPercent,
        discount: fromPaise(prepared.discountPaise),
        tax: fromPaise(prepared.taxPaise),
        grandTotal: fromPaise(prepared.grandTotalPaise),
        amountPaid: fromPaise(prepared.paidPaise),
        paymentMode: input.paymentMode || null,
        paymentStatus: prepared.paymentStatus,
        generatedBy: input.generatedBy,
        sampleType: input.sampleType || null,
        terms: input.terms || DEFAULT_TERMS,
        status: "ACTIVE",
      });
    } catch {
      // Unique collision on invoiceNumber — retry with the next sequence.
      invoice = null;
    }
  }
  if (!invoice) throw new Error("Could not allocate an invoice number.");

  for (const item of prepared.items) {
    await tx.orm.public.InvoiceItem.create({ ...item, invoiceId: invoice.id });
  }

  if (prepared.paidPaise > 0) {
    await tx.orm.public.InvoicePayment.create({
      invoiceId: invoice.id,
      amount: fromPaise(prepared.paidPaise),
      mode: input.paymentMode || "CASH",
      transactionId: input.transactionId || null,
      receivedBy: input.generatedBy,
    });
  }

  return { invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber, missingPrices: prepared.missingPrices };
}

// Standalone helper: creates the invoice for an existing order in its own
// transaction. Prices are snapshotted from the lab's effective prices at
// billing time.
export async function createInvoiceForOrder(
  input: CreateInvoiceInput
): Promise<CreateInvoiceResult | null> {
  const existing = await db.orm.public.Invoice.where({
    testOrderId: input.testOrderId,
  }).first();
  if (existing) return null;

  const prepared = await prepareInvoice(
    input.labId,
    input.testCodes,
    input.discountPercent,
    input.tax,
    input.amountPaid
  );

  return db.transaction((tx) => createInvoiceInTx(tx, input, prepared));
}

// Records an additional payment and updates the invoice totals, all inside
// one transaction. Returns null when the payment exceeds the balance due.
export async function recordInvoicePayment(
  labId: number,
  invoiceId: number,
  amount: string,
  mode: string,
  transactionId: string | null,
  receivedBy: string
): Promise<{ amountPaid: string; paymentStatus: string } | null> {
  return db.transaction(async (tx) => {
    const invoice = await tx.orm.public.Invoice.where({ id: invoiceId, labId }).first();
    if (!invoice) throw new Error("Invoice not found.");

    const balancePaise = toPaise(invoice.grandTotal) - toPaise(invoice.amountPaid);
    const paymentPaise = toPaise(amount);
    if (paymentPaise <= 0 || paymentPaise > balancePaise) return null;

    await tx.orm.public.InvoicePayment.create({
      invoiceId: invoice.id,
      amount: fromPaise(paymentPaise),
      mode,
      transactionId,
      receivedBy,
    });

    const newPaidPaise = toPaise(invoice.amountPaid) + paymentPaise;
    const grandTotalPaise = toPaise(invoice.grandTotal);
    const paymentStatus =
      newPaidPaise >= grandTotalPaise ? "PAID" : "PARTIAL";

    const updated = await tx.orm.public.Invoice
      .where({ id: invoice.id })
      .update({ amountPaid: fromPaise(newPaidPaise), paymentStatus });

    return {
      amountPaid: updated?.amountPaid ?? fromPaise(newPaidPaise),
      paymentStatus: updated?.paymentStatus ?? paymentStatus,
    };
  });
}
