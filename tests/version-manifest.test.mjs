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
    expect(manifest.scientific.indicatorMultiform.id).toBeTypeOf("string");
    expect(manifest.scientific.indicatorMultiform.version).toBeTypeOf("string");
    expect(manifest.oracle.phreeqc).toBeTypeOf("string");
  });

  it("publishes the indicator-optics schema and representation identities centrally", async () => {
    const manifest = await readVersionManifest();
    const { VERSION_MANIFEST } = await import(
      "../packages/schema/src/generated/versions.ts",
    );

    expect(VERSION_MANIFEST).toMatchObject(manifest);
    expect(VERSION_MANIFEST.representation).toMatchObject(
      manifest.representation,
    );
  });

  it("exports an immutable nested runtime snapshot", async () => {
    const { VERSION_MANIFEST } = await import(
      "../packages/schema/src/generated/versions.ts"
    );

    expect(Object.isFrozen(VERSION_MANIFEST)).toBe(true);
    expect(Object.isFrozen(VERSION_MANIFEST.schema)).toBe(true);
    expect(Object.isFrozen(VERSION_MANIFEST.scientific.acidBase)).toBe(true);
    expect(Object.isFrozen(VERSION_MANIFEST.scientific.indicatorMultiform)).toBe(true);
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

  it("rejects a representation namespace that omits an optical identity", async () => {
    const manifest = await readVersionManifest();
    const representation = { ...manifest.representation };
    delete representation.opticalPath;

    expect(() =>
      validateVersionManifest({ ...manifest, representation }),
    ).toThrow(/opticalPath.*non-empty string/);
  });

  it("keeps the indicator multiform reference namespace on the central oracle versions", async () => {
    const manifest = await readVersionManifest();
    const reference = JSON.parse(await readFile(
      "packages/sci/test/reference/indicator-multiform/manifest.json",
      "utf8",
    ));
    expect(reference.schemaVersion).toBe(manifest.oracle.referenceManifest);
    for (const fixtureId of reference.fixtures) {
      const fixture = JSON.parse(await readFile(
        `packages/sci/test/reference/indicator-multiform/${fixtureId}.json`,
        "utf8",
      ));
      expect(fixture.schemaVersion).toBe(manifest.oracle.referenceFixture);
    }
  });
});
