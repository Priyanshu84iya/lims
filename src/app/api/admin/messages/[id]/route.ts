import { db } from "@/prisma/db";
import { forbidden, getAuth, unauthorized } from "@/lib/auth";

async function requireAdmin(request: Request) {
  const auth = await getAuth(request);
  if (!auth) return { error: unauthorized() };
  if (auth.role !== "ADMIN") return { error: forbidden() };
  return { auth };
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(request);
  if (guard.error) return guard.error;

  try {
    const { id } = await params;
    const messageId = Number(id);
    if (!Number.isInteger(messageId)) {
      return Response.json({ success: false, error: "Invalid message id." }, { status: 400 });
    }

    const body = await request.json();
    if (typeof body?.isRead !== "boolean") {
      return Response.json({ success: false, error: "isRead must be a boolean." }, { status: 400 });
    }

    const existing = await db.orm.public.ContactMessage.where({ id: messageId }).first();
    if (!existing) {
      return Response.json({ success: false, error: "Message not found." }, { status: 404 });
    }

    await db.orm.public.ContactMessage.where({ id: messageId }).update({ isRead: body.isRead });

    return Response.json({ success: true, isRead: body.isRead });
  } catch (error) {
    console.error("UPDATE MESSAGE ERROR:", error);
    return Response.json({ success: false, error: "Failed to update message." }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(request);
  if (guard.error) return guard.error;

  try {
    const { id } = await params;
    const messageId = Number(id);
    if (!Number.isInteger(messageId)) {
      return Response.json({ success: false, error: "Invalid message id." }, { status: 400 });
    }

    const existing = await db.orm.public.ContactMessage.where({ id: messageId }).first();
    if (!existing) {
      return Response.json({ success: false, error: "Message not found." }, { status: 404 });
    }

    await db.orm.public.ContactMessage.where({ id: messageId }).delete();

    return Response.json({ success: true });
  } catch (error) {
    console.error("DELETE MESSAGE ERROR:", error);
    return Response.json({ success: false, error: "Failed to delete message." }, { status: 500 });
  }
}
