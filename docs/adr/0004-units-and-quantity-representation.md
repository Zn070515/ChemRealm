# ADR-0004: Units and quantity representation

- **Status:** **Accepted** — owner, 2026-09-11 (baseline `8310c685`)
- **Deferred decisions:** see the ADR's own `## Open questions` / `## Open decisions`;
  acceptance covers the decision, not the deferred sub-questions.
- **Date:** 2026-09-11
- **Deciders:** Project owner
- **Related:** `GOAL.md` §12; `CLAUDE.md` §8.2; `AGENTS.md` §9, §19;
  `docs/science/quantity-ontology.md`; `ADR-0003`; `ADR-0007`; `SPEC-0001`
- **Blocks:** `PLAN-0001` M1, M3, M5
- **Supersedes:** the original ADR-0004 of the same date

## Context

Two findings from owner review invalidated parts of the original version.

**P1-3 — the ontology was too coarse.** The original treated "concentration" and
"ionic strength" primarily as `mol/L`, while the project claimed a thermodynamic
activity model on the molality basis and planned PHREEQC validation in molality.
Molarity, molality, and activity are three different quantities, and ionic
strength has a *basis*. At this slice's concentrations the discrepancy is ~0.2 %
— invisible against a ±0.02 pH tolerance, which is exactly what makes it
dangerous, because it would survive every test here and fail at higher
concentration or against PHREEQC.

**P1-4 — the branded-type guarantee was overstated.** The original claimed that
`type Mol = number & Brand` makes unit-mixing and pH-averaging "unavailable".
That was tested by compilation, not assumed. Result
(`spikes/numeric-policy`, `brands_number.ts`):

```
error TS2578: Unused '@ts-expect-error' directive.   (lines 47, 50, 53)
```

All three arithmetic claims were **false**. `molA + litreB`, `molA + molA`, and
`(pH₁ + pH₂) / 2` all compile under branding. Branding blocks the *assignment* of
a bare number to a quantity, and blocks cross-unit assignment, and prevents
storing an arithmetic result back as a quantity — but it does not block the
arithmetic. `a + b` is legal TypeScript whose type is simply `number`.

The same spike showed that an **opaque** representation does block it
(`brands_opaque.ts`, exit 0, every directive used).

The domain needs a small closed set of quantities. For this slice: amount,
mass, volume, length, molality, molarity, temperature, pressure, time, activity,
activity coefficient, ionic strength (two bases), mole fraction, and pH.

## Decision

**`docs/science/quantity-ontology.md` is the authoritative definition of every
scientific quantity.** This ADR governs how those quantities are *represented*,
not what they mean. Where the two disagree, the ontology wins and this ADR is
wrong.

### 1. Canonical internal units

| Quantity | Canonical unit | Type |
|---|---|---|
| amount | mol | `Mol` |
| mass of water | kg | `Kilogram` |
| volume | L | `Litre` |
| **length (geometry)** | **mm** | `Millimetre` |
| molality | mol/kg water | `MolPerKilogram` |
| **reduced molality** | **dimensionless** | `ReducedMolality` |
| molarity | mol/L solution | `MolPerLitre` |
| temperature | K | `Kelvin` |
| pressure | kPa | `Kilopascal` |
| time | s | `Second` |
| activity | dimensionless | `Activity` |
| activity coefficient | dimensionless | `ActivityCoefficient` |
| ionic strength (molality basis) | mol/kg | `IonicStrengthMolal` |
| ionic strength (molarity basis) | mol/L | `IonicStrengthMolar` |
| **reduced ionic strength** | **dimensionless** | `ReducedIonicStrength` |
| mole fraction | dimensionless | `MoleFraction` |
| pH | dimensionless | `Ph` |
| **equilibrium constant (thermodynamic)** | **dimensionless** | `ThermodynamicConstant` |

**`ThermodynamicConstant` is its own type, not a `number` and not an
`Activity`** (added 2026-09-11). The ontology names three kinds of equilibrium
constant that must never be interchanged and calls storing one as another
anti-pattern 5: a *thermodynamic* `Ka`/`Kw` is a property of the configuration,
while a *conditional* one is derived inside the equilibrium loop at a converged
ionic strength. With both as `number`, storing one where the other belongs is an
assignment TypeScript accepts and nothing else catches. Strictly positive —
`Ka = 0` is not a state, and `log10 Ka` is undefined there.

