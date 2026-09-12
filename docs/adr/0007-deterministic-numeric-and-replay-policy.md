# ADR-0007: Deterministic numeric and replay policy

- **Status:** **Accepted** — owner, 2026-09-11 (baseline `8310c685`)
- **Deferred decisions:** see the ADR's own `## Open questions` / `## Open decisions`;
  acceptance covers the decision, not the deferred sub-questions.
- **Date:** 2026-09-11
- **Deciders:** Project owner
- **Related:** `GOAL.md` §5.2, §5.4, §14; `CLAUDE.md` §4.6, §9; `AGENTS.md` §8;
  `ADR-0002`; `ADR-0003`; `SPEC-0001`; `spikes/numeric-policy`
- **Blocks:** `PLAN-0001` M2, M4, M8
- **Supersedes:** the original ADR-0007 of the same date

## Context

`GOAL.md` §5.4 requires deterministic replay, and `AGENTS.md` §8 makes a replay
failure a release blocker.

The original version of this ADR put reproducibility *first* and constrained the
scientific hot path to `+ - * /` in order to avoid implementation-approximated
transcendental functions. **That was the wrong ordering, and it distorted the
chemistry.** An activity model needs `sqrt` and `exp`; banning them to protect a
hash is letting a convenience constraint dictate a physical model. Owner review
(P1-2) correctly rejected this.

The investigation that replaces it produced four measured facts
(`spikes/numeric-policy`), which are the real basis for this ADR:

**1. `Math.sqrt` is not in the same category as `Math.log`.** The ECMAScript
specification changed in July 2024: `Math.sqrt` was removed from the
"implementation-approximated" set and now carries a correctly-rounded
requirement, because every engine ships WebAssembly's `f64.sqrt` and IEEE 754-2019
specifies `squareRoot` exactly. `Math.log`, `Math.pow`, and `Math.exp` **remain
implementation-approximated**, under the same NOTE that recommends but does not
require fdlibm-derived algorithms. Measured on 1861 inputs spanning 1e-300 to
1e300: `Math.sqrt` error **0.000 ulp** — correctly rounded.

**2. In V8, `Math.log10` and `Math.pow(10,x)` are also correctly rounded**
(0.500 and 0.000 ulp measured). But the spec does not require it, and this spike
can only test V8. "Correctly rounded in the engine we tested" is not a
cross-engine guarantee.

**3. A deterministic implementation is feasible.** `detLog10` and `detExp10`
built only from `+ - * /` and exactly-specified integer operations are
bit-identical on every conforming engine by construction. The accepted
reference suite measures no more than 1.5 ulp for `detLog10` over its normal
positive-double domain and no more than 1.5 ulp for `detExp10` in the validated
Davies call band `[-0.137, 0]`. The lower bound conservatively covers the
minimum of the fixed v0 Davies curve (about `-0.136125` at `Î ≈ 0.395`). The
wider exp10 sweep is deliberately outside the public domain and is refused.

**4. Independent quantization of species breaks conservation.** 100-step serial
transfer of 0.1 mol, 500 trials: quantizing the **transfer amount** once gives
1.39e-15 relative drift; quantizing each **vessel independently** gives 4.00e-12
— ~3000× worse. The original policy quantized derived quantities independently
and would have shipped this defect.

## Decision

**Priority order, which resolves every conflict below:**

> 1. scientific correctness — 2. numerical stability — 3. reproducibility —
> 4. bitwise/hash convenience

Reproducibility is pursued *within* whatever the correct model requires. It never
chooses the model, and it never simplifies the physics.

### 1. Transcendental functions are permitted where the model needs them

The hot path may use `sqrt`, `log10`, and `exp`. Nothing in this policy forbids a
mathematical operation that the physical model requires.

### 2. `Math.sqrt` is used directly; `Math.log10` and `Math.pow`/`Math.exp` are not

| Operation | Policy | Basis |
|---|---|---|
| `Math.sqrt` | **Permitted, used directly** | Correctly rounded per the July 2024 spec change; measured 0.000 ulp |
| `Math.log10` | **Shipped as `detLog10`** | Spec-permitted engine variation; measured 1.5 ulp |
| `Math.exp` / `Math.pow(10,x)` | **Shipped as `detExp10`** | Same; measured 1.5 ulp in the validated Davies domain |

The deterministic implementations live in `packages/sci/src/deterministic-math.ts`,
are covered by tests against arbitrary-precision references, and are the only
permitted route to these functions inside `packages/sci` and `packages/world`.
A lint rule bans the native calls there.

