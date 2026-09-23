import { readFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const jobPath = resolve(process.argv[process.argv.indexOf("--job") + 1]);
const candidateDir = resolve(process.argv[process.argv.indexOf("--candidate-dir") + 1]);
const outputDir = resolve(process.argv[process.argv.indexOf("--output-dir") + 1]);
const job = JSON.parse(await readFile(jobPath, "utf8"));
const svg = await readFile(join(ROOT, job.rejectedSvg), "utf8");
const svgData = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
const names = ["front-light", "front-dark"];

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1680, height: 980 }, deviceScaleFactor: 1 });
const outputs = [];

for (const name of names) {
  const background = name.endsWith("dark") ? "#111820" : "#e1e4e4";
  const candidate = await readFile(join(candidateDir, `${name}.png`));
  const candidateData = `data:image/png;base64,${candidate.toString("base64")}`;
  await page.setContent(`<!doctype html>
    <style>
      * { box-sizing: border-box; }
      body { margin: 0; background: ${background}; color: #f4f7f7; font: 600 24px system-ui, sans-serif; }
      main { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; padding: 28px; }
      figure { margin: 0; padding: 18px; border: 1px solid rgba(255,255,255,.22); background: rgba(0,0,0,.12); }
      figcaption { margin-bottom: 14px; letter-spacing: .03em; }
      img { display: block; width: 100%; height: 620px; object-fit: contain; background: ${background}; }
    </style>
    <main>
      <figure><figcaption>Rejected SVG candidate</figcaption><img alt="rejected SVG" src="${svgData}"></figure>
      <figure><figcaption>Blender candidate / ${name}</figcaption><img alt="Blender candidate" src="${candidateData}"></figure>
    </main>`);
  const output = join(outputDir, `ab-${name}.png`);
  await page.screenshot({ path: output, fullPage: true });
  outputs.push({ name, path: output.replaceAll("\\", "/").replace(`${ROOT.replaceAll("\\", "/")}/`, ""), background });
}

await browser.close();
const report = {
  schemaVersion: 1,
  assetId: job.assetId,
  rejectedSvg: job.rejectedSvg,
  candidateDirectory: candidateDir.replaceAll("\\", "/").replace(`${ROOT.replaceAll("\\", "/")}/`, ""),
  outputs,
  note: "A/B evidence is for human visual review; it is not an automatic Gold Master acceptance decision.",
};
await writeFile(join(outputDir, "ab-report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
