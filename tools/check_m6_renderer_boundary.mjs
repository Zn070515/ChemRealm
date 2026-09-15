#!/usr/bin/env node
/**
 * Verify the M6 renderer is a one-way RenderState adapter.
 *
 * Dependency-cruiser proves the package graph. This focused lexical check
 * keeps the M6 implementation honest at the module boundary as well: Pixi
 * may consume renderer-neutral data, but it must not import either the
 * Scientific Reality Core or World Runtime.
 */

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rendererRoot = path.join(root, "packages", "render", "src", "pixi");
const files = (await readdir(rendererRoot)).filter((file) => file.endsWith(".ts"));
const sources = await Promise.all(files.map(async (file) => ({
  file,
  source: await readFile(path.join(rendererRoot, file), "utf8"),
})));

const failures = [];
for (const { file, source } of sources) {
  if (/@chemrealm\/(?:sci|world)|from ["'][^"']*\/(?:sci|world)\//.test(source)) {
    failures.push(`${file}: M6 Pixi adapter may not import Sci or World`);
  }
}
const rendererSource = sources.find(({ file }) => file === "renderer.ts")?.source ?? "";
if (!rendererSource.includes("RenderState")) {
  failures.push("renderer.ts: adapter must consume RenderState");
}
if (!rendererSource.includes("Application") || !rendererSource.includes("app.init")) {
  failures.push("renderer.ts: Pixi Application must be initialized through the async v8 API");
}

if (failures.length > 0) {
  for (const failure of failures) console.error(`FAIL  ${failure}`);
  process.exit(1);
}

console.log("ok    M6 Pixi adapter imports renderer-neutral data only and uses async Pixi v8 initialization");
