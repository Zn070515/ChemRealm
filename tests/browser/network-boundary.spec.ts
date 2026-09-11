import { expect, test } from "@playwright/test";

/**
 * `SPEC-0001` AC-P5 — "a full page load issues no request to a third-party
 * origin" — and its prescribed evidence: **network inspection**.
 *
 * WHY THIS FILE EXISTS ALONGSIDE `tools/check_build_artifacts.mjs`
 *
 * The artifact scanner is a static guard. It reads the emitted HTML/JS/CSS and
 * looks for third-party load positions. That is genuinely useful — it catches a
 * dependency that injects a CDN <link> at build time — but it is not network
 * inspection, and it cannot be:
 *
 *   - a URL assembled at runtime (`fetch("https:" + "//host/x")`) is invisible
 *     to any regex over a bundle that does not execute it;
 *   - `navigator.sendBeacon`, `new WebSocket(...)`, and `fetch(new URL(...))`
 *     appear as ordinary identifiers;
 *   - a dependency may build addresses from configuration at load time.
 *
 * So the two have different jobs, and both are kept:
 *
 *   artifact scan            -> preventive static guard, fails fast, no browser
 *   this file                -> AC-P5's acceptance evidence
 *
 * The anti-vacuity checks matter as much as the assertion. "Zero external
 * requests" is trivially true if the page never loaded, so this also asserts
 * that requests were observed at all and that the app actually rendered.
 */

test.describe("AC-P5 — page load network boundary", () => {
  test("issues no request to a third-party origin", async ({ page, baseURL }) => {
    const observed: string[] = [];
    page.on("request", (request) => observed.push(request.url()));

    await page.goto("/", { waitUntil: "networkidle" });

    // Anti-vacuity 1: the page must actually have rendered. A blank page makes
    // the boundary assertion below true and worthless.
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("ChemRealm");

    // Anti-vacuity 2: a load with no requests at all would mean the listener
    // was never attached, or the server served nothing.
    expect(
      observed.length,
      "no requests were observed at all — the listener or the server is broken",
    ).toBeGreaterThan(0);

    const origin = new URL(baseURL ?? "http://127.0.0.1:4173").origin;
    const external = observed.filter((url) => {
      if (url.startsWith("data:") || url.startsWith("blob:")) return false;
      try {
        return new URL(url).origin !== origin;
      } catch {
        return false;
      }
    });

    expect(
      external,
      `page load contacted third-party origins:\n  ${external.join("\n  ")}`,
    ).toEqual([]);
  });
});
