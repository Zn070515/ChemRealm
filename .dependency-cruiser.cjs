/**
 * Architectural import rules.
 *
 * These encode ADR-0001 rule 2 and ADR-0006 as BUILD FAILURES, not conventions.
 * GOAL.md §5.3 says the renderer must not decide chemistry; a rule that lives
 * only in a document is a rule that gets broken under deadline.
 *
 * The core-boundary matrix is DERIVED in tools/core-boundaries.cjs, not written
 * out here. M0's first version hand-listed ten of the twelve forbidden core
 * edges and missed `render -> ace`, which no other rule covered and which the
 * two-fixture guard did not sample. Hand-maintaining "everything that must not
 * happen" fails silently, so the forbidden set now falls out of the allowed
 * set: a core may import `packages/schema`, and nothing else from the workspace.
 *
 * `pnpm depcruise` runs against the real tree. `pnpm guards` additionally builds
 * a violating tree for EVERY edge in the matrix and asserts depcruise rejects
 * each by name — see tools/check_dependency_rules.mjs.
 *
 * M0 ships only packages/schema and apps/web, so most rules are inert today.
 * They are present from the start on purpose: adding a rule costs nothing, and
 * retrofitting one after the violation exists costs a refactor.
 */

const { CORES, SHARED, forbiddenCoreEdges } = require("./tools/core-boundaries.cjs");

module.exports = {
  forbidden: [
    ...forbiddenCoreEdges.map(({ from, to, rule, comment }) => ({
      name: rule,
      severity: "error",
      comment,
      from: { path: `(^|/)packages/${from}/` },
      to: { path: `(^|/)packages/${to}/` },
    })),

    // The positive form of the matrix: a core may reach `packages/schema` and
    // nothing else from the workspace. One rule per core, because the exclusion
    // has to name the importing package — a shared rule cannot say "any package
    // except my own", and a core's own test importing its own source would
    // otherwise be reported as a boundary violation.
    ...CORES.map((core) => ({
      name: `${core}-imports-only-schema`,
      severity: "error",
      comment:
        `packages/${core} may import packages/${SHARED} and nothing else from ` +
        "the workspace. apps/ is reached only from the composition root. This " +
        "catches a core importing a package that is not yet a core, or a future " +
        "one nobody added to CORES.",
      from: { path: `(^|/)packages/${core}/` },
      to: { path: `(^|/)(packages/(?!${core}/|${SHARED}/)|apps/)` },
    })),

    {
      name: "schema-is-a-leaf",
      severity: "error",
      comment:
        `packages/${SHARED} is the shared contract. It owns no behaviour, so it ` +
        "imports nothing else in the workspace — otherwise every package that " +
        "depends on the contract would inherit the dependency.",
      from: { path: `(^|/)packages/${SHARED}/` },
      to: { path: `(^|/)(packages/(?!${SHARED}/)|apps/)` },
    },

    {
      name: "nobody-imports-the-composition-root",
      severity: "error",
      comment:
        "apps/web is the only place the four cores meet. Anything importing it inverts the dependency.",
      from: { pathNot: "(^|/)apps/web/" },
      to: { path: "(^|/)apps/web/" },
    },

    {
      name: "no-circular",
      severity: "error",
      comment: "A cycle between packages means the boundary is not real.",
      from: {},
      to: { circular: true },
    },
  ],

  options: {
    doNotFollow: { path: "(^|/)(node_modules|dist|dist-types|\\.venv|spikes|\\.tmp-depcruise-guard)(/|$)" },
    exclude: { path: "(^|/)(node_modules|dist|dist-types|\\.venv|spikes|\\.tmp-depcruise-guard)(/|$)" },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default"],
    },
    reporterOptions: {
      text: { highlightFocused: true },
    },
  },
};
