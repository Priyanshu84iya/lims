import { db } from "@/prisma/db";
import { forbidden, getAuth, unauthorized } from "@/lib/auth";
import { PAYMENT_MODES, recordInvoicePayment } from "@/lib/invoice";
import { isValidPrice } from "@/lib/pricing";

// Records an additional payment against an invoice. The amount is validated
// against the outstanding balance server-side; totals are recomputed from
// the immutable payment ledger inside a DB transaction.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuth(request);
  if (!auth) return unauthorized();
  if (auth.role !== "LAB") return forbidden();

  try {
    const { id } = await params;
    const invoiceId = Number(id);
    if (!Number.isInteger(invoiceId)) {
      return Response.json({ success: false, error: "Invalid invoice id." }, { status: 400 });
    }

    const body = await request.json();
    const amount = String(body?.amount ?? "");
    const mode = String(body?.mode ?? "");
    const transactionId = body?.transactionId ? String(body.transactionId).trim() : null;

    if (!isValidPrice(amount) || amount === "0") {
      return Response.json(
        { success: false, error: "Enter a payment amount greater than zero (at most 2 decimals)." },
        { status: 400 }
      );
    }
    if (!PAYMENT_MODES.includes(mode as (typeof PAYMENT_MODES)[number])) {
      return Response.json(
        { success: false, error: `Payment mode must be one of: ${PAYMENT_MODES.join(", ")}.` },
        { status: 400 }
      );
    }

    const result = await recordInvoicePayment(
      auth.labId,
      invoiceId,
      amount,
      mode,
      transactionId,
      `LAB-${auth.labId}`
    );
    if (!result) {
      return Response.json(
        { success: false, error: "Payment exceeds the outstanding balance on this invoice." },
        { status: 400 }
      );
    }

    const payments = await db.orm.public.InvoicePayment
      .where({ invoiceId })
      .orderBy((payment) => payment.id.asc())
      .all();
    return Response.json({ success: true, invoice: result, payments });
  } catch (error) {
    if (error instanceof Error && error.message === "Invoice not found.") {
      return Response.json({ success: false, error: "Invoice not found." }, { status: 404 });
    }
    console.error("RECORD PAYMENT ERROR:", error);
    return Response.json({ success: false, error: "Failed to record payment." }, { status: 500 });
  }
}
