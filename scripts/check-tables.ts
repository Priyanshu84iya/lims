import { db } from '../src/prisma/db';

async function check(model: string, fn: () => PromiseLike<unknown[]>) {
  try {
    const rows = await fn();
    console.log(`${model}: EXISTS (${rows.length} rows)`);
  } catch (e: any) {
    console.log(`${model}: MISSING/ERROR (${e.message?.split('\n')[0] ?? e})`);
  }
}

await check('TestOrder', () => db.orm.public.TestOrder.where({}).all());
await check('TestOrderTest', () => db.orm.public.TestOrderTest.where({}).all());
await check('TestOrderResult', () => db.orm.public.TestOrderResult.where({}).all());
await check('Invoice', () => db.orm.public.Invoice.where({}).all());
await check('LabTestPrice', () => db.orm.public.LabTestPrice.where({}).all());
process.exit(0);
