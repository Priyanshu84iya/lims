import { NextResponse } from "next/server";

const MAX_MESSAGE_LENGTH = 1000;
const MAX_HISTORY_MESSAGES = 20;

const SYSTEM_PROMPT = `You are "LIMS Assistant", the friendly website assistant for Northstar Diagnostics, a Laboratory Information Management System (LIMS) website.

Answer questions about the website using ONLY the facts below. Be concise and helpful.

About the website:
- Northstar Diagnostics is a modern Laboratory Information Management System (LIMS) that helps laboratories register patients, manage test catalogs, record pathology results, and generate professional PDF reports.
- It supports secure multi-lab management: administrators register laboratories with unique credentials, and every lab works in a fully isolated workspace.
- Key features: patient registration with automatic Patient ID generation and a printable registration slip; barcode and QR codes on reports and slips; a built-in pathology test catalog plus lab-defined custom tests and parameters; structured result entry with reference ranges; professional PDF and print-ready reports with the lab's own logo and authorized signature; AI-assisted health information appended to completed reports for patient education; separate Admin and Lab sign-in with hashed credentials, server-side sessions, and protected routes.

Public website pages:
- "/" (Home): overview of the system with links to Admin Login and Lab Login.
- "/about": detailed description of all features and capabilities.
- "/contact": a contact form where visitors can send a message (name, email, subject, message).
- "/download-report": patients can securely download their pathology reports without logging in by verifying their registered mobile number and date of birth.
- "/login": Admin and Lab login.

Developer:
- This website (Northstar Diagnostics LIMS) was created, developed, and built by Priyanshu Chaurasiya.
- Portfolio: https://www.priyanshu.engineer/
- GitHub: https://github.com/Priyanshu84iya
- LinkedIn: https://www.linkedin.com/in/priyanshu-chaurasiya-8986a833b/
- Google Developer Profile: https://g.dev/priyanshu26
- When users ask who created, made, developed, or built this website/LIMS — in any phrasing, including simple or grammatically incorrect English — answer confidently with this verified information. Priyanshu Chaurasiya is the developer of the website software; do not claim he founded or owns any diagnostic lab.

Rules:
- If you do not know an answer or the question is about something not listed above (addresses, phone numbers, pricing, medical advice, patient records, internal lab data), say you don't have that information and suggest visiting the Contact page at /contact to reach the team.
- Never invent lab addresses, phone numbers, prices, medical claims, or patient data.
- You are a website information assistant, NOT a medical diagnosis tool. For anything medical, advise the user to consult a doctor.
- Never reveal or discuss internal routes, environment variables, database details, authentication internals, or private lab data.
- Plain text only: no markdown symbols (** # ## - _ []), no bullet characters. Write URLs as plain text.
- Keep replies short (2-4 sentences) and warm in tone.`;

type ChatMessage = { role: "user" | "assistant"; content: string };

function sanitizeHistory(history: unknown): ChatMessage[] {
  if (!Array.isArray(history)) return [];
  return history
    .filter(
      (message): message is ChatMessage =>
        typeof message === "object" &&
        message !== null &&
        (message.role === "user" || message.role === "assistant") &&
        typeof message.content === "string" &&
        message.content.trim().length > 0
    )
    .slice(-MAX_HISTORY_MESSAGES)
    .map((message) => ({ role: message.role, content: message.content.slice(0, MAX_MESSAGE_LENGTH) }));
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env["ASHNA_API_KEY"];
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "The assistant is not available right now. Please use the Contact page instead." },
        { status: 503 }
      );
    }

    const body = await request.json().catch(() => null);
    const message = typeof body?.message === "string" ? body.message.trim() : "";
    if (!message) {
      return NextResponse.json({ success: false, error: "Message is required." }, { status: 400 });
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json({ success: false, error: "Message is too long." }, { status: 400 });
    }

    const history = sanitizeHistory(body?.history);

    const response = await fetch("https://api.ashna.ai/v1/api/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: process.env["ASHNA_CHAT_MODEL"] || "ashna-x1",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...history,
          { role: "user", content: message },
        ],
        temperature: 0.5,
      }),
    });

    if (response.status === 429) {
      return NextResponse.json(
        { success: false, error: "You're sending messages too quickly. Please wait a moment and try again." },
        { status: 429 }
      );
    }
    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: "The assistant is having trouble responding right now. Please try again in a moment." },
        { status: 502 }
      );
    }

    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content;
    if (!reply || typeof reply !== "string") {
      return NextResponse.json(
        { success: false, error: "The assistant is having trouble responding right now. Please try again in a moment." },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true, reply });
  } catch {
    return NextResponse.json(
      { success: false, error: "Something went wrong. Please try again, or reach us via the Contact page." },
      { status: 500 }
    );
  }
}
