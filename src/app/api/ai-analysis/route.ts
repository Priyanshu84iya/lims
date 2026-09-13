import { NextResponse } from "next/server";
import { db } from "@/prisma/db";
import { forbidden, getAuth, unauthorized } from "@/lib/auth";

const SYSTEM_PROMPT = `You are a clinical decision-support assistant embedded in a laboratory information system. Analyze ONLY the laboratory report data provided. Never invent laboratory values, symptoms, or diagnoses the data does not support.

Respond with ONLY a JSON object (no markdown, no code fences) with exactly this shape:

{
  "sections": {
    "abnormalFindings": [ { "parameter": "...", "value": "...", "unit": "...", "reference": "...", "status": "LOW|HIGH|ABNORMAL", "note": "short patient-friendly explanation" } ],
    "normalFindings": [ { "parameter": "...", "value": "...", "unit": "...", "reference": "...", "status": "NORMAL" } ],
    "possibleConcerns": ["..."],
    "recommendedNextSteps": ["..."],
    "whenToConsultDoctor": ["..."]
  }
}

Rules:
- abnormalFindings: every parameter whose status is LOW, HIGH or ABNORMAL. Copy value, unit and reference exactly from the data.
- normalFindings: parameters within reference intervals (a summarized list is fine).
- possibleConcerns: possible symptoms or health concerns related ONLY to the abnormal findings.
- recommendedNextSteps: practical, patient-friendly next steps (e.g. follow-up tests, lifestyle advice).
- whenToConsultDoctor: clear situations when the patient should see a doctor.
- If all results are normal, abnormalFindings is an empty array and mention this in possibleConcerns.
- Plain text only inside strings: no markdown symbols (** # ## - _), no bullet characters.
- This is AI-assisted health information, not a medical diagnosis.`;

export async function POST(request: Request) {
  const auth = await getAuth(request);
  if (!auth) return unauthorized();
  if (auth.role !== "LAB") return forbidden();

  try {
    const apiKey = process.env["ASHNA_API_KEY"];
    if (!apiKey) {
      return NextResponse.json({ success: false, error: "AI analysis is not configured on this server." }, { status: 503 });
    }

    const { reportId } = await request.json();
    if (!reportId) {
      return NextResponse.json({ success: false, error: "reportId is required." }, { status: 400 });
    }

    const report = await db.orm.public.Report.where({ id: Number(reportId), labId: auth.labId }).first();
    if (!report) {
      return NextResponse.json({ success: false, error: "Report not found." }, { status: 404 });
    }
    const patient = await db.orm.public.Patient.where({ id: report.patientId }).first();
    const tests = await db.orm.public.ReportTest.where({ reportId: report.id }).all();
    const results = await Promise.all(
      tests.map((test) => db.orm.public.ReportResult.where({ reportTestId: test.id }).all())
    );

    const age = patient?.dateOfBirth ? Math.floor((Date.now() - new Date(patient.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : "unknown";

    const summary = tests.map((test, index) => ({
      test: test.testName,
      category: test.category,
      results: results[index].map((result) => ({
        parameter: result.parameterName,
        result: result.result,
        unit: result.unit,
        reference: result.referenceDisplay || (result.referenceMin && result.referenceMax ? `${result.referenceMin}-${result.referenceMax}` : null),
        status: result.status,
      })),
    }));

    const response = await fetch("https://api.ashna.ai/v1/api/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "ashna-x1",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Patient age: ${age}, gender: ${patient?.gender || "unknown"}.\nLaboratory report:\n${JSON.stringify(summary, null, 2)}` },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ success: false, error: "The AI service could not process this report right now." }, { status: 502 });
    }

    const data = await response.json();
    const analysis = data?.choices?.[0]?.message?.content;
    if (!analysis) {
      return NextResponse.json({ success: false, error: "The AI service returned an empty analysis." }, { status: 502 });
    }

    return NextResponse.json({ success: true, analysis });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to generate AI health analysis." }, { status: 500 });
  }
}
