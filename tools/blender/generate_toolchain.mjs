import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { REPOSITORY_ROOT, readVersionManifest } from "../version-manifest.mjs";

const manifest = await readVersionManifest();
const outputPath = join(REPOSITORY_ROOT, "tools", "blender", "toolchain.json");
const toolchain = {
  schemaVersion: manifest.representation.apparatusBlenderToolchain,
  sourceManifest: "contracts/version-manifest.json#toolchains.blender",
  blender: manifest.toolchains.blender,
  render: {
    engine: "CYCLES",
    devicePolicy: "selected-and-recorded",
    preferredDevice: "OPTIX",
    fallbackDevice: "CPU",
    cycles: {
      samples: 32,
      useDenoise: true,
      transparentFilm: false,
    },
    colorManagement: {
      viewTransform: "AgX",
      look: "None",
      exposure: 0,
      gamma: 1,
    },
    resolution: {
      front: [1440, 900],
      thumbnail: [256, 256],
      closeup: [900, 900],
      alpha: [1440, 900],
    },
    outputFormat: "PNG",
    outputColor: "RGBA",
  },
};
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(toolchain, null, 2)}\n`, "utf8");
console.log(`generated ${outputPath}`);
