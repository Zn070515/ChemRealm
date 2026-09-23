import { mkdir, readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const bodyPath = resolve(repositoryRoot, "assets/apparatus/masters/beaker-250ml/source/visual-body/body.png");
const graduationPath = resolve(repositoryRoot, "assets/apparatus/masters/beaker-250ml/source/visual-body/runtime/graduations.svg");
const outputDir = resolve(repositoryRoot, "assets/apparatus/masters/beaker-250ml/qa/visual-body");
const outputPath = resolve(outputDir, "body-with-runtime-graduations-light-dark.png");

await mkdir(outputDir, { recursive: true });
const body = (await readFile(bodyPath)).toString("base64");
const graduationSvg = await readFile(graduationPath, "utf8");
const graduation = Buffer.from(graduationSvg).toString("base64");

const html = `<!doctype html>
<html><head><meta charset="utf-8"><style>
  * { box-sizing: border-box; }
  html, body { margin: 0; background: #202226; }
  body { width: 2380px; height: 1500px; display: flex; gap: 30px; padding: 60px; font: 600 28px system-ui, sans-serif; }
  figure { margin: 0; width: 1145px; height: 1380px; padding-top: 42px; position: relative; border-radius: 12px; overflow: hidden; }
  figcaption { position: absolute; top: 0; left: 0; color: #e7ecee; }
  .light { background: #f2f1ed; }
  .light figcaption { color: #263135; }
  .dark { background: #20252b; }
  .asset { position: absolute; left: 0; top: 42px; width: 1145px; height: 1374px; }
  img { display: block; }
</style></head><body>
  <figure class="light"><figcaption>light-neutral · runtime graduation overlay</figcaption>
    <img class="asset" src="data:image/png;base64,${body}" alt="">
    <img class="asset" src="data:image/svg+xml;base64,${graduation}" alt="">
  </figure>
  <figure class="dark"><figcaption>dark-neutral · runtime graduation overlay</figcaption>
    <img class="asset" src="data:image/png;base64,${body}" alt="">
    <img class="asset" src="data:image/svg+xml;base64,${graduation}" alt="">
  </figure>
</body></html>`;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 2380, height: 1500 }, deviceScaleFactor: 1 });
await page.setContent(html, { waitUntil: "load" });
await page.screenshot({ path: outputPath, type: "png" });
await browser.close();
console.log(JSON.stringify({ status: "PASS", output: outputPath }, null, 2));
