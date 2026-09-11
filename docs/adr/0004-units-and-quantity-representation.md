# ADR-0004: Units and quantity representation

- **Status:** Proposed (revised 2026-09-11 after owner review)
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
| molarity | mol/L solution | `MolPerLitre` |
| temperature | K | `Kelvin` |
| pressure | kPa | `Kilopascal` |
| time | s | `Second` |
| activity | dimensionless | `Activity` |
| activity coefficient | dimensionless | `ActivityCoefficient` |
| ionic strength (molality basis) | mol/kg | `IonicStrengthMolal` |
| ionic strength (molarity basis) | mol/L | `IonicStrengthMolar` |
| mole fraction | dimensionless | `MoleFraction` |
| pH | dimensionless | `Ph` |

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

Used for: `Ph`, `Activity`, `ActivityCoefficient`, `IonicStrengthMolal`,
`IonicStrengthMolar`, `MoleFraction`.

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

Used for: `Mol`, `Kilogram`, `Litre`, `Millimetre`, `MolPerKilogram`,
`MolPerLitre`, `Kelvin`, `Kilopascal`, `Second`.

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

Never a bare `0.05`. Ingest converts to canonical units and **rejects an unknown
or missing unit** — a missing unit is a validation error, not a default.

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
