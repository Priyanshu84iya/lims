import { randomBytes } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { forbidden, getAuth, unauthorized } from "@/lib/auth";

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

export async function POST(request: Request) {
  const auth = await getAuth(request);
  if (!auth) return unauthorized();
  if (auth.role !== "ADMIN") return forbidden();

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return Response.json({ success: false, error: "No image file provided." }, { status: 400 });
    }

    const extension = ALLOWED_TYPES[file.type];
    if (!extension) {
      return Response.json({ success: false, error: "Only JPG, JPEG, PNG, and WEBP images are allowed." }, { status: 400 });
    }
    if (file.size > MAX_SIZE_BYTES) {
      return Response.json({ success: false, error: "Image must be smaller than 5 MB." }, { status: 400 });
    }

    const filename = `lab-logo-${Date.now()}-${randomBytes(6).toString("hex")}${extension}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", "labs");
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, filename), Buffer.from(await file.arrayBuffer()));

    return Response.json({ success: true, url: `/uploads/labs/${filename}` });
  } catch (error) {
    console.error("LAB LOGO UPLOAD ERROR:", error);
    return Response.json({ success: false, error: "Failed to upload logo." }, { status: 500 });
  }
}
