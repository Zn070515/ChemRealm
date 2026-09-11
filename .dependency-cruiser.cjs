/**
 * Architectural import rules.
 *
 * These encode ADR-0001 rule 2 and ADR-0006 as BUILD FAILURES, not conventions.
 * GOAL.md §5.3 says the renderer must not decide chemistry; a rule that lives
 * only in a document is a rule that gets broken under deadline.
 *
 * `pnpm depcruise` runs against the real tree. `pnpm guards` additionally
 * proves the rules actually bite, by constructing a violating tree in a temp
 * directory and asserting that depcruise fails on it — see
 * tools/check_dependency_rules.mjs. A rule nobody has seen fire is not
 * evidence that the rule works.
 *
 * M0 ships only packages/schema and apps/web, so most rules below are inert
 * today. They are present from the start on purpose: the cost of adding a rule
 * is near zero, and the cost of retrofitting one after the violation exists is
 * a refactor.
 */

/** The four cores, in the order GOAL.md §6 lists them. */
const CORES = ["world", "sci", "render", "ace"];

/**
 * Every forbidden core-to-core edge, with the reason it is forbidden.
 * Only `→ schema` is permitted; everything else is a hidden coupling.
 */
const forbiddenCoreEdges = [
  ["render", "sci", "ADR-0006 / GOAL.md §5.3 — the renderer must not decide chemistry."],
  ["render", "world", "The renderer consumes observable state, never world state."],
  ["ace", "sci", "AGENTS.md §2 — ACE must not obtain chemistry answers directly."],
  ["ace", "render", "ADR-0001 — ACE emits InterventionIntent data; apps/web acts on it."],
  ["ace", "world", "ACE reads world state through the app, and writes only to its own store."],
  ["sci", "world", "ADR-0003 — the scientific core takes plain data, not world state."],
  ["sci", "render", "The scientific core has no notion of presentation."],
  ["world", "sci", "ADR-0003 — the reducer receives a solver by injection."],
  ["world", "render", "The world runtime has no notion of presentation."],
  ["world", "ace", "GOAL.md §6.2 — the World Runtime must not embed teaching policy."],
];

module.exports = {
  forbidden: [
    ...forbiddenCoreEdges.map(([from, to, comment]) => ({
      name: `${from}-must-not-import-${to}`,
      severity: "error",
      comment,
      from: { path: `(^|/)packages/${from}/` },
      to: { path: `(^|/)packages/${to}/` },
    })),

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

    // Declared for M5/M6, when `packages/render` gains a renderer. Kept here so
    // the pinning is decided once rather than in a hurry later.
    {
      name: "scientific-core-is-not-a-devtool-catchall",
      severity: "error",
      comment:
        "packages/sci may import packages/schema and nothing else from the workspace.",
      from: { path: "(^|/)packages/sci/", pathNot: "(^|/)packages/sci/(test|tests)/" },
      to: {
        path: `(^|/)(${CORES.filter((c) => c !== "sci")
          .map((c) => `packages/${c}/`)
          .join("|")}|apps/)`,
      },
    },
  ],

  options: {
    doNotFollow: { path: "(^|/)(node_modules|dist|\\.venv|spikes)(/|$)" },
    exclude: { path: "(^|/)(node_modules|dist|\\.venv|spikes)(/|$)" },
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
