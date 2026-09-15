import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = fileURLToPath(new URL("../", import.meta.url));
const read = (relativePath) => readFileSync(`${root}/${relativePath}`, "utf8");
const readJson = (relativePath) => JSON.parse(read(relativePath));

describe("M5/M6 acceptance ownership", () => {
  it("keeps M5 contract evidence independent from M6 visual realization", () => {
    const evidence = read("docs/evidence/M5.md");
    const plan = read("docs/plans/PLAN-0001-world-foundation-acid-base-titration.md");
    const contractSpec = read("docs/superpowers/specs/2026-09-13-m5-contract-remediation.md");

    expect(evidence).toMatch(/AC-V3[^\n]*\| PASS locally/i);
    expect(evidence).toMatch(/AC-V4[^\n]*\| PASS locally/i);
    expect(evidence).toMatch(/contract-level[\s\S]{0,240}M5 S3\s+does\s+not\s+require M6/i);
    expect(evidence).toMatch(/M6 consumes the downstream visual realization contract/i);
    expect(evidence).toMatch(/does not retroactively gate M5 S3/i);
    expect(plan).toMatch(/M5 S3 owns[\s\S]{0,300}contract-level/i);
    expect(plan).toMatch(/M5 S3 does\s+not wait for M6/i);
    expect(plan).toMatch(/M6 consumes[\s\S]{0,220}frozen M5 representation contract/i);
    expect(contractSpec).toMatch(/AC-V3 is a M5 contract-level/i);
    expect(contractSpec).toMatch(/AC-V4 is\s+a M5 contract-level/i);
  });

  it("records non-contiguous amendment acceptance without authorizing native default rollout", () => {
    const manifest = readJson("contracts/version-manifest.json");
    const spec = read("docs/specs/SPEC-0001-world-foundation-acid-base-titration.md");
    const plan = read("docs/plans/PLAN-0001-world-foundation-acid-base-titration.md");
    const m5 = read("docs/evidence/M5.md");
    const native = read("docs/evidence/M4-native.md");
    const entry = read("docs/evidence/M6-entry.md");

    expect(manifest.spec.acceptedThroughRevision).toBe(
      manifest.spec.m5ContractRevision,
    );
    for (const revision of manifest.spec.acceptedAmendmentRevisions) {
      expect(spec).toMatch(
        new RegExp(
          `\\| ${revision} \\|[^\\n]*\\|\\s*Owner(?: accepted)?(?:,|\\s+\\d{4}-\\d{2}-\\d{2})`,
          "i",
        ),
      );
    }

    const pending = Array.from(
      { length: manifest.spec.currentRevision - manifest.spec.acceptedThroughRevision },
      (_, index) => manifest.spec.acceptedThroughRevision + index + 1,
    ).filter((revision) => !manifest.spec.acceptedAmendmentRevisions.includes(revision));
    expect(pending).toEqual([manifest.spec.acceptedThroughRevision + 1]);
    expect(spec).toMatch(
      new RegExp(`\\| ${pending[0]} \\|[^\\n]*Candidate`, "i"),
    );

    expect(plan).toMatch(/M5 and M4-B S3 Verified \/ Accepted/i);
    expect(plan).toMatch(/M6 authorized\s*\/\s*in\s+progress/i);
    expect(m5).toMatch(/owner acceptance recorded/i);
    expect(native).toMatch(/M4-B S3 evidence accepted/i);
    expect(native).toMatch(/native supersession[\s\S]{0,120}default rollout remains unapproved/i);
    expect(entry).toMatch(/^\*\*Status:\*\* \*\*M6 authorized \/ in progress\*\*/m);
    expect(entry).toMatch(/does not claim M6 S3/i);
  });
});
