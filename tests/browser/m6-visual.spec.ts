import { expect, test } from "@playwright/test";

const namedViewports = [
  ["desktop-primary", 1440, 900],
  ["desktop-compact", 1280, 720],
  ["tablet", 1024, 768],
  ["narrow", 768, 1024],
] as const;

test.describe("M6 candidate apparatus composition", () => {
  for (const [name, width, height] of namedViewports) {
    test(`${name} keeps the Pixi surface and essential DOM inspection visible`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto("/", { waitUntil: "networkidle" });

      await expect(page.getByTestId("m6-renderer-status")).toHaveText("Ready");
      const host = page.getByTestId("m6-pixi-host");
      await expect(host).toBeVisible();
      await expect(host.locator("canvas")).toHaveCount(1);
      const box = await host.boundingBox();
      expect(box?.width).toBeGreaterThan(220);
      expect(box?.height).toBeGreaterThan(180);
      await expect(page.getByTestId("ph-readout")).toBeVisible();
      await expect(page.getByTestId("liquid-level")).toBeVisible();
      await expect(page.getByTestId("burette-reading")).toHaveText(/mL$/);
      await expect(page.getByTestId("indicator-optical-limitation")).toBeVisible();
      await expect(page.getByTestId("m6-pixi-host")).toHaveAttribute("aria-label", /essential readings/);
    });
  }

  test("keeps the canvas and DOM on the same renderer state version", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await expect(page.getByTestId("m6-renderer-status")).toHaveText("Ready");
    const canvas = page.getByTestId("m6-pixi-host").locator("canvas");
    const canvasVersion = await canvas.getAttribute("data-render-state-version");
    expect(canvasVersion).toBe("2");
    await expect(page.getByTestId("world-state-hash")).not.toHaveText("");
    await page.getByRole("button", { name: "科学模型" }).click();
    await expect(page.getByTestId("m6-renderer-status")).toHaveText("Ready");
    await expect(page.getByTestId("ph-readout")).toContainText("model pH");
    await expect(canvas).toHaveCount(1);
  });

  test("renders the named GPU visual-stress fixture without presenting it as science", async ({ page }) => {
    await page.goto("/?fixture=visual-stress", { waitUntil: "networkidle" });
    await expect(page.getByTestId("m6-renderer-status")).toHaveText("Ready");
    await expect(page.getByTestId("m6-visual-stress-warning")).toContainText("not scientific evidence");
    await expect(page.getByTestId("beaker-scene-actor")).toHaveAttribute(
      "data-visual-status",
      "visual-stress-fixture",
    );
    await expect(page.getByTestId("beaker-liquid-appearance")).toHaveText("observed");
  });
});
