import { expect, test } from "@playwright/test";

test.describe("M5 production composition", () => {
  test("renders one committed world through the science-to-observable path", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });

    await expect(page.getByRole("heading", { level: 1 })).toHaveText("ChemRealm");
    await expect(page.getByTestId("composition-status")).toHaveText("Committed world");
    await expect(page.getByTestId("world-id")).toHaveText("m5-production-world");
    await expect(page.getByTestId("world-sequence")).not.toHaveText("");
    await expect(page.getByTestId("world-state-hash")).not.toHaveText("");
    await expect(page.getByTestId("ph-readout")).toHaveText(/^pH \d+\.\d{2}$/);
    await expect(page.getByTestId("burette-reading")).toHaveText(/mL$/);
    await expect(page.getByTestId("indicator-id")).toHaveText("phenolphthalein");
    await expect(page.getByTestId("symbolic-expression")).toContainText("Scientific Core");
    await expect(page.getByTestId("symbolic-expression")).toContainText("m(H+)");
    expect(await page.getByTestId("curve-point").count()).toBeGreaterThanOrEqual(4);
    await expect(page.getByTestId("curve-source").first()).not.toHaveText("");

    await page.getByRole("button", { name: "科学模型" }).click();
    await expect(page.getByTestId("ph-readout")).toContainText("model pH (Davies)");
    await expect(page.getByTestId("model-ph-convention")).toContainText("notional activity convention");
    await expect(page.getByTestId("model-ph-convention")).not.toContainText(/true|thermodynamic/i);
    expect(await page.getByTestId("ph-readout").count()).toBe(1);
    expect(await page.getByTestId("taught-ph-readout").count()).toBe(0);
    await expect(page.getByTestId("curve-delivered-volume").nth(0)).toHaveText("0.000 L");
    await expect(page.getByTestId("curve-delivered-volume").nth(1)).toHaveText("0.010 L");
    await expect(page.getByTestId("curve-delivered-volume").nth(2)).toHaveText("0.020 L");
    await expect(page.getByTestId("curve-delivered-volume").nth(3)).toHaveText("0.025 L");
    await expect(page.getByTestId("model-ph-convention")).toContainText("activity model: Davies");
  });

  test("visibly qualifies a valid-domain result outside the proposed envelope", async ({ page }) => {
    await page.goto("/?fixture=accuracy-probe", { waitUntil: "networkidle" });

    await expect(page.getByTestId("composition-status")).toHaveText("Committed world");
    await expect(page.getByTestId("world-id")).toHaveText("m5-accuracy-envelope-probe-world");
    await expect(page.getByTestId("accuracy-qualification")).toHaveText(
      "outside proposed accuracy envelope",
    );
  });
});
