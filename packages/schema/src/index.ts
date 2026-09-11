/**
 * `packages/schema` — the single source of truth for every cross-boundary
 * contract (`ADR-0001` rule 1).
 *
 * M0 STATUS: this is a **placeholder that proves the toolchain**, not the
 * contract set. It exists so that `pnpm build` has something real to compile,
 * so the `apps/web -> packages/schema` workspace link is exercised, and so the
 * dependency rules have an edge to analyse.
 *
 * `PLAN-0001` M1 owns the real contract surface: branded and opaque quantity
 * types, `{value, unit}` parsing, `WorldState`, the event union, the
 * `SolverAdapter` result envelope, and JSON Schema emission for the Python
 * oracle. Do not grow this file into M1's work.
 */
import { z } from "zod";

/** Schema version of every persisted record. Bumped only by a migration. */
export const SCHEMA_VERSION = 1;

/**
 * The `{value, unit}` tuple that every serialized scientific quantity uses
 * (`ADR-0004`). This is the smallest genuine contract in the project, which is
 * why it is the one M0 keeps: it proves zod is wired without pre-empting M1.
 *
 * Note what is deliberately absent — no canonical-unit enforcement, no branded
 * types, no conversion module. A missing unit is *rejected here*; an unknown
 * unit is not yet distinguished, and M1 owns that.
 */
export const QuantitySchema = z.object({
  value: z.number(),
  unit: z.string().min(1),
});

export type Quantity = z.infer<typeof QuantitySchema>;
