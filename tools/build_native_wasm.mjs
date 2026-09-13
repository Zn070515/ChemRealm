import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { readVersionManifest } from "./version-manifest.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = join(ROOT, "native", "sci-core", "Cargo.toml");
const target = join(ROOT, "native", "sci-core", "target", "wasm32-unknown-unknown", "release", "chemrealm_sci_core.wasm");
const outputDirectory = join(ROOT, "packages", "sci", "dist", "wasm");
const output = join(outputDirectory, "chemrealm_sci_core.wasm");
const versionManifest = await readVersionManifest();

function run(command, args) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, { cwd: ROOT, stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) resolvePromise();
      else reject(new Error(`${command} exited with ${signal ?? code}`));
    });
  });
}

await run("cargo", [
  "build",
  "--manifest-path",
  manifest,
  "--target",
  "wasm32-unknown-unknown",
  "--release",
]);
await mkdir(outputDirectory, { recursive: true });
await copyFile(target, output);
const bytes = await readFile(output);
const sha256 = createHash("sha256").update(bytes).digest("hex");
await writeFile(
  join(outputDirectory, "chemrealm_sci_core.wasm.json"),
  `${JSON.stringify({
    artifact: "chemrealm_sci_core.wasm",
    modelId: versionManifest.scientific.acidBase.id,
    modelVersion: versionManifest.scientific.acidBase.nativeVersion,
    target: "wasm32-unknown-unknown",
    profile: "release",
    sha256: `sha256:${sha256}`,
  }, null, 2)}\n`,
  "utf8",
);
console.log(`native WASM built: sha256:${sha256}`);
