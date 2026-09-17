import { db } from "@/prisma/db";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_NAME = 100;
const MAX_EMAIL = 200;
const MAX_SUBJECT = 200;
const MAX_MESSAGE = 5000;

function clean(value: unknown, max: number) {
  return String(value ?? "").trim().slice(0, max);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = clean(body?.name, MAX_NAME);
    const email = clean(body?.email, MAX_EMAIL).toLowerCase();
    const subject = clean(body?.subject, MAX_SUBJECT);
    const message = clean(body?.message, MAX_MESSAGE);

    if (!name) {
      return Response.json({ success: false, error: "Name is required." }, { status: 400 });
    }
    if (!email || !EMAIL_PATTERN.test(email)) {
      return Response.json({ success: false, error: "A valid email address is required." }, { status: 400 });
    }
    if (!subject) {
      return Response.json({ success: false, error: "Subject is required." }, { status: 400 });
    }
    if (!message) {
      return Response.json({ success: false, error: "Message is required." }, { status: 400 });
    }

    await db.orm.public.ContactMessage.create({ name, email, subject, message, isRead: false });

    return Response.json({ success: true });
  } catch (error) {
    console.error("CONTACT SUBMIT ERROR:", error);
    return Response.json({ success: false, error: "Failed to send your message. Please try again." }, { status: 500 });
  }
}
