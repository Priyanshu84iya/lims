import { db } from "../src/prisma/db";
import { hashPassword } from "../src/lib/auth";

const email = (process.env.ADMIN_EMAIL || "admin@northstar.local").trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD || "Admin@12345";
const name = process.env.ADMIN_NAME || "Platform Admin";

async function main() {
  const existing = await db.orm.public.Admin.where({ email }).first();
  if (existing) {
    console.log(`Admin already exists: ${email}`);
    return;
  }
  await db.orm.public.Admin.create({
    email,
    name,
    passwordHash: hashPassword(password),
  });
  console.log(`Admin created: ${email}`);
  console.log(`Password: ${password} (change after first login)`);
}

main().catch((error) => {
  console.error("SEED ADMIN ERROR:", error);
  process.exit(1);
});