**Honest statement of the trade:** `detLog10` at 1.5 ulp is *less accurate in V8*
than the native `Math.log10` at 0.5 ulp. We accept a measured 1 ulp of accuracy
loss to obtain engine-independence. That is the correct trade under the priority
order — 1 ulp is nine orders of magnitude below the ±0.02 pH tolerance — but it
is a real trade and is recorded as one.

**Domain restriction is mandatory.** `detExp10` is publicly validated only for
the Davies activity-coefficient band `[-0.137, 0]`. Its two-part Cody–Waite
reduction is implemented at M4, but the wider former spike sweep is not part of
the accepted domain until it has its own reference measurement. Calls outside
the domain must refuse rather than silently degrade, and activity-model call
sites must assert the domain before invoking it.

### 3. Canonical state stores independent quantities, never derived ones

This is the fix for finding 4, and it changes the state model.

Three distinct levels, never conflated:

| Level | Contents | Quantized? | Purpose |
|---|---|---|---|
| **Solver state** | full speciation, unquantized float64 | no | validated against conservation |
| **Canonical state** | **independent** amounts (`n_i`, mol) and water mass (`m_w`, kg), plus world structure | yes | persisted; defines replay equality |
| **Derived science** | molalities, activities, `γ`, `I`, `pH`, species | recomputed | never persisted as truth |

**Species concentrations, activities, and ionic strength are derived and are
never quantized independently.** Quantizing them separately is what accumulates
drift, because each rounding is an independent error that no constraint corrects.

A transfer's volume is canonicalized at the event boundary. For each conserved
independent quantity, the reducer then computes its pre-transfer delta and
quantizes that delta **once**, applying the same value as an exact zero-sum
update: `d = quantize(n_source * fraction); n_source -= d; n_target += d`.
Water mass uses the same rule. Measured drift is 1.39e-15 over 100 transfers,
indistinguishable from the unquantized float baseline of 1.25e-15.

Quantization remains `Number(v.toPrecision(12))`. `toPrecision` is
algorithmically specified for exact decimal conversion and is deterministic.

**Residual risk, stated rather than hidden.** Quantization is a bound, not a
proof. If a value lands within ~1 ulp of a 12th-digit rounding boundary, two
engines could quantize it differently. The margin is large — measured
cross-implementation divergence is ≤1.5 ulp (≈3e-16 relative) against a
quantization resolution of 1e-12 relative, roughly four orders of magnitude — so
the condition requires an essentially exact tie. Were it to occur, the
consequence is one unit in the 12th significant digit, far below any display
precision, and it surfaces as a loud hash mismatch rather than a silent wrong
answer. **An accepted, bounded risk, not an impossibility** (`SPEC-0001` failure
mode 11).

### 4. Conservation tolerances, stated per level

| Level | Quantity | Tolerance | Measured |
|---|---|---|---|
| Solver state (unquantized) | charge balance | ≤ 1e-14 relative | 1.39e-17 mol/kg |
| Solver state (unquantized) | element / mass balance | ≤ 1e-15 relative | 0.00e+00 mol/kg |
| Canonical state (quantized) | amount / mass conservation | ≤ 1e-13 relative over 100 transfers | 1.39e-15 |
| Canonical state | **design guard** | the "quantize each vessel independently" strategy **must fail** the above | 4.00e-12 |

The threshold is chosen to sit two orders of magnitude above the correct strategy
and one order below the incorrect one — so it passes the design we want and fails
the design we do not. That regression test is a required acceptance criterion
(`SPEC-0001` AC-R9), because the defect it catches is invisible in any single
step and only appears after accumulation.

**The original policy's conservation criterion contradicted its own
quantization rule.** Both are now derived from the same fact — derived quantities
are never quantized — so they cannot disagree.

### 5. Exact state hash

Two hashes, with different jobs:

```
replayHash  = SHA-256( canonicalJson( ReplayIdentityProjection ) )
scienceHash = SHA-256( canonicalJson( quantized( derivedScience ) ) )
```

- **`replayHash`** covers an explicit replay-identity projection. Solver
  configuration, genesis snapshot, provenance, structure, lineage, and IDs are
  exact; only canonical independent runtime quantities are quantized. It
  defines replay equality and persistence identity. A mismatch means the
  *inputs* diverged — the strongest possible signal, and it is what the event
  log is folded against.
- **`scienceHash`** covers derived observables and is a **verification artifact**.
  It is what detects a solver regression, since derived values are recomputed
  rather than replayed (`ADR-0002`). It is not persisted as truth.

`canonicalJson` sorts keys, uses the specified shortest round-trip number
formatting, and must additionally:

