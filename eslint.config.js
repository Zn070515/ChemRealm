import tseslint from "typescript-eslint";

/**
 * Deliberately minimal at M0. Its job here is to exist and to be wired into
 * the workspace, not to enforce style.
 *
 * Rules that encode architecture are enforced by dependency-cruiser
 * (.dependency-cruiser.cjs), because they are structural rather than lexical.
 * Later milestones add lexical bans through this file — for example ADR-0007's
 * prohibition on native Math.log10 / Math.pow / Math.exp inside packages/sci
 * (M4), and ADR-0006's ban on hard-coded chemical colour literals (M5).
 */
export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "dist-types/**",
      "**/node_modules/**",
      "**/.venv/**",
      "spikes/**",
      // Generated/transient output from the guard and the browser tests.
      "tmp-depcruise-guard/**",
      "test-results/**",
      "playwright-report/**",
      "**/*.cjs",
    ],
  },
  ...tseslint.configs.recommended,
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      "no-console": "warn",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
);
