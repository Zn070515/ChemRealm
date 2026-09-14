import { CURRENT_SCHEMA_VERSION, VERSION_MANIFEST } from "@chemrealm/schema";
import { describe, expect, it } from "vitest";

import { App } from "./App.js";

/**
 * The app module test keeps the React adapter's package boundary lightweight;
 * the deterministic production composition and DOM assertions live in
 * `composition.test.ts` and Playwright. It does not need jsdom.
 *
 * An earlier version of this file asserted `element.type === App`. That was
 * simply wrong — calling a function component returns the element it RENDERS
 * (here `<main>`), not an element of that component's type — and the failure
 * is kept in mind as a reminder that a green test only means the assertion
 * matched, not that the assertion was meaningful.
 *
 * The deterministic M5 composition and DOM assertions live in Playwright;
 * M6 still owns final apparatus rendering and interaction.
 */
describe("apps/web composition adapter", () => {
  it("resolves the workspace link to packages/schema", () => {
    expect(CURRENT_SCHEMA_VERSION).toBe(VERSION_MANIFEST.schema.world);
  });

  it("exposes the app component", () => {
    expect(typeof App).toBe("function");
  });
});
