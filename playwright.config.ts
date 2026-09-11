import { defineConfig, devices } from "@playwright/test";

/**
 * A deliberately tiny browser setup. It exists for ONE assertion at M0 —
 * `SPEC-0001` AC-P5, "a full page load issues no request to a third-party
 * origin" — which is a runtime fact about a running page and cannot be
 * established by scanning build output.
 *
 * `tests/browser/` is not a product test suite. `PLAN-0001` M7 owns the real
 * Playwright flows; this is the smallest thing that can honestly carry AC-P5.
 */
export default defineConfig({
  testDir: "./tests/browser",
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: process.env.CI ? "github" : "list",

  use: {
    baseURL: "http://127.0.0.1:4173",
    // Some developer Chromium profiles route loopback through a system proxy,
    // which returns a false 502 before the local preview server is reached.
    // The test must observe the app directly; external app requests, if any,
    // remain visible to the page request listener and fail the assertion.
    launchOptions: {
      args: ["--no-proxy-server", "--proxy-server=direct://", "--proxy-bypass-list=*"],
    },
    trace: "off",
    video: "off",
    screenshot: "off",
  },

  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],

  webServer: {
    // `vite preview` serves the BUILT output, so this exercises the artifact
    // that actually ships rather than a dev server's module graph. CI builds
    // before this runs.
    //
    // `--host 127.0.0.1` is not decoration. Without it Vite binds `localhost`,
    // which on this Windows machine resolves to `::1` only — Playwright probes
    // 127.0.0.1, gets nothing, and fails with a 120-second webServer timeout
    // that says nothing about the real cause. Pinning the host makes the
    // address the server binds and the address the config probes the same one.
    command:
      "pnpm --filter @chemrealm/web exec vite preview --host 127.0.0.1 --port 4173 --strictPort",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