**Dimensionless quantities carry the unit ONE when serialized** (added
2026-09-11). Seven of the rows above are dimensionless — reduced molality,
activity, activity coefficient, reduced ionic strength, mole fraction, pH, and
`Ka`/`Kw`. Rule 3 below says a serialized quantity always carries its unit, and
a dimensionless quantity has none, so the first version of this ADR offered no
way to serialize one except as a bare number: the first exception to the rule,
and one that would have left `quantityOfDimension` unable to constrain them at
all.

The resolution is ISO 80000's unit one: `"1"` is registered as the canonical
unit of a `dimensionless` dimension, so every quantity crosses a boundary as
`{ value, unit }` without exception. `{"value": 0.7815, "unit": "1"}` is an
activity coefficient; `{"value": 0.7815, "unit": "mol/kg"}` is a molality. The
contract can now tell those apart, and before this it could not.

**Two bases for ionic strength are separate types, not one.** The numeric
difference between them is under tolerance, so a mix-up would be *invisible at
runtime*. That is precisely when the compiler must carry the distinction, because
no test will.

**Length is a length.** A geometry coordinate is not a volume; the original
"one world unit = one millilitre" statement was a dimensional error (finding
P2-1). Vessels expose a volume profile `V(h)` and its inverse instead. Corrected
in `docs/visual/apparatus-standard.md`.

### 2. Two representations, chosen by whether arithmetic is meaningful

This is the corrected answer to P1-4, further corrected in round 2 (finding
P2-1) for *how the split is drawn*.

**The criterion is not "is arithmetic allowed".** The first version of this
section put activity, activity coefficient, mole fraction, and ionic strength in
a "no arithmetic" bucket on the grounds that arithmetic on them is
"conceptually wrong". That is false, and following it would have produced a type
system that blocks legitimate physics:

| Quantity | Legitimate operations | Undefined operations |
|---|---|---|
| activity | `×`, `÷`, ratio (`Ka = a_H·a_A/a_HA`) | `+` |
| activity coefficient | `×`, `÷`, `log10` (`γ_H·γ_A`) | `+` |
| mole fraction | `+` (Σx = 1), ratio | `×` |
| ionic strength | `+`, `× scalar`, compare within one basis | compare across bases |
| pH-like | compare, **difference** (ΔpH is meaningful) | average, sum, scale |

The right question is **which operations have defined physical meaning**, and
the representation should expose those and withhold the rest. That is a
*controlled quantity algebra*, not a ban on arithmetic.

**Two type mechanisms, chosen by which is cheaper to get right:**

**Opaque types + named operations.** Raw operators are a compile error; the
defined operations are supplied by name.

```ts
declare const actBrand: unique symbol;
export interface Activity {
  readonly [actBrand]: true;
  readonly value: number;
}
export function multiplyActivity(a: Activity, b: Activity): Activity;
export function ratioActivity(a: Activity, b: Activity): number;
```

Used for: `Ph`, `TeachingHydrogenIonExponent`, `Activity`,
`ActivityCoefficient`, `IonicStrengthMolal`, `IonicStrengthMolar`,
`ReducedIonicStrength`, `MoleFraction`, `ReducedMolality`.

`TeachingHydrogenIonExponent` is `−lg c(H⁺)`, the syllabus quantity. It is opaque
and separate from `Ph` because they are different numbers for the same solution
(1.0000 vs 1.1064 at 0.1000 mol/L HCl), and `SPEC-0001` AC-S9 requires them not
to be assignable. `ReducedMolality` and `ReducedIonicStrength` are here rather
than in the branded list because the whole point of the m° convention is that a
reduced quantity must not be interchangeable with its dimensioned counterpart,
and brands cannot express that: `m° = 1` makes them numerically identical.

Opaque is right here because the *set* of legal operations is small, specific, and
easy to get wrong — `averagePh(p1, p2)` must not exist, while
`differencePh(p1, p2)` must. Verified by compilation: `p1 + p2` and `p1 / 2` are
both type errors, so an undefined operation cannot be written at all, and a
defined one is visible by name at every call site.

**Branded numbers — arithmetic is legal, and the guarantee is stated honestly.**

```ts
export type Mol = number & { readonly __unit: "mol" };
export type Litre = number & { readonly __unit: "L" };
```

