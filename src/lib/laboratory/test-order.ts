import { db } from "@/prisma/db";
import { LABORATORY_TESTS } from "./registry";
import type { LaboratoryTest } from "./types";

export const ORDER_STATUSES = [
  "PENDING",
  "SAMPLE_COLLECTED",
  "IN_PROGRESS",
  "COMPLETED",
  "REPORT_GENERATED",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  SAMPLE_COLLECTED: "Sample Collected",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  REPORT_GENERATED: "Report Generated",
};

export const TEST_STATUSES = ["PENDING", "IN_PROGRESS", "COMPLETED"] as const;
export type TestStatus = (typeof TEST_STATUSES)[number];

// Registry tests plus the lab's saved custom tests, keyed by code.
export async function resolveLabTests(
  labId: number
): Promise<Map<string, LaboratoryTest>> {
  const tests = new Map<string, LaboratoryTest>();
  for (const test of LABORATORY_TESTS) tests.set(test.code, test);

  const customTests = await db.orm.public.CustomTest.where({ labId }).all();
  for (const saved of customTests) {
    try {
      const definition = JSON.parse(saved.definition) as Omit<
        LaboratoryTest,
        "code" | "sortOrder"
      >;
      tests.set(saved.code, {
        ...definition,
        code: saved.code,
        sortOrder: 1000,
      });
    } catch {
      // Skip malformed custom test definitions.
    }
  }
  return tests;
}

export function calculateAge(dateOfBirth: string) {
  const birthDate = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDifference = today.getMonth() - birthDate.getMonth();
  if (
    monthDifference < 0 ||
    (monthDifference === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }
  return age;
}

// An order test is only complete when every required parameter has a value.
export function isTestComplete(
  test: LaboratoryTest,
  results: Record<string, string>
) {
  return test.parameters
    .filter((parameter) => parameter.required !== false)
    .every((parameter) => {
      const value = results[parameter.code];
      return value !== undefined && String(value).trim() !== "";
    });
}
