import { expect, test } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const namedViewports = [
  ["desktop-primary", 1440, 900],
  ["desktop-compact", 1280, 720],
  ["tablet", 1024, 768],
  ["narrow", 768, 1024],
] as const;

test.describe("M6 candidate viewport captures", () => {
  for (const [name, width, height] of namedViewports) {
    test(`${name} candidate apparatus capture`, async ({ page }) => {
      test.skip(
        process.env.M6_CAPTURE !== "1",
        "Set M6_CAPTURE=1 to regenerate candidate captures; these are not approved baselines.",
      );
      await page.setViewportSize({ width, height });
      await page.goto("/", { waitUntil: "networkidle" });
      await expect(page.getByTestId("m6-renderer-status")).toHaveText("Ready");
      const outputDirectory = path.resolve("tests/visual/captures/m6");
      await mkdir(outputDirectory, { recursive: true });
      await page.getByTestId("m6-visual-surface").screenshot({
        path: path.join(outputDirectory, `${name}.png`),
        animations: "disabled",
      });
    });
  }

  test("visual-stress 100 mL blue fixture capture", async ({ page }) => {
    test.skip(
      process.env.M6_CAPTURE !== "1",
      "Set M6_CAPTURE=1 to regenerate candidate captures; these are not approved baselines.",
    );
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/?fixture=visual-stress", { waitUntil: "networkidle" });
    await expect(page.getByTestId("m6-renderer-status")).toHaveText("Ready");
    const outputDirectory = path.resolve("tests/visual/captures/m6");
    await mkdir(outputDirectory, { recursive: true });
    await page.getByTestId("m6-visual-surface").screenshot({
      path: path.join(outputDirectory, "visual-stress-100ml-blue.png"),
      animations: "disabled",
    });
  });
});