Used for: `Mol`, `Gram`, `Kilogram`, `Litre`, `Millimetre`, `MolPerKilogram`,
`MolPerLitre`, `Kelvin`, `Kilopascal`, `Second`, `KilogramsPerMol`,
`KilogramsPerLitre`, `GramsPerMol`.

`Gram`, `GramsPerMol` and `KilogramsPerLitre` are not canonical units — those
are `Kilogram`, `KilogramsPerMol` and `KilogramsPerLitre`. They exist because a
scenario declares a reagent's molar mass in `g/mol` and its density in `kg/L`,
and the resolver must convert before it can call `molalityToMolarity`. The
conversion module is where that happens, so it needs both ends as types.

**This list and the one above fell out of step with §1 during rounds 4 and 5**,
which added `ReducedMolality`, `ReducedIonicStrength` and the molar-mass types
to the table but not here. An audit of M1 against these documents is what found
it. If the two disagree, §1 is authoritative and these lists are wrong.

Branding is chosen here because arithmetic **is** meaningful for these
quantities — adding two volumes is legitimate, scaling a mass is legitimate — so
blocking it would be wrong, not safe. What branding actually provides, verified:

- a bare `number` cannot be assigned to a quantity type;
- a `Mol` cannot be assigned to a `Litre`;
- `molA + molA` has type `number`, so its result **cannot be stored back** as a
  `Mol` without an explicit conversion.

What it does **not** provide: it does not stop `molA + litreB` from being written.
That is a documented gap, not a claimed guarantee.

**The gap is closed at the API boundary, not by the type.** No function in the
scientific core, world runtime, or observable layer accepts a bare `number` in a
position that means a physical quantity. Arithmetic on branded quantities goes
through named operators that return the branded type:

```ts
export function sumAmounts(...parts: Mol[]): Mol;
export function scaleVolume(v: Litre, factor: number): Litre;
```

A raw `+` between two quantities therefore produces a value that no downstream
signature will accept. The mistake becomes a compile error one line later rather
than never.

**A bug found while building this test is worth recording:** the first version gave
`Mol` and `Litre` the *same* brand symbol, making them structurally identical and
mutually assignable. It was caught only because the test asserted the assignment
*should* fail. A branded-type scheme with a copy-paste error in the brand key
silently provides nothing — which is why the unit round-trip and cross-unit
compile tests are acceptance criteria (M1), not optional.

### 3. Serialized forms carry tagged tuples

```json
{ "value": 0.05, "unit": "L" }
```

Never a bare `0.05`. Ingest first validates the dimension, then converts to the
canonical unit before constructing a domain quantity, and **rejects an unknown
or missing unit** — a missing unit is a validation error, not a default. Every
current DTO→domain bridge uses this order; validating a unit and then discarding
it is a contract bug.

**One written exception: a vector block declares its unit once** (formalized
2026-09-11). `Position` is

```json
{ "unit": "mm", "x": 1, "y": 2 }
```

not two tagged tuples. The reason is that a position is not one quantity but a
pair of coordinates that necessarily share a unit: carrying `unit` twice per
point would add no information while making every content file harder to read.
The unit is declared ONCE for the block, so no number in it is unit-ambiguous —
which is the property the rule above exists to protect.

This was implemented with a comment explaining it as a "deliberate deviation"
while the ADR still stated the unqualified rule. An exception that exists only
in a code comment is one the next reader cannot find and the next implementer
cannot rely on, so it is recorded here.

**An object at a boundary is STRICT, and strict means the same thing on both
sides** (added 2026-09-11). Every persisted, exported, or cross-language object
refuses unknown keys. An earlier version was strict in the emitted JSON Schema
and permissive at parse time, and the divergence runs in the direction that
hurts:

```
z.object({...}).parse({ value: 1, unit: "L", surprise: "oops" })
  -> { value: 1, unit: "L" }        // accepted, key silently dropped
quantity.schema.json
  -> "additionalProperties": false  // Python rejects the same input
```

zod emits `additionalProperties: false` for a plain `z.object` while *stripping*
at parse time, so the two sides of "one source of truth" disagreed without
anything failing. A fixture that passes on one side and fails on the other is
the symptom; a key that disappears on one side and is refused on the other is
the disease.

