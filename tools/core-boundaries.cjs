/**
 * The core-boundary matrix, as data.
 *
 * WHY THIS IS A SEPARATE MODULE
 * -----------------------------
 * `ADR-0001` rule 2 states one allowed relationship — each core may import
 * `packages/schema`, and nothing else from the workspace — and twelve forbidden
 * ones (every ordered pair of distinct cores). M0 originally hand-wrote ten of
 * those twelve and missed `render -> ace`, which nothing else caught: the guard
 * only sampled two edges, so it stayed green.
 *
 * A hand-maintained list of "everything that must not happen" fails silently
 * and in the direction that matters. So the forbidden set is now DERIVED from
 * the allowed set, and both `.dependency-cruiser.cjs` and the guard read the
 * same module. Adding a fifth core to `CORES` produces its nine new forbidden
 * edges automatically.
 *
 * The guard builds a violating fixture for every edge listed here and asserts
 * depcruise rejects it by name. A rule nobody has seen fire is not evidence
 * that the rule works; a rule nobody has tried is not evidence either.
 */

/** The four cores, in the order `GOAL.md` §6 lists them. */
const CORES = ["world", "sci", "render", "ace"];

/** The only package a core may import from the workspace. */
const SHARED = "schema";

/**
 * Every ordered pair of distinct cores, with the reason the edge is forbidden.
 * Derived, never enumerated by hand.
 */
const CORE_EDGE_REASONS = {
  "render->sci": "ADR-0006 / GOAL.md §5.3 — the renderer must not decide chemistry.",
  "render->world": "The renderer consumes observable state, never world state.",
  "render->ace": "The renderer presents; it does not choose interventions.",
  "ace->sci": "AGENTS.md §2 — ACE must not obtain chemistry answers directly.",
  "ace->render": "ADR-0001 — ACE emits InterventionIntent data; apps/web acts on it.",
  "ace->world": "ACE reads world state through the app, and writes only to its own store.",
  "sci->world": "ADR-0003 — the scientific core takes plain data, not world state.",
  "sci->render": "The scientific core has no notion of presentation.",
  "sci->ace": "GOAL.md §6.1 — the scientific core does not know about learners.",
  "world->sci": "ADR-0003 — the reducer receives a solver by injection.",
  "world->render": "The world runtime has no notion of presentation.",
  "world->ace": "GOAL.md §6.2 — the World Runtime must not embed teaching policy.",
};

const forbiddenCoreEdges = [];
for (const from of CORES) {
  for (const to of CORES) {
    if (from === to) continue;
    const key = `${from}->${to}`;
    forbiddenCoreEdges.push({
      from,
      to,
      rule: `${from}-must-not-import-${to}`,
      comment: CORE_EDGE_REASONS[key] ?? `${from} must not import ${to}.`,
    });
  }
}

/** Guard against the reasons map drifting out of step with CORES. */
const missingReasons = forbiddenCoreEdges.filter(
  (e) => CORE_EDGE_REASONS[`${e.from}->${e.to}`] === undefined,
);
if (missingReasons.length > 0) {
  throw new Error(
    "core-boundaries: every forbidden edge needs a reason. Missing: " +
      missingReasons.map((e) => `${e.from}->${e.to}`).join(", "),
  );
}

module.exports = { CORES, SHARED, forbiddenCoreEdges };
