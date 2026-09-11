import { SCHEMA_VERSION } from "@chemrealm/schema";
import { describe, expect, it } from "vitest";

import { App } from "./App.js";

/**
 * What M0 needs to prove for `apps/web` is narrow: the pnpm workspace link to
 * `packages/schema` resolves, and the component module loads. It does not need
 * a DOM, and has no jsdom dependency.
 *
 * An earlier version of this file asserted `element.type === App`. That was
 * simply wrong — calling a function component returns the element it RENDERS
 * (here `<main>`), not an element of that component's type — and the failure
 * is kept in mind as a reminder that a green test only means the assertion
 * matched, not that the assertion was meaningful.
 *
 * Real rendering and interaction assertions arrive with the Playwright flows
 * in M7.
 */
describe("apps/web placeholder", () => {
  it("resolves the workspace link to packages/schema", () => {
    expect(SCHEMA_VERSION).toBe(1);
  });

  it("exposes the app component", () => {
    expect(typeof App).toBe("function");
  });
});
