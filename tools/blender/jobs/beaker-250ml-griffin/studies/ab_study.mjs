import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { chromium } from "@playwright/test";

const root = resolve(process.cwd());
const manifestPath = resolve(process.argv[process.argv.indexOf("--manifest") + 1]);
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const outputDir = join(root, manifest.outputRoot, manifest.studyId, "ab");
const candidateRoot = join(root, manifest.outputRoot, manifest.studyId, "form", "F03", "renders");
const svg = await readFile(join(root, "assets/apparatus/masters/beaker-250ml/master.svg"));
const svgData = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
const views = ["front-light", "front-dark", "thumbnail-light", "thumbnail-dark"];
await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1680, height: 980 }, deviceScaleFactor: 1 });
const outputs = [];
for (const view of views) {
  const candidate = await readFile(join(candidateRoot, `${view}.png`));
  const candidateData = `data:image/png;base64,${candidate.toString("base64")}`;
  const background = view.endsWith("dark") ? "#101820" : "#dfe3e3";
  await page.setContent(`<!doctype html><style>
    * { box-sizing: border-box; } body { margin: 0; background: ${background}; color: #f4f7f7; font: 600 24px system-ui, sans-serif; }
    main { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; padding: 28px; }
    figure { margin: 0; padding: 18px; border: 1px solid rgba(255,255,255,.24); background: rgba(0,0,0,.12); }
    figcaption { min-height: 52px; margin-bottom: 14px; } img { display: block; width: 100%; height: 620px; object-fit: contain; background: ${background}; }
  </style><main>
    <figure><figcaption>Rejected SVG · ${view}</figcaption><img alt="rejected SVG" src="${svgData}"></figure>
    <figure><figcaption>Blender Form F03 · ${view}<br>study-only</figcaption><img alt="Blender study" src="${candidateData}"></figure>
  </main>`);
  const path = join(outputDir, `ab-${view}.png`);
  await page.screenshot({ path, fullPage: true });
  outputs.push({ view, path: path.replaceAll("\\", "/").replace(`${root.replaceAll("\\", "/")}/`, ""), background });
}
await browser.close();
const report = {
  schemaVersion: 1,
  studyId: manifest.studyId,
  rejectedSvg: "assets/apparatus/masters/beaker-250ml/master.svg",
  candidate: "form/F03",
  outputs,
  status: "study-only",
  note: "A/B evidence is for owner visual review; it is not automatic Gold Master acceptance.",
};
await writeFile(join(outputDir, "ab-report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
