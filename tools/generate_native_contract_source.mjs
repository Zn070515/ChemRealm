import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
  GENERATED_NATIVE_CONTRACT_SOURCE_PATH,
  REPOSITORY_ROOT,
  nativeContractRelativePath,
  readVersionManifest,
  renderNativeContractSource,
} from "./version-manifest.mjs";

const manifest = await readVersionManifest();
const contract = JSON.parse(
  await readFile(join(REPOSITORY_ROOT, nativeContractRelativePath(manifest)), "utf8"),
);
await mkdir(dirname(GENERATED_NATIVE_CONTRACT_SOURCE_PATH), { recursive: true });
await writeFile(
  GENERATED_NATIVE_CONTRACT_SOURCE_PATH,
  renderNativeContractSource(contract),
  "utf8",
);
