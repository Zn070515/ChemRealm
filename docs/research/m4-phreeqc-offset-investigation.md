# M4 PHREEQC Offset Investigation

> **Status:** S2 scientific investigation; no causal attribution or M4 S3
> acceptance claim.

## Question

The checked-in PHREEQC oracle sweep is within the declared `±0.02` pH
comparison envelope, but all ten signed differences have the same direction:

```text
TS model pH − PHREEQC model pH > 0
```

That pattern is evidence of a systematic-offset candidate. It is not evidence
that either implementation is the universal truth, and it is not enough to
choose a solver, average the results, or widen the tolerance.

## Disposition

The report records the following bounded-evidence disposition:

```text
code: bounded-offset-no-equivalence-claim
causalAttribution: not-isolated
decision: retain-independent-models-and-report-bounded-disagreement
parameterTuning: prohibited
```

M4 may use the verified executable/database and the signed, in-tolerance
comparison as an independent-oracle gate. It does **not** treat PHREEQC as a
replacement for the selected TypeScript model, average the two outputs, or
tune constants to remove the offset. A causal scientific explanation requires
the controlled one-factor variants listed below and remains follow-up work.

## Current observation

The report records the signed difference for every `ORACLE-*` point and keeps
the pre-/at-/post-equivalence labels. It also records `attributionStatus:
not-isolated`. The current sweep does not change one scientific convention at a
time, so its result cannot identify a unique cause.

## Factor matrix

| Factor | Current comparison | Disposition | Next controlled check |
|---|---|---|---|
| Equilibrium constants | TypeScript pins `Kw` and `Ka` from the constants record; the PHREEQC input pins acetate `log_k` and also uses database water chemistry | Partially aligned | Use the same serialized `Kw`, `Ka`, and water-activity convention in a paired case |
| Activity coefficients | TypeScript uses the pinned Davies `A/b`; PHREEQC uses the selected database/toolchain activity convention | Not aligned | Run an activity-off or matched-activity variant with totals and constants unchanged |
| Species representation | TypeScript uses the model-owned `HOAc/OAc-` family; PHREEQC uses `HAcetate/Acetate-` master species | Not identical | Run a PHREEQC input with explicitly matched species bookkeeping and compare species totals as well as pH |
| Water activity | TypeScript has an explicit v0 unit-water-activity assumption; PHREEQC receives `water 1` and may apply its own treatment | Not isolated | Hold all solute totals fixed while varying only the water-activity convention |
| Basis and total definition | Both runners construct mol/kg-water totals and combine HOAc/NaOAc into one acetate family | Aligned for the current fixtures | Retain mass-balance assertions for every future variant |

The `aligned` row is a control, not a claim that the engines are equivalent.
The non-aligned rows identify what must be controlled before a causal statement
is allowed.

## Acceptance boundary

The current report may pass its numerical tolerance only with all of the
following visible:

- signed per-point differences;
- classification as a systematic-offset candidate when all signs agree;
- `attributionStatus: not-isolated` until a controlled experiment isolates a
  factor;
- the explicit `bounded-offset-no-equivalence-claim` disposition;
- the factor matrix and next control for each factor;
- an explicit statement that tolerance pass does not establish equivalence.

The controlled one-factor variants are a post-M4 scientific follow-up in the
current disposition, not an M4 S3 prerequisite. They remain required before
any claim of model equivalence or causal attribution. If the owner later makes
that investigation an M4 gate, M4 must remain S2 until the variants are run;
the bounded-offset disposition must not be silently upgraded.
