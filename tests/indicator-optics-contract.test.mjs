import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";

const root = new URL("..", import.meta.url);

describe("indicator optical authority gate", () => {
  it("has a canonical contract checker wired into the package scripts", async () => {
    const packageJson = JSON.parse(
      await readFile(new URL("../package.json", import.meta.url), "utf8"),
    );
    expect(packageJson.scripts["verify:indicator-optics"]).toBe(
      "node tools/check_indicator_optics_contract.mjs",
    );
  });

  it("accepts only the canonical candidate SPEC with all optical admission gates", () => {
    const result = spawnSync(
      process.execPath,
      ["tools/check_indicator_optics_contract.mjs"],
      { cwd: root, encoding: "utf8" },
    );

    expect(result.status).toBe(0);
    expect(`${result.stdout}\n${result.stderr}`).toMatch(
      /indicator optics contract: PASS/,
    );
  });
});
