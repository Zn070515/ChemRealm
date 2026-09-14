import { readFile } from "node:fs/promises";
import { access, cp, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { checkIndicatorOpticalProfiles } from "../tools/check_indicator_optical_profiles.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const opticsRoot = `${root}/docs/research/indicator-optics`;

async function withRegistryCopy(mutator, expectedMessage) {
  const copiedRoot = await mkdtemp(path.join(tmpdir(), "chemrealm-indicator-optics-"));
  await cp(opticsRoot, copiedRoot, { recursive: true });
  try {
    await mutator(copiedRoot);
    await expect(checkIndicatorOpticalProfiles(copiedRoot)).rejects.toThrow(expectedMessage);
  } finally {
    await rm(copiedRoot, { recursive: true, force: true });
  }
}

async function readCopiedRegistry(copiedRoot) {
  return JSON.parse(await readFile(path.join(copiedRoot, "profile-registry.json"), "utf8"));
}

async function writeCopiedRegistry(copiedRoot, registry) {
  await writeFile(
    path.join(copiedRoot, "profile-registry.json"),
    `${JSON.stringify(registry, null, 2)}\n`,
    "utf8",
  );
}

async function readJson(name) {
  return JSON.parse(await readFile(`${opticsRoot}/${name}`, "utf8"));
}

async function readText(name) {
  return readFile(`${opticsRoot}/${name}`, "utf8");
}

describe("indicator optical source-review boundary", () => {
  it("requires a reviewed registry with one source packet per candidate form", async () => {
    const registry = await readJson("profile-registry.json");
    expect(registry.registryId).toBe("chemrealm-indicator-optical-profiles");
    expect(registry.policy).toBe("refusal-first");
    expect(registry.entries).toHaveLength(5);

    for (const entry of registry.entries) {
      expect(entry.profileId).toMatch(/^[a-z0-9-]+$/);
      expect(entry.sourceRecord).toMatch(/\.source\.md$/);
      await expect(access(`${opticsRoot}/${entry.sourceRecord}`)).resolves.toBeUndefined();
      expect(entry.reviewStatus).toMatch(/^(qualitative-only|quantitative)$/);
      expect(entry.source.citation).not.toMatch(/TODO|TBD|placeholder/i);
      expect(entry.source.sourceUrl).toMatch(/^https:\/\//);
      expect(entry.source.accessedOn).toMatch(/^2026-09-14$/);
      expect(entry.source.conditions.solvent).toBeTruthy();
      expect(entry.source.conditions.temperature).toBeTruthy();
      expect(entry.source.conditions.concentration).toBeTruthy();
      expect(entry.source.conditions.pathLength).toBeTruthy();
      expect(entry.source.conditions.acidityOrIonicStrength).toBeTruthy();
    }
  });

  it("does not admit a qualitative-only source as a quantitative profile", async () => {
    const registry = await readJson("profile-registry.json");
    const qualitative = registry.entries.filter(
      (entry) => entry.reviewStatus === "qualitative-only",
    );
    expect(qualitative.length).toBeGreaterThan(0);
    for (const entry of qualitative) {
      expect(entry.profileArtifact ?? null).toBeNull();
      expect(entry.reviewRecord ?? null).toBeNull();
      expect(entry.admissionReason).toMatch(/qualitative|not admitted|not enough/i);
    }
  });

  it("requires quantitative profiles to carry multi-point extraction and review evidence", async () => {
    const registry = await readJson("profile-registry.json");
    for (const entry of registry.entries.filter(
      (candidate) => candidate.reviewStatus === "quantitative",
    )) {
      expect(entry.profileArtifact).toMatch(/\.profile\.json$/);
      expect(entry.reviewRecord).toMatch(/\.review\.md$/);
      const profile = await readJson(entry.profileArtifact);
      expect(profile.reviewStatus).toBe("quantitative");
      expect(profile.source.licenseOrPermission).toMatch(
        /^(open|permission-recorded)$/,
      );
      expect(profile.formSpectra.every((form) => form.samples.length >= 2)).toBe(true);
      expect(profile.source.extractionMethod).toMatch(/digitized|machine-readable/);
      expect(profile.source.conditions.temperature).toBeDefined();
      const review = await readText(entry.reviewRecord);
      expect(review).toMatch(/decision:\s*quantitative/i);
      expect(review).toMatch(/hash/i);
    }
  });

  it("keeps the known refusal cases explicit in the admission checker", async () => {
    const checker = await readFile(
      `${root}/tools/check_indicator_optical_profiles.mjs`,
      "utf8",
    );
    expect(checker).toContain("lambdaMax");
    expect(checker).toContain("concentration");
    expect(checker).toContain("pathLength");
    expect(checker).toContain("licenseOrPermission");
    expect(checker).toContain("reportedPrecision");
    expect(checker).toContain("profile hash");
  });

  it("rejects lambdaMax-only, incomplete-condition, and unknown-rights fixtures", async () => {
    await withRegistryCopy(async (copiedRoot) => {
      const registry = await readCopiedRegistry(copiedRoot);
      registry.entries[0].lambdaMax = 553;
      await writeCopiedRegistry(copiedRoot, registry);
    }, /lambdaMax/);

    await withRegistryCopy(async (copiedRoot) => {
      const registry = await readCopiedRegistry(copiedRoot);
      registry.entries[0].source.conditions.concentration = "";
      registry.entries[0].source.conditions.pathLength = "";
      await writeCopiedRegistry(copiedRoot, registry);
    }, /concentration/);

    await withRegistryCopy(async (copiedRoot) => {
      const registry = await readCopiedRegistry(copiedRoot);
      registry.entries[0].source.licenseOrPermission = "unknown";
      await writeCopiedRegistry(copiedRoot, registry);
    }, /license\/permission|rights/);
  });

  it("rejects invented precision and a profile whose payload hash was changed", async () => {
    await withRegistryCopy(async (copiedRoot) => {
      const registry = await readCopiedRegistry(copiedRoot);
      registry.entries[0].source.reportedPrecision = "reported to 0.001 g/mL";
      await writeCopiedRegistry(copiedRoot, registry);
    }, /invent quantitative precision/);

    await withRegistryCopy(async (copiedRoot) => {
      const registry = await readCopiedRegistry(copiedRoot);
      const entry = registry.entries[0];
      entry.reviewStatus = "quantitative";
      entry.profileArtifact = "synthetic.profile.json";
      entry.reviewRecord = "synthetic.review.md";
      entry.source.licenseOrPermission = "open";
      entry.source.extractionMethod = "machine-readable";
      const profile = {
        profileId: entry.profileId,
        profileVersion: "1.0.0",
        indicatorId: entry.indicatorId,
        representation: "spectral-molar-absorptivity",
        formSpectra: [{
          formId: entry.formId,
          spectrumId: "synthetic-spectrum",
          samples: [
            { wavelengthNanometres: 500, epsilon: 10 },
            { wavelengthNanometres: 510, epsilon: 20 },
          ],
        }],
        transform: "sRGB-IEC-61966-2-1",
        source: { licenseOrPermission: "open", extractionMethod: "machine-readable" },
        reviewStatus: "quantitative",
        profileHash: `sha256:${"0".repeat(64)}`,
      };
      await writeFile(
        path.join(copiedRoot, entry.profileArtifact),
        `${JSON.stringify(profile, null, 2)}\n`,
        "utf8",
      );
      await writeFile(
        path.join(copiedRoot, entry.reviewRecord),
        "decision: quantitative\nprofile hash: sha256:0000000000000000000000000000000000000000000000000000000000000000\n",
        "utf8",
      );
      await writeCopiedRegistry(copiedRoot, registry);
    }, /profile hash does not match payload/);
  });
});
