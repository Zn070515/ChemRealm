import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = fileURLToPath(new URL("../", import.meta.url));
const read = (relativePath) => readFileSync(`${root}/${relativePath}`, "utf8");

describe("M5/M6 acceptance ownership", () => {
  it("keeps M5 contract evidence independent from M6 visual realization", () => {
    const evidence = read("docs/evidence/M5.md");
    const plan = read("docs/plans/PLAN-0001-world-foundation-acid-base-titration.md");
    const contractSpec = read("docs/superpowers/specs/2026-09-13-m5-contract-remediation.md");

    expect(evidence).toMatch(/AC-V3[^\n]*\| PARTIAL/i);
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
});
