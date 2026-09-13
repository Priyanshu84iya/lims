import type { ReportResult } from "@/app/components/report-data";

export type AiFinding = {
  parameter: string;
  value: string;
  unit: string;
  reference: string;
  status: string;
  note?: string;
};

export type AiAnalysis = {
  abnormalFindings: AiFinding[];
  normalFindings: AiFinding[];
  possibleConcerns: string[];
  recommendedNextSteps: string[];
  whenToConsultDoctor: string[];
};

const SECTION_ALIASES: Record<keyof AiAnalysis, string[]> = {
  abnormalFindings: ["abnormalfindings", "abnormal findings", "abnormal"],
  normalFindings: ["normalfindings", "normal findings", "normal"],
  possibleConcerns: ["possibleconcerns", "possible health concerns", "possible symptoms", "concerns", "symptoms"],
  recommendedNextSteps: ["recommendednextsteps", "recommended next steps", "next steps", "recommendations"],
  whenToConsultDoctor: ["whentoconsultdoctor", "when to consult a doctor", "when to consult doctor", "consultation"],
};

function matchSection(line: string): keyof AiAnalysis | undefined {
  const cleaned = line.replace(/[#*_`>-]/g, "").replace(/[:：]\s*$/, "").trim().toLowerCase();
  for (const [key, aliases] of Object.entries(SECTION_ALIASES) as [keyof AiAnalysis, string[]][]) {
    if (aliases.includes(cleaned)) return key;
  }
  return undefined;
}

function stripMarkdown(text: string) {
  return text
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/[*_`]/g, "")
    .trim();
}

function parseFinding(raw: string): AiFinding | undefined {
  const text = stripMarkdown(raw).replace(/^[-•]\s*/, "");
  if (!text) return undefined;
  // Expected shape: "Parameter: value unit (reference) — status" but tolerate variations.
  const statusMatch = text.match(/\b(LOW|HIGH|NORMAL|ABNORMAL|PENDING|CRITICAL)\b/i);
  const status = statusMatch ? statusMatch[1].toUpperCase() : "";
  let body = text.replace(new RegExp(`[-–—:]*\\s*${statusMatch ? statusMatch[0] : ""}\\s*$`), "").trim();
  const [namePart, ...rest] = body.split(/[:：]/);
  const parameter = namePart.trim();
  const detail = rest.join(":").trim();
  if (!parameter) return undefined;
  return {
    parameter,
    value: detail,
    unit: "",
    reference: "",
    status,
    note: detail || undefined,
  };
}

/** Parses the AI response into structured sections. Accepts JSON or plain/markdown text. */
export function parseAiAnalysis(raw: string): AiAnalysis {
  const empty: AiAnalysis = {
    abnormalFindings: [],
    normalFindings: [],
    possibleConcerns: [],
    recommendedNextSteps: [],
    whenToConsultDoctor: [],
  };
  if (!raw) return empty;

  // Try JSON first (the API requests structured JSON from the model).
  try {
    const jsonStart = raw.indexOf("{");
    const jsonEnd = raw.lastIndexOf("}");
    if (jsonStart !== -1 && jsonEnd > jsonStart) {
      const parsed = JSON.parse(raw.slice(jsonStart, jsonEnd + 1));
      const sections = parsed.sections ?? parsed;
      const asFindings = (value: unknown): AiFinding[] =>
        Array.isArray(value)
          ? value
              .map((item) => {
                if (typeof item === "string") return parseFinding(item);
                const obj = item as Record<string, unknown>;
                const parameter = String(obj.parameter ?? obj.name ?? "").trim();
                if (!parameter) return undefined;
                return {
                  parameter,
                  value: String(obj.value ?? obj.result ?? ""),
                  unit: String(obj.unit ?? ""),
                  reference: String(obj.reference ?? obj.range ?? ""),
                  status: String(obj.status ?? "").toUpperCase(),
                  note: obj.note ? String(obj.note) : undefined,
                } satisfies AiFinding;
              })
              .filter((item): item is AiFinding => Boolean(item))
          : [];
      const asLines = (value: unknown): string[] =>
        Array.isArray(value)
          ? value.map((item) => stripMarkdown(String(item))).filter(Boolean)
          : typeof value === "string"
            ? value.split(/\n+/).map((line) => stripMarkdown(line.replace(/^[-•]\s*/, ""))).filter(Boolean)
            : [];
      return {
        abnormalFindings: asFindings(sections.abnormalFindings ?? sections["Abnormal Findings"]),
        normalFindings: asFindings(sections.normalFindings ?? sections["Normal Findings"]),
        possibleConcerns: asLines(sections.possibleConcerns ?? sections["Possible Health Concerns"] ?? sections.possibleSymptoms),
        recommendedNextSteps: asLines(sections.recommendedNextSteps ?? sections["Recommended Next Steps"]),
        whenToConsultDoctor: asLines(sections.whenToConsultDoctor ?? sections["When to Consult a Doctor"]),
      };
    }
  } catch {
    // fall through to text parsing
  }

  // Plain-text / markdown fallback: split by section headings.
  const result: AiAnalysis = { ...empty, abnormalFindings: [], normalFindings: [] };
  let current: keyof AiAnalysis | undefined;
  for (const line of raw.split(/\r?\n/)) {
    const section = matchSection(line);
    if (section) {
      current = section;
      continue;
    }
    const cleaned = stripMarkdown(line).replace(/^[-•]\s*/, "").trim();
    if (!cleaned || !current) continue;
    if (current === "abnormalFindings" || current === "normalFindings") {
      const finding = parseFinding(cleaned);
      if (finding) result[current].push(finding);
    } else {
      result[current].push(cleaned);
    }
  }
  return result;
}

/**
 * Critical threshold: result deviates from the reference interval by more than
 * 25% of the interval width (or the AI explicitly flags it as critical).
 */
export function isCriticalResult(result: ReportResult): boolean {
  if (result.status !== "LOW" && result.status !== "HIGH") return false;
  const value = Number(result.result);
  const min = Number(result.referenceMin);
  const max = Number(result.referenceMax);
  if (Number.isNaN(value) || Number.isNaN(min) || Number.isNaN(max) || max <= min) return false;
  const width = max - min;
  return value < min - width * 0.25 || value > max + width * 0.25;
}

export function statusLabel(result: ReportResult): string {
  if (result.status) return result.status;
  return result.result ? "NORMAL" : "PENDING";
}
