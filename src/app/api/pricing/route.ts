import { db } from "@/prisma/db";
import { forbidden, getAuth, unauthorized } from "@/lib/auth";
import { LABORATORY_TESTS } from "@/lib/laboratory/registry";
import {
  SUGGESTED_PRICES,
  getSuggestedPrice,
  isValidPrice,
} from "@/lib/pricing";

export interface PricedTest {
  testCode: string;
  testName: string;
  category: string;
  custom: boolean;
  suggestedPrice: string | null;
  configuredPrice: string | null;
  effectivePrice: string | null;
  priceSource: "LAB" | "SUGGESTED" | "UNSET";
}

async function buildPricedTests(labId: number): Promise<PricedTest[]> {
  const priceRows = await db.orm.public.LabTestPrice.where({ labId }).all();
  const configured = new Map(priceRows.map((row) => [row.testCode, row.price]));
  const customTests = await db.orm.public.CustomTest.where({ labId }).all();

  const tests: PricedTest[] = [];
  for (const test of LABORATORY_TESTS) {
    const configuredPrice = configured.get(test.code) ?? null;
    const suggestedPrice = getSuggestedPrice(test.code);
    tests.push({
      testCode: test.code,
      testName: test.name,
      category: test.category,
      custom: false,
      suggestedPrice,
      configuredPrice,
      effectivePrice: configuredPrice ?? suggestedPrice,
      priceSource: configuredPrice !== null ? "LAB" : suggestedPrice !== null ? "SUGGESTED" : "UNSET",
    });
  }
  for (const saved of customTests) {
    let name = saved.code;
    let category = "Custom";
    try {
      const definition = JSON.parse(saved.definition) as { name?: string; category?: string };
      if (definition.name) name = definition.name;
      if (definition.category) category = definition.category;
    } catch {
      // Fall back to the code as the display name.
    }
    const configuredPrice = configured.get(saved.code) ?? null;
    tests.push({
      testCode: saved.code,
      testName: name,
      category,
      custom: true,
      suggestedPrice: null,
      configuredPrice,
      effectivePrice: configuredPrice,
      priceSource: configuredPrice !== null ? "LAB" : "UNSET",
    });
  }
  return tests;
}

export async function GET(request: Request) {
  const auth = await getAuth(request);
  if (!auth) return unauthorized();
  if (auth.role !== "LAB") return forbidden();

  try {
    const tests = await buildPricedTests(auth.labId);
    return Response.json({ success: true, tests });
  } catch (error) {
    console.error("LOAD PRICING ERROR:", error);
    return Response.json({ success: false, error: "Failed to load pricing." }, { status: 500 });
  }
}

// Bulk price updates. A null price removes the lab override (reverts to the
// suggested default). All values are validated server-side.
export async function PUT(request: Request) {
  const auth = await getAuth(request);
  if (!auth) return unauthorized();
  if (auth.role !== "LAB") return forbidden();

  try {
    const body = await request.json();
    const updates = Array.isArray(body?.updates) ? body.updates : [];
    if (updates.length === 0) {
      return Response.json({ success: false, error: "No price updates provided." }, { status: 400 });
    }

    const knownCodes = new Set<string>([
      ...LABORATORY_TESTS.map((test) => test.code),
      ...(await db.orm.public.CustomTest.where({ labId: auth.labId }).all()).map((row) => row.code),
    ]);

    const invalid: string[] = [];
    for (const update of updates) {
      const testCode = String(update?.testCode || "");
      const price = update?.price;
      if (!knownCodes.has(testCode) || (price !== null && !isValidPrice(price))) {
        invalid.push(testCode || "(missing code)");
      }
    }
    if (invalid.length > 0) {
      return Response.json(
        { success: false, error: `Invalid test code or price for: ${invalid.join(", ")}.` },
        { status: 400 }
      );
    }

    await db.transaction(async (tx) => {
      for (const update of updates) {
        const testCode = String(update.testCode);
        const price = update.price;
        if (price === null) {
          await tx.orm.public.LabTestPrice.where({ labId: auth.labId, testCode }).delete();
        } else {
          const existing = await tx.orm.public.LabTestPrice.where({ labId: auth.labId, testCode }).first();
          if (existing) {
            await tx.orm.public.LabTestPrice.where({ id: existing.id }).update({ price: price.trim() });
          } else {
            await tx.orm.public.LabTestPrice.create({ labId: auth.labId, testCode, price: price.trim() });
          }
        }
      }
    });

    const tests = await buildPricedTests(auth.labId);
    return Response.json({ success: true, tests });
  } catch (error) {
    console.error("UPDATE PRICING ERROR:", error);
    return Response.json({ success: false, error: "Failed to update pricing." }, { status: 500 });
  }
}

// "Set Default Prices": copies the system-defined suggested prices into the
// lab's own price rows. With overwrite=false only tests without a lab price
// are filled; with overwrite=true every registry test gets the suggested
// price. Custom tests are never touched (they have no suggested price).
export async function POST(request: Request) {
  const auth = await getAuth(request);
  if (!auth) return unauthorized();
  if (auth.role !== "LAB") return forbidden();

  try {
    const body = await request.json();
    const overwrite = body?.overwrite === true;

    const result = await db.transaction(async (tx) => {
      const existing = await tx.orm.public.LabTestPrice.where({ labId: auth.labId }).all();
      const configured = new Set(existing.map((row) => row.testCode));
      let applied = 0;
      let skipped = 0;
      for (const [testCode, price] of Object.entries(SUGGESTED_PRICES)) {
        if (!overwrite && configured.has(testCode)) {
          skipped++;
          continue;
        }
        if (configured.has(testCode)) {
          await tx.orm.public.LabTestPrice
            .where({ labId: auth.labId, testCode })
            .update({ price });
        } else {
          await tx.orm.public.LabTestPrice.create({ labId: auth.labId, testCode, price });
        }
        applied++;
      }
      return { applied, skipped };
    });

    const tests = await buildPricedTests(auth.labId);
    return Response.json({ success: true, tests, applied: result.applied, skipped: result.skipped });
  } catch (error) {
    console.error("SET DEFAULT PRICES ERROR:", error);
    return Response.json({ success: false, error: "Failed to set default prices." }, { status: 500 });
  }
}
