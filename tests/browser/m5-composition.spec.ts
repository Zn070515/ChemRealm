import { expect, test } from "@playwright/test";

test.describe("M5 production composition", () => {
  test("renders one committed world through the science-to-observable path", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });

    await expect(page.getByRole("heading", { level: 1 })).toHaveText("ChemRealm");
    await expect(page.getByTestId("composition-status")).toHaveText("Committed world");
    await expect(page.getByTestId("world-id")).toHaveText("m5-production-world");
    await expect(page.getByTestId("backend-version")).toHaveText(/^\d+\.\d+\.\d+$/);
    await expect(page.getByTestId("world-sequence")).not.toHaveText("");
    await expect(page.getByTestId("world-state-hash")).not.toHaveText("");
    await expect(page.getByTestId("ph-readout")).toHaveText(/^pH \d+\.\d{2}$/);
    await expect(page.getByTestId("burette-reading")).toHaveText(/mL$/);
    await expect(page.getByTestId("indicator-id")).toHaveText("phenolphthalein");
    await expect(page.getByTestId("indicator-optical-status")).toHaveText(
      "OPTICAL_MODEL_OK",
    );
    await expect(page.getByTestId("indicator-amount")).toHaveText("0.000002505 mol");
    await expect(page.getByTestId("indicator-concentration")).toHaveText("0.00005 mol/L");
    await expect(page.getByTestId("indicator-path-length")).toHaveText("10 mm");
    await expect(page.getByTestId("indicator-profile-id")).toHaveText(
      "phenolphthalein-ordinary-aqueous",
    );
    await expect(page.getByTestId("indicator-profile-hash")).toHaveText(
      /^sha256:[0-9a-f]{64}$/,
    );
    await expect(page.getByTestId("indicator-tint-strength")).toHaveText(/^0\.[0-9]+$/);
    expect(Number(await page.getByTestId("indicator-tint-strength").textContent())).toBeGreaterThan(0);
    await expect(page.getByTestId("indicator-transmittance-samples")).toHaveText("3");
    await expect(page.getByTestId("indicator-swatch")).toHaveCount(1);
    await expect(page.getByTestId("indicator-swatch")).toHaveAttribute("data-optical-model", "true");
    await expect(page.getByTestId("indicator-optical-limitation")).toHaveCount(0);
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

  test("uses native WASM only when the backend is explicitly selected", async ({ page }) => {
    await page.goto("/?backend=native", { waitUntil: "networkidle" });

    await expect(page.getByTestId("composition-status")).toHaveText("Committed world");
    await expect(page.getByTestId("backend-id")).toHaveText("acidbase-monoprotic-davies");
    await expect(page.getByTestId("backend-version")).toHaveText(/^\d+\.\d+\.\d+$/);
    await expect(page.getByTestId("world-state-hash")).not.toHaveText("");
    await expect(page.getByTestId("symbolic-expression")).toContainText("Scientific Core");
    await expect(page.getByTestId("ph-readout")).toHaveText(/^pH \d+\.\d{2}$/);
  });

  test("does not fall back to TypeScript when explicitly selected native WASM fails", async ({ page }) => {
    await page.route("**/native/chemrealm_sci_core.wasm", (route) => route.abort());
    await page.goto("/?backend=native", { waitUntil: "networkidle" });

    await expect(page.getByTestId("composition-error")).toHaveAttribute("role", "alert");
    await expect(page.getByTestId("composition-error")).toContainText(/failed|fetch|network|WASM/i);
    await expect(page.getByTestId("composition-status")).toHaveCount(0);
  });
});
