import { describe, expect, it } from "vitest";

import {
  GENERATED_VERSION_SOURCE_PATH,
  readVersionManifest,
  renderTypeScriptVersionSource,
  validateVersionManifest,
} from "../tools/version-manifest.mjs";
import { readFile } from "node:fs/promises";

describe("central version manifest", () => {
  it("is the exact source for the checked-in generated TypeScript module", async () => {
    const manifest = await readVersionManifest();
    const generated = await readFile(GENERATED_VERSION_SOURCE_PATH, "utf8");

    expect(generated).toBe(renderTypeScriptVersionSource(manifest));
  });

  it("keeps every release identity in a named namespace", async () => {
    const manifest = await readVersionManifest();

    expect(manifest.schema.world).toBeTypeOf("number");
    expect(manifest.spec.currentRevision).toBeTypeOf("number");
    expect(manifest.spec.acceptedThroughRevision).toBeLessThanOrEqual(
      manifest.spec.currentRevision,
    );
    expect(manifest.spec.m5ContractRevision).toBeLessThanOrEqual(
      manifest.spec.currentRevision,
    );
    expect(manifest.spec.acceptedThroughRevision).toBeLessThanOrEqual(
      manifest.spec.m5ContractRevision,
    );
    expect(manifest.scientific.acidBase.id).toBeTypeOf("string");
    expect(manifest.scientific.acidBase.legacyVersion).toBeTypeOf("string");
    expect(manifest.scientific.acidBase.nativeVersion).toBeTypeOf("string");
    expect(manifest.oracle.phreeqc).toBeTypeOf("string");
  });

  it("exports an immutable nested runtime snapshot", async () => {
    const { VERSION_MANIFEST } = await import(
      "../packages/schema/src/generated/versions.ts"
    );

    expect(Object.isFrozen(VERSION_MANIFEST)).toBe(true);
    expect(Object.isFrozen(VERSION_MANIFEST.schema)).toBe(true);
    expect(Object.isFrozen(VERSION_MANIFEST.scientific.acidBase)).toBe(true);
    expect(Object.isFrozen(VERSION_MANIFEST.oracle)).toBe(true);
  });

  it("rejects an incomplete manifest before generators can emit partial versions", async () => {
    const manifest = await readVersionManifest();
    const invalid = {
      ...manifest,
      schema: { ...manifest.schema, world: 0 },
    };

    expect(() => validateVersionManifest(invalid)).toThrow(/positive integer/);
  });
});
