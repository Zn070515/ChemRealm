# ADR-0012: M4 domain and equilibrium-constant semantics

- **Status:** **Proposed** — M4 Scientific Domain & Constant Semantics Closure; owner review pending
- **Date:** 2026-09-12
- **Deciders:** Project owner
- **Related:** `SPEC-0001`, `ADR-0003`, `ADR-0007`, `ADR-0011`
- **Blocks:** M4 S3 until the independent reference and oracle evidence is complete

## Context

The first production acid-base adapter exposed three boundaries that must not
be inferred from a numerical result. The model has a declared analytical
solute domain in addition to its converged ionic-strength domain; the pinned
water autoprotolysis constant has a specific thermodynamic definition; and a
root-bracketing failure does not prove that an input is outside the model.

Without an explicit decision, a weak acid with too much total analytical
solute could be accepted because its equilibrium ionic strength is small, a
future non-unit water activity could silently change the meaning of `Kw`, and
an ordinary numerical failure could be reported to a learner as an invalid
chemical system.

## Decision candidate

For the v0 `acidbase-monoprotic-davies@1.0.0` model:

1. The pre-solve analytical total-solute molality is
   `1e-9 <= sum(component amount) / water mass <= 0.5 mol/kg`. This check is
   performed before component aggregation and equilibrium solving. It is not
   replaced by the equilibrium ionic strength check.
2. The pinned thermodynamic water constant is defined as
   `Kw = a_H · a_OH`. The explicit `waterActivity: 1` parameter remains in the
   frozen solver identity to record the unit-water-activity convention, but it
   is not multiplied into the v0 `Kw` equation. A positive non-unit value is
   outside the v0 model and produces a domain refusal when the reduced solver
   is used directly.
3. The production adapter returns `MODEL_OUT_OF_DOMAIN` only for an explicit
   model-domain refusal, including total analytical solute and converged ionic
   strength. Failed inner/outer brackets, iteration limits, invalid numerical
   arguments, and other solver failures return `NOT_CONVERGED` with diagnostics
   and never emit a partial state.

The public `MODEL_OUT_OF_DOMAIN` result continues to include the required
`nearestSupported` descriptor. The internal reduced solver uses a separate
`OUT_OF_DOMAIN` failure tag only for an explicit model-domain condition that
the adapter can map to that public result.

## Alternatives considered

**Use only equilibrium ionic strength as the solute-domain gate.** Rejected:
weak acids can have high analytical total solute while their dissociated ionic
strength remains low.

**Multiply `Kw` by the configured water activity.** Rejected for v0: the pinned
source value is the activity product `a_H · a_OH`; changing the equation would
change the constant convention without changing its source or solver identity.

**Map every bracket failure to `MODEL_OUT_OF_DOMAIN`.** Rejected: failure to
find a bracket can be an algorithm defect for an otherwise valid input and is
therefore a numerical failure, not an assertion about chemistry.

## Consequences

- Domain reasons are actionable and distinguish analytical input limits from
  equilibrium-state limits.
- `waterActivity` remains auditable in replay identity without pretending that
  the v0 solver implements a non-unit-water activity model.
- Numerical diagnostics cannot be mistaken for a scientific refusal.
- A future non-unit water-activity model requires a new constant convention,
  source record, versioned identity, and independent validation.

## Acceptance evidence required

- weak-acid requests at `0.6 mol/kg` and `1e-12 mol/kg` are refused for total
  analytical solute before solving;
- the default solve satisfies `a_H · a_OH = Kw`, while a non-unit water
  activity is refused and does not produce a state;
- direct bracket/iteration failure fixtures return `NOT_CONVERGED`, and no
  obsolete bracket-specific status remains in production code or evidence;
- the M4 acceptance packet records this candidate decision separately from the
  still-pending REF-1…REF-10 and PHREEQC evidence.

## Open questions

Owner acceptance of this proposed scientific boundary amendment remains open
until the M4 independent-reference and PHREEQC evidence packet is complete.
