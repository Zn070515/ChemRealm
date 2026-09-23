import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const bodyPath = resolve(repositoryRoot, "assets/apparatus/masters/beaker-250ml/source/visual-body/body.png");
const geometryPath = resolve(repositoryRoot, "assets/apparatus/masters/beaker-250ml/source/visual-body/runtime/liquid-visual-geometry.svg");
const outputDir = resolve(repositoryRoot, "assets/apparatus/masters/beaker-250ml/qa/visual-body");
const outputPath = resolve(outputDir, "liquid-geometry-spike-light-dark.png");
const reportPath = resolve(outputDir, "liquid-geometry-spike.json");

await mkdir(outputDir, { recursive: true });
const body = (await readFile(bodyPath)).toString("base64");
const geometrySvg = await readFile(geometryPath, "utf8");
const cavityPath = geometrySvg.match(/<clipPath id="authored-cavity-outline"><path d="([^"]+)"/u)?.[1];
if (!cavityPath) throw new Error("liquid visual geometry must contain the authored cavity outline");

const volumes = [25, 100, 200];
const groups = new Map(volumes.map((volume) => [
  volume,
  geometrySvg.match(new RegExp(`<g data-visual-volume-ml="${volume}"[\\s\\S]*?<\\/g>`))?.[0],
]));
if ([...groups.values()].some((group) => group === undefined)) throw new Error("liquid visual geometry is missing a requested fixture");

const panelMarkup = (background) => volumes.map((volume) => `
  <figure class="panel ${background}">
    <figcaption><strong>${volume} mL visual geometry</strong><span>upright prototype · not scientific h(V)</span></figcaption>
    <div class="stage">
      <img class="body" src="data:image/png;base64,${body}" alt="" />
      <svg class="geometry" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1145 1374" aria-hidden="true">
        <defs><clipPath id="cavity-${background}-${volume}"><path d="${cavityPath}"/></clipPath></defs>
        <g clip-path="url(#cavity-${background}-${volume})">${groups.get(volume)}</g>
      </svg>
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
  .stage img, .geometry { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; }
  .body { z-index: 1; }
  .geometry { z-index: 2; }
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
  volumes,
  heightSource: "prototype-visual-fixture-not-scientific-profile",
  colourSource: "visual-fixture-only; not Observable optical output",
  productionAdmission: "not-admitted",
  output: outputPath,
};
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ status: "PASS", output: outputPath, report: reportPath }, null, 2));
