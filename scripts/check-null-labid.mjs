import { Client } from "pg";
const c = new Client({ connectionString: process.env.DATABASE_URL });
await c.connect();
const p = await c.query('SELECT count(*)::int AS n FROM "patient" WHERE "labId" IS NULL');
const r = await c.query('SELECT count(*)::int AS n FROM "report" WHERE "labId" IS NULL');
console.log("null patient.labId:", p.rows[0].n, "| null report.labId:", r.rows[0].n);
await c.end();
