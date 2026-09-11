# ADR-0004: Units and quantity representation

- **Status:** Proposed
- **Date:** 2026-09-11
- **Deciders:** Project owner
- **Related:** `GOAL.md` §12; `CLAUDE.md` §8.2; `AGENTS.md` §9, §19; `SPEC-0001`
- **Blocks:** `PLAN-0001` M1, M3, M5

## Context

`CLAUDE.md` §8.2 states that scientific quantities must use explicit units at
boundaries and must not rely on comments such as "temperature is K". `GOAL.md`
§12 requires values to carry unit, source, range, uncertainty, model, and version.

The failure mode is not exotic. It is:

- a volume stored in mL in the event payload and consumed as L by the solver,
  producing a pH curve that is wrong by a factor of 1000 and *looks* like a
  plausible curve;
- a temperature in °C reaching a model expecting K;
- two places in the codebase disagreeing about whether "concentration" means
  analytical (total) or free equilibrium concentration.

The domain needs a small, closed set of quantities. For this slice: amount
(mol), volume (L), concentration (mol/L), temperature (K), pressure (kPa),
mass (g), pH (dimensionless, and conventionally *not* a concentration), and
dimensionless ratios. That set will grow slowly.

## Decision

**Canonical internal units, branded types in memory, `{value, unit}` tuples in
every serialized form, and exactly one conversion module.**

### Canonical units

| Quantity | Canonical unit | Symbol |
|---|---|---|
| amount | mole | mol |
| volume | litre | L |
| concentration | mole per litre | mol/L |
| temperature | kelvin | K |
| pressure | kilopascal | kPa |
| mass | gram | g |
| time | second | s |
| pH | dimensionless | — |
| ionic strength | mole per litre | mol/L |

**Litres and mol/L, not m³ and mol/m³.** This is a deliberate departure from
strict SI coherence. Every source the project must agree with — IUPAC buffer
standards, CRC Ka/Kw tables, PHREEQC output, textbook worked examples, the
spike's own reference values — is expressed in mol/L. Adopting mol/m³ would put
a 1000× conversion at every comparison against literature, which is precisely
where a silent factor-of-1000 error would hide best. The unit is declared
explicitly everywhere, so "not SI-coherent" costs nothing and removes a
recurring error source. Recorded here because a future reader will otherwise
wonder why.

### In memory: branded types

```ts
type Mol = number & { readonly __unit: "mol" };
type Litre = number & { readonly __unit: "L" };
type MolPerLitre = number & { readonly __unit: "mol/L" };
type Kelvin = number & { readonly __unit: "K" };
```

Plain `number` is not assignable to these without an explicit construction. A
function taking `Litre` cannot be called with a `MolPerLitre`. This makes
unit confusion a compile error rather than a silent numerical defect.

Constructors are explicit and validated:

```ts
litre(0.05)          // ok
litre(-0.05)         // throws: negative volume is not a physical quantity
molPerLitre(NaN)     // throws
```

`pH` is deliberately **not** a concentration type and has no arithmetic
operations defined. You may not average two pH values, add a pH to a
concentration, or store pH where a concentration is expected. pH is a
projective, logarithmic scale; the fact that it is representable as a float is
not permission to treat it as one. Calculations happen in concentration space
and are converted to pH only for presentation (`ADR-0007`).

### In serialized form: tagged tuples

Every persisted event payload, world file, and content file carries:

```json
{ "value": 0.05, "unit": "L" }
```

never a bare `0.05`. Ingest converts to canonical units via the conversion
module and rejects unknown or mismatched units. A content file that says
`"unit": "mL"` is converted; one that omits the unit is a validation error, not
a default.

### One conversion module

All conversion factors live in exactly one module in `packages/schema`. No
inline `* 1000` or `/ 1000` anywhere else in the codebase. Enforced by review
and, where practical, a lint rule banning raw numeric literals near quantity
construction.

## Alternatives considered

**Full SI canonical units (m³, mol/m³).** Rejected for the reason in the
Decision: it maximizes distance from every reference the project must agree
with, and concentrates the resulting conversions exactly where errors are least
visible. Reconsider only if a future model's library demands SI internally — and
then the conversion belongs inside that adapter, not in the world schema.

**A general-purpose quantity library (`js-quantities`, `unitful`, UOM).**
Rejected at v0. The unit set is small and closed, the operations needed are
mostly construction and comparison, and adding a dependency for a closed set of
eight units buys complexity (`GOAL.md` §19: narrow validated slices, adapters
over vendor lock-in). **Explicitly reconsider if the unit set grows past roughly
twenty quantities or if dimensional analysis of compound units becomes
necessary** — at that point a library is cheaper than hand-rolled algebra.

**Plain `number` with naming conventions (`volumeLitres`, `concMolPerLitre`).**
Rejected. The convention is unenforced, invisible to the compiler, and fails
silently. This is the exact pattern `CLAUDE.md` §8.2 prohibits.

**Store quantities as strings (`"0.05 L"`).** Rejected. Parsing at every access,
no type safety, and it invites locale and formatting bugs into the scientific
layer.

**Let the renderer decide display units.** Rejected, but the presentation layer
must still own *formatting*. The boundary: the scientific layer owns the
canonical value and its unit; the representation layer owns how many decimals to
show and in what display unit, derived from the model's stated precision
(`ADR-0007`).

## Consequences

### Positive
- Unit confusion becomes a type error at build time.
- Serialized worlds and events are self-describing: a file from six months ago
  can be read without reading the code that wrote it.
- pH cannot silently participate in arithmetic it does not support.

### Negative
- Branded types require explicit construction at ingest boundaries, which is
  friction, and friction is the point — but it is real friction.
- The conversion module is a single point of failure and must be well tested,
  including a round-trip property test for every supported unit.
- Comparisons and arithmetic on branded types need small helper functions;
  TypeScript will not do `litreA + litreB` without them.

### Neutral
- `packages/schema` grows slightly beyond pure schema into quantity primitives.
  Acceptable: units are part of the contract.

## Reversibility

**Moderate.** Changing canonical units is a format migration because serialized
values carry explicit units — the migration is therefore *possible* but not
free. Adding new quantities is trivial and expected. The decision to keep pH
non-arithmetic is easy to reverse (add operations later) and should stay until
there is a concrete reason.

## Open questions

1. Does the solvent volume need its own type distinct from a vessel's capacity?
   A vessel has a capacity (a fixed geometric property) and a current liquid
   volume (state). Both are litres. **Leaning: same type, different field
   names, no new type** — the distinction is semantic, not dimensional. Confirm
   at M1.
2. Should ionic strength be a branded type or a plain `MolPerLitre`? It is
   dimensionally a concentration. **Leaning: branded, because confusing ionic
   strength with an analytical concentration is a plausible and quiet mistake.**
