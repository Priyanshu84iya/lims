import { getAuth, forbidden, unauthorized } from "@/lib/auth";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";

const MAX_SIZE_BYTES = 5 * 1024 * 1024;

export async function POST(request: Request) {
  const auth = await getAuth(request);
  if (!auth) return unauthorized();
  if (auth.role !== "ADMIN") return forbidden();

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return Response.json({ success: false, error: "No file provided." }, { status: 400 });
    }
    if (file.type !== "image/png") {
      return Response.json({ success: false, error: "Only PNG images are allowed for signature." }, { status: 400 });
    }
    if (file.size > MAX_SIZE_BYTES) {
      return Response.json({ success: false, error: "File size must be less than 5MB." }, { status: 400 });
    }

    const filename = `lab-signature-${Date.now()}-${randomBytes(6).toString("hex")}.png`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", "labs");
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, filename), Buffer.from(await file.arrayBuffer()));

    return Response.json({ success: true, url: `/uploads/labs/${filename}` });
  } catch {
    return Response.json({ success: false, error: "Failed to upload signature." }, { status: 500 });
  }
}
