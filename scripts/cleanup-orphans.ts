import { db } from "../src/prisma/db";

async function main() {
  const orphanPatients = await db.orm.public.Patient.where({ labId: null }).all();
  console.log("orphan patients:", orphanPatients.map((p) => ({ id: p.id, code: p.patientCode })));
  const orphanReports = await db.orm.public.Report.where({ labId: null }).all();
  console.log("orphan reports:", orphanReports.map((r) => ({ id: r.id, patientId: r.patientId })));

  for (const report of orphanReports) {
    const tests = await db.orm.public.ReportTest.where({ reportId: report.id }).all();
    for (const test of tests) {
      const results = await db.orm.public.ReportResult.where({ reportTestId: test.id }).all();
      for (const result of results) {
        await db.orm.public.ReportResult.where({ id: result.id }).delete();
      }
      await db.orm.public.ReportTest.where({ id: test.id }).delete();
    }
    await db.orm.public.Report.where({ id: report.id }).delete();
  }
  for (const patient of orphanPatients) {
    await db.orm.public.Patient.where({ id: patient.id }).delete();
  }

  console.log("deleted orphan patients:", orphanPatients.length, "orphan reports:", orphanReports.length);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
