import { db } from "@/prisma/db";
import { forbidden, getAuth, unauthorized } from "@/lib/auth";

export async function GET(request: Request) {
  const auth = await getAuth(request);
  if (!auth) return unauthorized();
  if (auth.role !== "ADMIN") return forbidden();

  try {
    const messages = await db.orm.public.ContactMessage.where({}).all();
    const sorted = [...messages].sort(
      (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    );
    return Response.json({
      success: true,
      messages: sorted.map((message) => ({
        id: message.id,
        name: message.name,
        email: message.email,
        subject: message.subject,
        message: message.message,
        isRead: message.isRead,
        createdAt: message.createdAt,
      })),
      unreadCount: sorted.filter((message) => !message.isRead).length,
    });
  } catch (error) {
    console.error("LOAD MESSAGES ERROR:", error);
    return Response.json({ success: false, error: "Failed to load messages." }, { status: 500 });
  }
}