Two deliberate exceptions exist, both `z.record` rather than `z.object`, so the
invariant "every object that declares `properties` closes them" holds without an
allow-list that rots: an apparatus kind's `state` (its shape is authored per
kind), and the `parameters` bags on `Provenance` and `SolverConfig` (replay
records, pinned by value rather than by name). Both are recorded as decisions at
their definitions.

### 4. One conversion module

All conversion factors live in exactly one module. No inline `* 1000` anywhere.
Conversions between molality and molarity require a solution density, which is an
**explicit, sourced scenario input**, never a model the project invents.

### 5. Display precision derives from model precision

The UI shows at most 2 decimals of pH, derived from the ±0.02 pH model tolerance
(`SPEC-0001`). Showing more is the "precise-looking numbers" failure `GOAL.md`
§5.2 prohibits. Formatting belongs to the presentation layer; the scientific
layer owns the canonical value and its unit.

## Alternatives considered

**Branded numbers everywhere, with the guarantee as originally written.**
Rejected: it was tested and the guarantee does not exist. Keeping the wording
would have been a false claim in a document whose entire purpose is preventing
false claims.

**Opaque types everywhere.** Rejected as the sole approach. It truly controls
arithmetic, but for quantities like volume and mass the arithmetic is legitimate,
and forcing `.value` unwrapping at every site adds ceremony without adding
safety. The split is by whether arithmetic is conceptually meaningful.

**A general-purpose quantity library.** Still rejected at v0 for the same reason
as before: the unit set is small and closed, and the missing capability
(enforcing arithmetic) is not something those libraries provide either. Revisit
if the unit set grows past ~20 quantities or compound-unit algebra is needed.

**Full SI canonical units (m³, mol/m³).** Still rejected: it maximizes distance
from every reference the project must agree with — IUPAC buffer standards, CRC
tables, PHREEQC output, textbook worked examples — and concentrates the resulting
conversions exactly where errors are least visible. Reconsider only if a future
model's library demands SI internally, and then the conversion belongs inside
that adapter.

**Plain `number` with naming conventions.** Still rejected; unenforced and
invisible to the compiler, which is what `CLAUDE.md` §8.2 prohibits.

## Consequences

### Positive
- Unit confusion is a compile error at the assignment boundary, and mixing
  molality with molarity or the two ionic-strength bases cannot be represented
  at all.
- Undefined operations on pH, activity, activity coefficient, mole fraction, and
  ionic strength cannot be written — while their **defined** operations
  (`ratioActivity`, `differencePh`, `sumMoleFractions`) are available by name, so
  the type system enforces physics rather than merely obstructing code.
- Serialized worlds are self-describing: a file from six months ago is readable
  without the code that wrote it.
- The gap in the branded guarantee is documented, bounded, and closed at the API
  boundary rather than papered over.

### Negative
- Two representation styles coexist, so a contributor must know which applies.
  Mitigated by the rule being simple: *is arithmetic meaningful here?*
- Opaque types require `.value` unwrapping, which is friction — deliberately, at
  the sites where a mistake would be subtle.
- The conversion module is a single point of failure and needs a round-trip
  property test for every supported unit, plus the molality↔molarity path.

### Neutral
- `packages/schema` now carries quantity primitives rather than pure schema.
  Accepted: units are part of the contract.

## Reversibility

**Moderate.** Changing canonical units is a format migration, since serialized
values carry explicit units — possible, but not free. Adding quantities is
trivial and expected. Moving a type between branded and opaque is a local change
with compile-time-visible fallout, which is the cheap direction.

## Open questions

1. Should the two ionic-strength types also forbid *comparison* across bases, or
   only arithmetic? Comparison is where a silent mix-up would be genuinely
   confusing. **Leaning: forbid it — `IonicStrengthMolal` and
   `IonicStrengthMolar` compare only within themselves.**
2. Should a vessel track water **mass** explicitly, or derive it from volume and
   a density model? **Leaning: track the mass.** It is the conserved quantity,
   and deriving it would reintroduce a density model into the thermodynamic path
   that molality was chosen specifically to avoid. Confirm at M1.
3. Does a vessel's `capacity` (fixed geometry) need a distinct type from its
   current `liquidVolume` (state)? **Leaning: no — same type, different field
   names.** The distinction is semantic, not dimensional. Confirm at M1.
