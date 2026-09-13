import { db } from "../src/prisma/db";

async function main() {
  const labs = await db.orm.public.Lab.where({}).all();
  console.log("labs:", JSON.stringify(labs.map((l) => ({ id: l.id, name: l.name, loginEmail: l.loginEmail })), null, 2));
  const patients = await db.orm.public.Patient.where({}).all();
  console.log("patients:", patients.map((p) => ({ id: p.id, code: p.patientCode, labId: p.labId })));
  const reports = await db.orm.public.Report.where({}).all();
  console.log("reports:", reports.map((r) => ({ id: r.id, labId: r.labId, patientId: r.patientId })));
  const sessions = await db.orm.public.Session.where({}).all();
  console.log("sessions:", sessions.length);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
