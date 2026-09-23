import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const bodyPath = resolve(repositoryRoot, "assets/apparatus/masters/beaker-250ml/source/visual-body/body.png");
const maskPath = resolve(repositoryRoot, "assets/apparatus/masters/beaker-250ml/source/visual-body/runtime/liquid-mask.svg");
const outputDir = resolve(repositoryRoot, "assets/apparatus/masters/beaker-250ml/qa/visual-body");
const outputPath = resolve(outputDir, "glass-layer-decomposition-spike-light-dark.png");
const reportPath = resolve(outputDir, "glass-layer-decomposition-spike.json");

await mkdir(outputDir, { recursive: true });
const body = (await readFile(bodyPath)).toString("base64");
const maskSvg = await readFile(maskPath, "utf8");
const maskPathMatch = maskSvg.match(/<path d="([^"]+)"/);
if (!maskPathMatch) throw new Error("liquid mask must contain a serializable path");
const cavityPath = maskPathMatch[1];
const liquidTopY = 700;
const liquidBottomY = 1250;
const liquidSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1145 1374" aria-hidden="true">
  <defs>
    <clipPath id="liquid-cavity"><path d="${cavityPath}"/></clipPath>
    <linearGradient id="blue-liquid" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#1769aa" stop-opacity="0.92"/>
      <stop offset="1" stop-color="#062653" stop-opacity="0.98"/>
    </linearGradient>
  </defs>
  <rect x="0" y="${liquidTopY}" width="1145" height="${liquidBottomY - liquidTopY}" fill="url(#blue-liquid)" clip-path="url(#liquid-cavity)"/>
  <path d="M 250 ${liquidTopY} Q 572.5 ${liquidTopY - 14} 895 ${liquidTopY}" fill="none" stroke="#8bd4ff" stroke-width="8" opacity="0.9" clip-path="url(#liquid-cavity)"/>
</svg>`;
const liquid = Buffer.from(liquidSvg).toString("base64");

const panels = [
  { id: "A", title: "A · liquid behind body", className: "behind", note: "body opacity suppresses liquid" },
  { id: "B", title: "B · liquid above body", className: "above", note: "liquid suppresses glass response" },
  { id: "C", title: "C · single-body compromise", className: "compromise", note: "neither layer is authoritative" },
];

const panelMarkup = (background) => panels.map(({ title, className, note }) => `
  <figure class="panel ${background} ${className}">
    <figcaption><strong>${title}</strong><span>${note}</span></figcaption>
    <div class="stage">
      <img class="liquid" src="data:image/svg+xml;base64,${liquid}" alt="" />
      <img class="body" src="data:image/png;base64,${body}" alt="" />
    </div>
  </figure>`).join("\n");

const html = `<!doctype html>
<html><head><meta charset="utf-8"><style>
  * { box-sizing: border-box; }
  html, body { margin: 0; background: #202226; }
  body { width: 2520px; height: 1500px; padding: 36px; display: grid; grid-template-columns: repeat(3, 1fr); grid-template-rows: repeat(2, 1fr); gap: 24px; font: 500 20px system-ui, sans-serif; }
  .panel { margin: 0; position: relative; overflow: hidden; border-radius: 12px; }
  .light { background: #f2f1ed; color: #263135; }
  .dark { background: #20252b; color: #e7ecee; }
  figcaption { height: 62px; padding: 12px 16px 0; position: relative; z-index: 3; display: flex; flex-direction: column; gap: 4px; }
  figcaption span { font-size: 15px; opacity: 0.72; }
  .stage { position: absolute; left: 0; right: 0; bottom: 0; top: 62px; }
  .stage img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; }
  .behind .body { z-index: 2; }
  .behind .liquid { z-index: 1; }
  .above .body { z-index: 1; }
  .above .liquid { z-index: 2; }
  .compromise .body { z-index: 1; opacity: 0.52; }
  .compromise .liquid { z-index: 2; opacity: 0.72; mix-blend-mode: multiply; }
</style></head><body>
  ${panelMarkup("light")}
  ${panelMarkup("dark")}
</body></html>`;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 2520, height: 1500 }, deviceScaleFactor: 1 });
await page.setContent(html, { waitUntil: "load" });
await page.screenshot({ path: outputPath, type: "png" });
await browser.close();

const report = {
  status: "PROTOTYPE_EVIDENCE_ONLY",
  assetId: "beaker-250ml",
  liquidFixture: "deep-blue visual placeholder; not a scientific volume or chemistry state",
  variants: panels.map(({ id, title, note }) => ({ id, title, note })),
  conclusion: "The current single body is not yet a production glass-back/liquid/glass-front composition contract.",
  productionAdmission: "not-admitted",
};
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ status: "PASS", output: outputPath, report: reportPath }, null, 2));
