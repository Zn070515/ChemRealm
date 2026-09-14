import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = fileURLToPath(new URL("../", import.meta.url));
const amendmentPath = fileURLToPath(
  new URL("../docs/evidence/native-toolchain-amendment.md", import.meta.url),
);

describe("native toolchain evidence attribution", () => {
  it("binds the post-M0 amendment to the native implementation and hosted CI", () => {
    const evidence = readFileSync(amendmentPath, "utf8");

    expect(evidence).toMatch(
      /Implementation commit:\*{2} `afe0f97ac889757e00300452a4bfa72bd971f5a2`/,
    );
    expect(evidence).toMatch(
      /Hosted CI:\*{2} #117 \/ run `34815999663` for that commit/,
    );
    expect(evidence).toMatch(
      /Local release artifact SHA-256:\*{2} `sha256:01d7d87a2579cfa92ce85b1a90692d12cbcee3919415e9b6da64f0d7e92c9eb2`/,
    );
    expect(evidence).not.toContain("34761350435");
    expect(evidence).toMatch(/final native artifact identity[\s\S]*pending/i);
  });

  it("keeps the native evidence guard green for the attributed packet", () => {
    const output = process.platform === "win32"
      ? execFileSync("cmd.exe", ["/d", "/s", "/c", "pnpm verify:native-evidence"], {
          cwd: root,
          encoding: "utf8",
        })
      : execFileSync("pnpm", ["verify:native-evidence"], {
          cwd: root,
          encoding: "utf8",
        });
    expect(output).toContain("RESULT: PASS");
  });
});
