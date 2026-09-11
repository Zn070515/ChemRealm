import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

/**
 * NOTE ON THE FILENAME. `PLAN-0001` M0 lists `vitest.workspace.ts`. Vitest 3.2
 * deprecated that file in favour of `test.projects` in the root config, so this
 * is `vitest.config.ts` with an explicit `include` list instead. Same effect,
 * no deprecation warning. Recorded because deviating from the plan silently is
 * exactly the behaviour this project forbids.
 */
export default defineConfig({
  resolve: {
    alias: {
      // Point workspace imports at SOURCE, not at `dist`. Without this, tests
      // would only run after a build, which makes `pnpm test` depend on
      // `pnpm build` having run first — a coupling that shows up as a
      // confusing failure on a clean checkout.
      "@chemrealm/schema": fileURLToPath(
        new URL("./packages/schema/src/index.ts", import.meta.url),
      ),
    },
  },
  test: {
    environment: "node",
    include: [
      "packages/*/src/**/*.test.ts",
      "apps/*/src/**/*.test.ts",
      "tests/**/*.test.ts",
    ],
    exclude: ["**/node_modules/**", "**/dist/**", "spikes/**"],
  },
});
