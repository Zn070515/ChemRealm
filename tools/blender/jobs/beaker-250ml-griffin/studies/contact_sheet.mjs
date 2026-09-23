import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { chromium } from "@playwright/test";

const root = resolve(process.cwd());
const manifestPath = resolve(process.argv[process.argv.indexOf("--manifest") + 1]);
const round = process.argv[process.argv.indexOf("--round") + 1];
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const roundRoot = join(root, manifest.outputRoot, manifest.studyId, round);
const candidates = manifest.rounds[round].candidateIds;
const views = ["front-light", "front-dark", "thumbnail-light", "thumbnail-dark"];
const output = join(roundRoot, "contact-sheet.png");
await mkdir(roundRoot, { recursive: true });

function imageData(path) {
  const data = requireBuffer(path);
  return `data:image/png;base64,${data.toString("base64")}`;
}

function requireBuffer(path) {
  return requireFs.readFileSync(path);
}

const requireFs = await import("node:fs");
const cells = [];
for (const candidateId of candidates) {
  const candidateRoot = join(roundRoot, candidateId);
  const metadata = JSON.parse(await readFile(join(candidateRoot, "render-metadata.json"), "utf8"));
  for (const view of views) {
    const imagePath = join(candidateRoot, "renders", `${view}.png`);
    cells.push({
      candidateId,
      view,
      variable: metadata.intentionalVariable,
      backend: metadata.backend.effective,
      image: imageData(imagePath),
    });
  }
}

const html = `<!doctype html>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; background: #20262b; color: #edf2f2; font: 600 18px system-ui, sans-serif; }
  main { display: grid; grid-template-columns: repeat(4, minmax(220px, 1fr)); gap: 14px; padding: 18px; }
  figure { margin: 0; padding: 10px; background: #30383f; border: 1px solid #64727b; }
  figcaption { min-height: 44px; margin-bottom: 8px; line-height: 1.25; }
  img { display: block; width: 100%; height: 260px; object-fit: contain; background: #dfe3e3; }
  .dark img { background: #101820; }
</style>
<main>${cells.map((cell) => `<figure class="${cell.view.endsWith("dark") ? "dark" : "light"}">
  <figcaption>${cell.candidateId} · ${cell.view}<br>${cell.variable} · ${cell.backend}</figcaption>
  <img alt="${cell.candidateId} ${cell.view}" src="${cell.image}">
</figure>`).join("")}</main>`;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1680, height: 1000 }, deviceScaleFactor: 1 });
await page.setContent(html);
await page.screenshot({ path: output, fullPage: true });
await browser.close();

const report = {
  schemaVersion: 1,
  studyId: manifest.studyId,
  round,
  candidateIds: candidates,
  views,
  output: output.replaceAll("\\", "/").replace(`${root.replaceAll("\\", "/")}/`, ""),
  status: "study-only",
};
await writeFile(join(roundRoot, "contact-sheet.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
