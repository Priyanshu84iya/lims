import { db } from "@/prisma/db";
import { forbidden, getAuth, unauthorized } from "@/lib/auth";

export async function GET(
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

    const invoice = await db.orm.public.Invoice.where({ id: invoiceId, labId: auth.labId }).first();
    if (!invoice) {
      return Response.json({ success: false, error: "Invoice not found." }, { status: 404 });
    }

    const [patient, order, items, payments] = await Promise.all([
      db.orm.public.Patient.where({ id: invoice.patientId }).first(),
      db.orm.public.TestOrder.where({ id: invoice.testOrderId }).first(),
      db.orm.public.InvoiceItem.where({ invoiceId: invoice.id }).orderBy((item) => item.id.asc()).all(),
      db.orm.public.InvoicePayment.where({ invoiceId: invoice.id }).orderBy((payment) => payment.id.asc()).all(),
    ]);

    return Response.json({
      success: true,
      invoice,
      patient,
      order,
      items,
      payments,
    });
  } catch (error) {
    console.error("LOAD INVOICE ERROR:", error);
    return Response.json({ success: false, error: "Failed to load invoice." }, { status: 500 });
  }
}