- **normalize `-0` to `0`** — IEEE 754 distinguishes them and a sign that appears
  or vanishes depending on which side of a subtraction a value landed on would
  silently change a hash;
- **reject `NaN` and `±Infinity`** rather than serializing them.

Excluded from both hashes: wall-clock, the present cursor position, visual and
animation state, camera, hover, and any presentation clock.

### 6. Replay equality, precisely

| Scope | Requirement |
|---|---|
| Same engine, same version, same config | **Bit-identical** canonical and derived state. |
| Different engines | Equal after quantization, for both hashes, because every transcendental in the hot path is our own deterministic implementation. |
| Different solver id or version | **Not required to match**, and the runtime must refuse to treat them as equivalent rather than silently substituting (`ADR-0003`, `ADR-0008`). |

The cross-engine row is now a *stronger* claim than the original policy made,
which is a direct consequence of putting correctness first: deriving the physics
properly is what made engine-independence provable rather than hoped for.

### 7. Randomness

- No randomness in v0.
- If introduced, it must be a seeded PRNG whose algorithm and seed are in the
  genesis event, with stream position derivable from the event sequence.
  `Math.random()` is banned in `packages/sci`, `packages/world`, `packages/ace`.
- **Visual-only stochastic animation does not participate in world truth.** The
  *presence* and *rate* of a visual effect are scientific state and deterministic;
  frame-level flicker is presentation state and is excluded from both hashes.

### 8. Model parameters are part of replay identity

`Kw`, `Ka`, the Davies `A` and `b`, `γ_neutral`, the activity model choice, and
the quantization precision are recorded in the genesis event. A reference case
that changes `Ka` is a different world.

## Alternatives considered

**Keep the `+ - * /`-only constraint and simplify the chemistry to fit it.**
Rejected by owner review, correctly. This is the pattern the priority order
forbids: a convenience constraint selecting a physical model.

**Use native `Math.log10` and accept cross-engine drift.** Rejected. The drift
would be ~1 ulp *here*, but it is unspecified, and `GOAL.md` §5.4 requires replay
as a product capability, not a best effort on the developer's machine.

**Use native `Math.log10` plus a tolerance-based "approximately equal" hash.**
Rejected as the primary mechanism: approximate equality makes it impossible to
say whether a divergence is a bug or expected drift. Retained as a *diagnostic*
that reports how far apart two states are when a hash mismatches.

**Quantize everything, including species, and define conservation on the
quantized state.** Rejected on measurement: 4.00e-12 drift, accumulating, with
no mechanism to correct it.

**Verify correctness against a higher-precision reference and skip quantization
entirely.** Rejected. Quantization exists so the *hash* is meaningful; without
it, a hash mismatch cannot distinguish a real divergence from ulp noise.

## Consequences

### Positive
- The scientific model is chosen for correctness, and reproducibility is achieved
  *within* it rather than by constraining it.
- Engine-independence is stronger than before, because it rests on our own
  deterministic implementations rather than on engine behaviour.
- The quantization policy and the conservation criterion are now derived from one
  fact, so they cannot contradict each other.
- Conservation is measured, not asserted, and the wrong design is caught by a
  regression test.

### Negative
- ~1 ulp of accuracy is traded for engine-independence in `log10`/`exp`.
- `detExp10` remains domain-restricted to the measured Davies band; widening it
  requires a new reference-vector and evidence review.
- Replay-identity canonical state is quantized in its explicit identity
  projection; transfer deltas are quantized once and applied zero-sum. Missing
  either boundary is a silent defect, so each rule needs a test rather than
  vigilance.
- `detLog10`/`detExp10` are code we own, test, and must maintain. The alternative
  was depending on unspecified engine behaviour.

### Neutral
- 12 significant digits remains a judgement, now with a measured basis (four
  orders of magnitude above the 1 ulp divergence) rather than an assumption.

## Reversibility

**Hard in one direction, easy in the other.** Quantization precision, hash
composition, and the canonical/derived split are persisted-format properties;
changing them invalidates every existing hash and reference case.

Adopting native `Math.log10` later would be *easier* than the current policy, and
would only be justified if every engine the product supports were verified
correctly rounded — which is not a property we can rely on from the spec.

## Open questions

1. Is 1.5 ulp acceptable for `detLog10`, or is a better polynomial warranted?
   **Leaning: acceptable.** It is nine orders of magnitude below the pH tolerance,
   and the alternative is engine-dependent behaviour. Revisit only if a future
   model amplifies `log10` error.
2. Should `scienceHash` be recomputed on every replay in production, or only in
   tests? **Leaning: tests and on-demand diagnostics**, not on every load, since
   the canonical hash is what replay equality needs. Confirm at M8.
