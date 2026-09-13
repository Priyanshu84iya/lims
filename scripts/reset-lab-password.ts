import { hashPassword } from "../src/lib/auth";
import { db } from "../src/prisma/db";

async function main() {
  const email = process.argv[2];
  const password = process.argv[3];
  if (!email || !password) {
    console.error("Usage: npx tsx scripts/reset-lab-password.ts <email> <newPassword>");
    process.exit(1);
  }
  const lab = await db.orm.public.Lab.where({ loginEmail: email }).first();
  if (!lab) {
    console.error("Lab not found:", email);
    process.exit(1);
  }
  await db.orm.public.Lab.where({ id: lab.id }).update({ passwordHash: hashPassword(password) });
  console.log(`Password updated for lab ${lab.id} (${lab.name})`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
