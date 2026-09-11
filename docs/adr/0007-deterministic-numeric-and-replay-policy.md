# ADR-0007: Deterministic numeric and replay policy

- **Status:** Proposed
- **Date:** 2026-09-11
- **Deciders:** Project owner
- **Related:** `GOAL.md` §5.2, §5.4, §14; `CLAUDE.md` §4.6, §9; `AGENTS.md` §8; `SPEC-0001`
- **Blocks:** `PLAN-0001` M2, M4, M8

## Context

`GOAL.md` §5.4 requires deterministic replay. `AGENTS.md` §8 makes replay a
release blocker for affected features. `ADR-0002` defines replay as: same genesis
world, same event sequence, same schema version, same solver configuration →
same state hash at every committed event boundary.

That definition is not achievable with ordinary floating-point code, for two
independent reasons.

**Reason 1 — ECMAScript does not guarantee transcendental results.**
`+`, `-`, `*`, `/` and comparisons are IEEE-754 binary64 with round-to-nearest
and are exactly reproducible. But `Math.log`, `Math.pow`, `Math.exp`, `Math.cbrt`,
and their relatives are specified as *implementation-approximated*: the standard
permits engines to differ. V8, SpiderMonkey, and JavaScriptCore may return
values differing in the last unit in the last place. A solver that computes pH as
`-Math.log10(h)` and feeds it back into a subsequent calculation is therefore not
reproducible across browsers.

For a chemical world this is not hypothetical. The natural formulation of
acid-base equilibrium is in pH space, where `Ka = 10^-pKa`, and the natural
Henderson–Hasselbalch form is `pH = pKa + Math.log10(ratio)`. An implementation
written the obvious way hits implementation-approximated functions on every
step.

**Reason 2 — float accumulation and comparison are fragile.** Two runs that
differ in the last bits will compare unequal, and if any control flow branches on
such a comparison, the divergence becomes macroscopic rather than staying
sub-ulp.

## Decision

**The scientific hot path uses only exactly-specified IEEE-754 operations.
Scientific state is quantized before it enters the world. Replay equivalence is
defined over quantized state.**

### 1. Solve in concentration space, never in pH space

The equilibrium solve is expressed entirely in `[H⁺]`:

```
f([H+]) = C_B + [H+] - Kw/[H+] - C_A*Ka/(Ka + [H+]) = 0
```

Solved by bracketed bisection, which uses only `+ - * /` and comparisons. No
`pow`, no `log`, no `sqrt` in the root-find. `Ka` is stored as a value
(e.g. `1.8001e-5`), never as a pKa from which `10^-pKa` must be computed.

This is not a compromise on rigour: the spike shows bisection reproduces an
independent closed form to better than 0.0001 pH, and the formulation is *more*
robust than the Henderson–Hasselbalch approximation it replaces, which diverges
by 0.65 pH at 1e-6 M.

### 2. Ratios, not logarithms, at the observable boundary

The indicator response is `[In⁻]/[HIn] = Ka_in / [H⁺]` — one division. The
colour model consumes that ratio directly. No `log10` is needed to decide how
pink the solution is, which is chemically correct: the ratio *is* the governing
quantity, and pH is a derived presentation of its negative logarithm.

### 3. Transcendental functions only in the presentation layer

`Math.log10` is permitted for *displaying* a pH number and for *drawing* axis
labels. It is downstream of the quantized scientific state, and its output is
never written back into the world. This is a bright line: a `Math.log10` call in
`packages/sci` or `packages/world` is a defect.

### 4. Quantize state at the world boundary

Every scientific quantity is quantized **before** it enters `WorldState`:

```ts
const QUANTUM = 12;   // significant decimal digits
quantize(v) = Number(v.toPrecision(QUANTUM));
```

Rationale: implementation-approximated operations still occur in the boundary
correction (the Davies equation needs `sqrt(I)`), and their worst-case error is
~1e-16 relative. Rounding to 12 significant digits (relative resolution 1e-12)
absorbs four orders of magnitude of headroom. `toPrecision` is algorithmically
specified by ECMAScript for exact decimal conversion and is deterministic.

**Stated honestly: this is not a mathematical proof.** If a value lands within
~1e-16 relative of a 12th-digit rounding boundary, a cross-engine ulp difference
could flip it. This is an accepted residual risk, for three reasons: it requires
an exact tie; its consequence is one unit in the 12th significant digit, far
below any display precision; and it surfaces as a loud hash mismatch in tests
rather than as a silent wrong answer.

### 5. Replay equivalence, precisely stated

| Scope | Requirement |
|---|---|
| Same engine, same version, same config | **Byte-identical** quantized state at every boundary. |
| Different engines, same config | Equal after quantization, modulo the documented tie exception in §4. |
| Different solver id or version | **Not required to match.** The runtime must refuse to treat them as equivalent, not silently substitute. |

The third row is the one most likely to be violated by a well-meaning future
change. Swapping the solver under an existing world must fail loudly.

### 6. State hash definition

```
stateHash = SHA-256( canonicalJson( {
  schemaVersion,
  solverConfig: { id, version, parameters },
  world: <structural state: vessels, apparatus, attachments>,
  science: <quantized species amounts, concentrations, T, P>
} ) )
```

