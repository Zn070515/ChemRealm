/**
 * `@chemrealm/schema` — the SINGLE SOURCE OF TRUTH for every cross-boundary
 * contract (`ADR-0001` rule 1).
 *
 * No other package defines a persisted or wire shape. zod schemas are authored
 * here; `json-schema.ts` emits JSON Schema so the Python side validates against
 * the same contract rather than hand-mirroring types.
 *
 * AUTHORITY ORDER when documents disagree:
 *
 *   1. `docs/science/quantity-ontology.md` — what a quantity MEANS
 *   2. `docs/specs/SPEC-0001-*.md` — the system's behaviour
 *   3. `docs/adr/` — why the representation looks like this
 *   4. this package — how it is represented
 *
 * A disagreement is a defect in this package, not a reason to update the
 * ontology.
 *
 * WHAT IS DELIBERATELY ABSENT: no solver, no reducer, no arithmetic beyond unit
 * conversion, no I/O. This package describes shapes; the cores give them
 * behaviour. `packages/sci` must not be importable from here, and neither must
 * anything else — `schema` is a leaf (`.dependency-cruiser.cjs`).
 */

export * from "./units.js";
export * from "./quantity.js";
export * from "./scientific.js";
export * from "./world.js";
export * from "./events.js";
export * from "./commands.js";
export * from "./content.js";
export * from "./volume-profile.js";
export * from "./canonical-hash.js";
export * from "./export.js";
export * from "./migrate.js";
export * from "./scenario-migrate.js";
export * from "./json-schema.js";
