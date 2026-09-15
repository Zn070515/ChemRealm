import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));

describe("M6 Gold Master candidate contract guard", () => {
  it("passes only when source, generated package, and evidence remain candidate-scoped", () => {
    const output = execFileSync(
      process.platform === "win32" ? "cmd.exe" : "pnpm",
      process.platform === "win32"
        ? ["/d", "/s", "/c", "node tools/check_m6_gold_master_contract.mjs"]
        : ["node", "tools/check_m6_gold_master_contract.mjs"],
      { cwd: root, encoding: "utf8" },
    );
    expect(output).toContain("RESULT: PASS");
  });
});