Excluded from the hash, by construction:

- wall-clock timestamps and any `Date` value;
- visual state, animation state, camera, hover, focus;
- the current `sequence` pointer and the branch's present position;
- any renderer or presentation clock (`ADR-0006`).

`canonicalJson` sorts object keys and fixes number formatting, so that two
structurally identical states hash identically regardless of construction order.
It must additionally:

- **normalize `-0` to `0`.** IEEE-754 distinguishes them; `Object.is(-0, 0)` is
  false, and a sign that appears or disappears depending on which side of a
  subtraction a value landed on will silently change a hash. This is a real and
  easily-missed source of replay divergence.
- **reject `NaN` and `±Infinity`** rather than serializing them. A non-finite
  value reaching world state is a solver defect, and it should fail at the
  boundary rather than produce a stable-looking hash of `null`.
- **serialize numbers via the shortest round-trip representation**, which
  ECMAScript specifies exactly, rather than via any locale- or
  precision-formatted string.

### 7. Randomness

- **There is no randomness in v0.** No Monte Carlo, no stochastic kinetics.
- If randomness is ever introduced, it must be a seeded PRNG whose *algorithm
  and seed* are recorded in the genesis event, and whose stream position is
  derivable from the event sequence. `Math.random()` is banned in
  `packages/sci`, `packages/world`, and `packages/ace`.
- **Visual-only stochastic animation does not participate in world truth.** A
  bubbling animation may flicker nondeterministically; the *presence* and *rate*
  of gas evolution are scientific state and are deterministic. This split is
  mandatory and testable.

### 8. Model parameters are part of replay identity

`Kw`, `Ka` values, the Davies `A` parameter, the activity model choice, and the
quantization precision are all recorded in the genesis event's solver
configuration. A reference case that changes `Ka` is a different world.

## Alternatives considered

**Use `Math.log`/`Math.pow` freely and accept cross-engine drift.** Rejected.
It makes `GOAL.md` §5.4 unachievable and would mean replay tests pass only on the
developer's machine — the exact "tests pass for the wrong reason" failure in
`CLAUDE.md` §16.

**Arbitrary-precision decimal arithmetic throughout.** Rejected. Ten to a
hundred times slower, and it does not actually remove the problem: `sqrt` and
`log` in an arbitrary-precision library are also approximations, just different
ones. Quantization solves the real requirement — reproducible *accepted* state —
at a fraction of the cost.

**Pin one browser engine and declare determinism only there.** Rejected. Users
have many browsers, and `GOAL.md` targets Chinese high-school students on
whatever device they own. A determinism guarantee that depends on the user's
browser is not a guarantee.

**Hash raw doubles and accept that cross-engine replay fails.** Rejected. It
destroys the reproducible-bug-report and counterfactual-comparison use cases that
`GOAL.md` §5.4 names as core.

**Compute a tolerance-based "approximately equal" instead of a hash.** Rejected
as the *primary* mechanism: approximate equality makes it impossible to say
whether a divergence is a bug or expected drift. Retained as a *diagnostic* when
a hash mismatch occurs, to report how far apart two states are.

## Consequences

### Positive
- Determinism is a property of the formulation, not of a lucky test environment.
- The solve is more robust than the textbook approximation it replaces, so
  determinism costs nothing in accuracy — it improves accuracy.
- Bug reports become reproducible across machines, which is what makes the
  event-sourcing investment in `ADR-0002` pay off.

### Negative
- The solver's shape is constrained by the numeric policy: no `pow` in the hot
  path, which rules out some otherwise-natural formulations (e.g. solving in pH
  space, or using `10^-pKa` directly).
- Every quantity crossing into world state needs an explicit quantization call.
  Missing one is a silent replay defect, so this needs a test rather than
  vigilance.
- 12 significant digits is a judgement. It is documented and is part of solver
  configuration, but it is a choice, not a derivation.

### Neutral
- pH display precision must be derived from the model tolerance in `ADR-0003`
  (≈0.02 pH), not chosen for looks. The UI must not show more decimals than the
  model can justify — otherwise the product commits the `GOAL.md` §5.2
  "precise-looking numbers" error in the presentation layer.

## Reversibility

**Hard.** Quantization precision and hash composition are persisted-format
properties. Changing them invalidates every existing state hash and every saved
reference case. This is precisely why it is an ADR written before any code.

The *safe* direction of change is making the policy stricter, not looser.

## Open questions

1. Is 12 significant digits the right precision? Too high fails to absorb
   cross-engine drift; too low loses real precision. **Leaning: 12, validated at
   M2 by a test that solves the same case under both an exact-op path and a
   perturbed path and asserts the quantized results match.** Owner confirmation
   not required unless the M2 test fails.
2. Does the titration curve need its own quantization policy? Individual points
   are quantized states, but the *curve* is a sequence and a future smoothing or
   interpolation step would introduce new numerics. **Leaning: the observable
   layer owns curve interpolation and it never writes back to the world, so it is
   outside replay identity.** Confirm at M5.
3. Should the state hash include a hash of the *event log* as well as the
   resulting state? Including both detects divergence earlier; including only
   state keeps the hash smaller. **Leaning: state hash only, with the event log
   separately hashed for integrity.** Confirm at M8.
