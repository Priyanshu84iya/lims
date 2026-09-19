// Renders PWA PNG icons from public/icon.svg using the same Chromium used for PDF generation.
// Usage: node scripts/generate-pwa-icons.mjs
import { chromium } from "playwright-core";
import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const publicDir = path.join(root, "public");
const iconsDir = path.join(publicDir, "icons");

const SIZES = [
  { name: "icon-192.png", size: 192 },
  { name: "icon-512.png", size: 512 },
  { name: "maskable-192.png", size: 192 },
  { name: "maskable-512.png", size: 512 },
  { name: "apple-touch-icon.png", size: 180 },
];

async function main() {
  const svg = await readFile(path.join(publicDir, "icon.svg"), "utf8");
  await mkdir(iconsDir, { recursive: true });

  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined;
  const browser = await chromium.launch({
    executablePath,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });

  try {
    const page = await browser.newPage({ viewport: { width: 512, height: 512 } });
    for (const { name, size } of SIZES) {
      // Maskable icons need ~10% padding so the safe zone keeps the full mark.
      const padding = name.startsWith("maskable") ? 0.1 : 0;
      const inner = 512 * (1 - padding * 2);
      const html = `<!doctype html><html><body style="margin:0;background:transparent">
<svg width="${inner}" height="${inner}" viewBox="0 0 512 512" style="position:absolute;left:${512 * padding}px;top:${512 * padding}px">
${svg.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "")}
</svg></body></html>`;
      await page.setContent(html);
      const buffer = await page.screenshot({ clip: { x: 0, y: 0, width: 512, height: 512 } });
      // Screenshot is 512x512; scale down to target size via a second page render.
      const scalePage = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
      await scalePage.setContent(
        `<!doctype html><html><body style="margin:0;background:transparent"><img src="data:image/png;base64,${buffer.toString("base64")}" width="${size}" height="${size}"></body></html>`
      );
      const scaled = await scalePage.screenshot({ clip: { x: 0, y: 0, width: size, height: size } });
      await scalePage.close();
      await writeFile(path.join(iconsDir, name), scaled);
      console.log(`Created icons/${name} (${size}x${size})`);
    }
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error("Icon generation failed:", error.message);
  process.exit(1);
});
