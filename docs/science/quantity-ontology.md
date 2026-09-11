# Scientific quantity ontology

- **Status:** Proposed. Becomes binding when `SPEC-0001` is accepted.
- **Addresses:** owner remediation finding **P1-3**
- **Related:** `ADR-0004`, `ADR-0003`, `SPEC-0001`, `spikes/activity-equilibrium`

## Why this document exists

`ADR-0004` as first written treated "concentration" and "ionic strength" as
`mol/L` quantities, while the project simultaneously claimed a thermodynamic
activity-based model and planned PHREEQC validation. Those cannot both be true
casually: molality, molarity, and activity are three different physical
quantities, and ionic strength has a *basis*.

The failure this prevents is quiet and expensive. If `Ka` is a molality-basis
thermodynamic constant but ionic strength is computed from molarity, the model is
internally inconsistent by a density factor. At the concentrations in this slice
that factor is ~0.2 % — invisible against a ±0.02 pH tolerance, which is exactly
what makes it dangerous: it would survive every test here and break the moment
the model is extended to higher concentration or compared against PHREEQC, which
works in molality.

**Rule: the Scientific Reality Core must never identify two different physical
quantities because their numbers happen to be close.** The teaching layer may
speak in one of them. The core may not conflate them.

## The quantities

### Amount and mass — the conserved state

| Quantity | Symbol | Unit | Notes |
|---|---|---|---|
| Amount of substance | `n_i` | mol | **The independent state variable.** Quantized; everything else derives from it. |
| Mass of water (solvent) | `m_w` | kg | **The independent state variable** for the solvent. Not a volume. |
| Mass | `m_i` | g | Derived from `n_i` and molar mass. |

Amounts and water mass are what transfers conserve. They are what the event log
stores and what the state hash covers (`ADR-0007` §5).

### Composition scales — three different quantities

| Quantity | Symbol | Unit | Basis |
|---|---|---|---|
| Molality | `m_i` | mol/kg **water** | Per kilogram of solvent |
| **Reduced molality** | `m̂_i` | **dimensionless** | `m_i / m°`, `m°` = 1 mol/kg |
| Molarity (amount concentration) | `c_i` | mol/L **solution** | Per litre of solution |
| Mole fraction | `x_i` | dimensionless | Per mole of all species |

**Added 2026-09-11 (round 4, finding P1-1).** Reduced molality is the variable
the thermodynamic algebra is actually written in, and it is a separate quantity
from molality for the same reason reduced ionic strength is separate from ionic
strength: **`Kw` is a dimensionless constant and cannot be divided by a
dimensioned concentration.**

```
m̂_OH = Kw_c / m̂_H          ✓  dimensionless / dimensionless
m_OH = Kw_c / m_H          ✗  dimensionless / (mol/kg)
```

The second form was in the solver until round 4. It produced correct numbers
only because `m° = 1 mol/kg` numerically — which is exactly why nobody noticed.
The scientific core now solves in reduced molality and converts **once**, at the
`ScientificState` boundary: `m_i = m̂_i · m°`.

**v0 uses molality for all thermodynamics.** Reasons:

1. Thermodynamic `Ka` and `Kw` are *defined* on the molality scale with the
   hypothetical ideal unit-molality standard state. Using them against molarity
   silently redefines them.
2. **PHREEQC computes in molality.** Aligning means the oracle comparison tests
   our physics rather than a convention difference.
3. Molality is derivable from the conserved state (`m_i = n_i / m_w`) with **no
   density model**. Molarity is not — it needs the solution volume.

Molarity is still computed, because the teaching layer, lab reagent labels, and
burette graduations are volumetric. It is a **derived presentation quantity**.

### Activity and its coefficient

| Quantity | Symbol | Unit | Definition |
|---|---|---|---|
| Activity (molality basis) | `a_i` | **dimensionless** | `a_i = γ_i · (m_i / m°)`, `m° = 1 mol/kg` |
| Activity coefficient | `γ_i` | **dimensionless** | Davies equation, molality basis |

The `m°` in the definition is what makes activity dimensionless. This is
mandatory: `Ka = a_H a_A / a_HA` must be dimensionless, because the tabulated
value `1.8 × 10⁻⁵` is. A formulation in which `γm` carries units cannot produce a
dimensionless `Ka`, and any "equilibrium constant" with units is a conditional
constant masquerading as a thermodynamic one.

**Neutral species:** `γ_HA = 1` in v0. This neglects the Setchenow salting-out
term, which would contribute roughly `+0.02` to `log10 γ_HA` at I = 0.1. The
spike shows this moves the buffer reference from 4.6379 to 4.6579 — both inside
the ±0.02 band. **A bounded, recorded approximation, not an unexamined default.**

### Ionic strength — and its basis

| Quantity | Symbol | Unit | Basis |
|---|---|---|---|
| Ionic strength, molality basis | `I_m` | mol/kg | `0.5 · Σ m_i z_i²` |
| Ionic strength, molarity basis | `I_c` | mol/L | `0.5 · Σ c_i z_i²` |
| **Reduced ionic strength** | `Î` | **dimensionless** | `I_m / m°`, `m°` = 1 mol/kg |

**Added 2026-09-11 (round 3, finding P1-F).** The Davies equation contains
`1 + √I` and `b·I`. With a dimensioned `I` those are illegal sums. The standard
molality-scale resolution is to work with the **reduced** ionic strength
`Î = I_m / m°`, which is a pure number, so every term is dimensionless and `A` and
`b` are pure numbers too.

Numerically `Î = I_m` because `m° = 1 mol/kg`; the point is semantic, and it is
exactly the kind of semantics this document exists to keep straight. A project
that requires all activities and equilibrium constants to be dimensionless cannot
have an activity model that adds `1 + √(mol/kg)`.

`IonicStrengthMolal` and `ReducedIonicStrength` are therefore **distinct
types** — and distinct also from `IonicStrengthMolar`, which is a different
quantity again.

**v0 uses `I_m`**, because it must be consistent with the molality-scale activity
coefficients it feeds. Mixing bases (`I_c` into a molality-scale Davies equation)
is the specific inconsistency this document exists to prevent.

The numeric difference is ~0.2 % over the supported domain — well below
tolerance. **The problem was never the size of the error; it was that the units
were not declared.**

### Equilibrium constants — three kinds, never interchangeable

| Kind | Symbol | Basis | Dimensionless? | Example |
|---|---|---|---|---|
| Thermodynamic (standard) constant | `Ka`, `Kw` | activity | **Yes** | 1.8e-5 |
| Conditional / stoichiometric constant | `Ka_c`, `Kw_c` | concentration, at a stated I | Yes, if defined via `m/m°` ratios | I-dependent |
| Apparent constant | `Ka'` | mixed conventions | Usually yes | various |

The solver computes the conditional constants **inside** the equilibrium loop:

```
Kw_c = Kw / (γ_H · γ_OH)
Ka_c = Ka · γ_HA / (γ_H · γ_A)
```

They are derived quantities at a converged ionic strength, not stored constants.
The tabulated `Ka` and `Kw` in the solver configuration are always the
thermodynamic ones.

### Hydrogen ion: three quantities, and two numbers that look alike

This is the most consequential distinction in the document, and it is where
revision 2 of the spec shipped a defect: it computed `−lg c(H⁺)` as
`−log₁₀(m_H)` — the **molality** — and labelled it as a concentration.

| Quantity | Symbol | Unit | Definition | Used by |
|---|---|---|---|---|
| Hydrogen ion molality | `m(H⁺)` | mol/kg water | **solver output** | everything internal |
| Hydrogen ion concentration | `c(H⁺)` | mol/L solution | `n(H⁺) / V_solution` | teaching layer |
| Hydrogen ion activity | `a(H⁺)` | dimensionless | `γ_H · m(H⁺)/m°` | thermodynamics |
| **Taught quantity** | — | dimensionless | `−lg(c(H⁺)/c°)`, `c°` = 1 mol/L | high-school view |
| **Activity-based model pH** | — | dimensionless | `−log₁₀ a(H⁺)` | scientific view |

**`c(H⁺)` is not `m(H⁺)` renamed.** It requires the solution volume, which is
itself derived (through a labelled additivity approximation) from the conserved
amounts and water mass. Deriving `−lg c(H⁺)` from a molality is a defect
regardless of how close the two numbers are.

Measured for **0.1000 mol/L HCl** (`spikes/activity-equilibrium` §B):

```
m(H⁺) = 0.100165 mol/kg        c(H⁺)/m(H⁺) = 0.998354
c(H⁺) = 0.100000 mol/L
a(H⁺) = 0.078279               (γ_H = 0.7815)

−lg c(H⁺) = 1.0000    ← the textbook "pH = 1"
model pH  = 1.1064    ← −log₁₀ a(H⁺) under the Davies model
```

A difference of 0.107 pH, essentially all of it from `γ_H`.

**On the word "thermodynamic".** The activity-based quantity is called
**activity-based model pH**, never "the thermodynamic pH". IUPAC defines pH as
`−lg a(H⁺)`, but the same definition is **notional**: the activity of a single
ion is not independently measurable, and realising it operationally requires an
extrathermodynamic convention (Bates–Guggenheim for primary standards; here, the
Davies model). Presenting `1.1064` as "the true pH" while the textbook's `1.0000`
is "wrong" would be the same category of error as ignoring activity altogether.

`GOAL.md` §5.1 permits a teaching view to prefer the school heuristic and does
not permit falsifying the underlying state. v0 stores **both**, labels them
distinctly, exposes the difference as a teaching asset, and states the convention
its model pH depends on.

### Which operations are defined on a quantity?

**Added 2026-09-11 (round 2, finding P2-1).** An earlier version of `ADR-0004`
classified quantities by *whether arithmetic is allowed at all*, putting
activity, activity coefficient, mole fraction, and ionic strength in the
"no arithmetic" bucket. That is wrong:

- `Ka = a_H·a_A/a_HA` — activities are **multiplied and divided** by definition;
- `γ_H·γ_A` appears in every conditional constant;
- `Σ x_i = 1` is the definition of mole fraction;
- ionic strengths are summed, scaled, and compared.

The useful question is not "is arithmetic allowed" but **"which operations have
defined physical meaning on this quantity"**. That is a *controlled quantity
algebra*:

| Quantity | Defined operations | Not defined |
|---|---|---|
| amount `n` | `+`, `−`, `× scalar`, `÷ scalar` | × amount, ÷ amount |
| volume `V` | `+`, `−`, `× scalar` | × volume |
| molality / molarity | `× volume → amount` | + concentration (without a mixing model) |
| **activity** | `×`, `÷`, `ratio` | `+` (activities do not add) |
| **activity coefficient** | `×`, `÷`, `log10` | `+` |
| **mole fraction** | `+` (sums to 1), `ratio` | × mole fraction |
| **ionic strength** | `+`, `× scalar`, compare **within one basis** | compare across `I_m`/`I_c` |
| **pH-like** | compare, difference (a ΔpH is meaningful) | **average, sum, scale** |

So `averagePh(p1, p2)` has no definition, while `ratioActivity(a, b)` does. The
representation should expose the *defined* operations and withhold the
undefined ones — not refuse arithmetic wholesale.

See `ADR-0004` §2 for how this maps onto types.

### Geometry

| Quantity | Symbol | Unit | Notes |
|---|---|---|---|
| Length | — | mm | Geometry coordinates. **Length, never volume.** |
| Volume | `V` | L | Volumetric state |
| Fill height | `h` | mm | Derived: `h = V⁻¹(V)` from the vessel's profile |

A geometry coordinate is a length. Encoding volume (`mL`) as a geometry axis unit
is a dimensional error and is corrected in `docs/visual/apparatus-standard.md`
see finding P2-1.

## Where each quantity lives

**Revised 2026-09-11 (round 3, finding P1-D).** The previous version of this
table said the scientific core outputs "both molality and molarity", which
contradicted `SPEC-0001`. The authoritative assignment is now:

| Layer | Owns | Does not own |
|---|---|---|
| **World Physical State** | `amount` (mol), `waterMass` (kg), `liquidVolume` (L), structure | any equilibrium quantity |
| **Scientific Core** | molal species amounts; `γ`; **activity** (dimensionless); `I_m`; **activity-based model pH**; **indicator chemical speciation**; validity/provenance | molarity, `−lg c(H⁺)`, colour, geometry |
| **ScientificProjection** | `c(H⁺)`, `−lg c(H⁺)` — needs scientific state **and** world volume | colour, geometry, formatting |
| **Observable Model** | empirical mapping only: ratio → colour, volume → height via `h(V)`, series → curve | any equilibrium calculation |
| **Renderer** | pixels | everything above |

Molality is the scientific core's **numerical base**. It is not a restriction on
what the core may output: activity, ionic strength, model pH, and indicator
speciation are all scientific quantities and all belong to the core. Molarity is
different — it needs the world's solution volume — which is why
`ScientificProjection` is a named layer.

Serialized forms always carry `{value, unit}`; never a bare number.

## Anti-patterns this document forbids

1. Naming a variable `concentration` when it holds a molality.
2. Passing an ionic strength without stating its basis.
3. Computing `I` from molarity and feeding it to a molality-scale activity model.
4. Calling `−lg c(H⁺)` "pH" in any code path that also computes `−log₁₀ a(H⁺)`.
5. Storing a conditional constant as if it were a thermodynamic one.
6. Giving an equilibrium constant units.
7. Using a geometry axis to carry a volume.
8. **Deriving `−lg c(H⁺)` from `−log₁₀ m(H⁺)`.** They differ by `γ`-scale
   factors of order 0.2 % here, which is precisely why the substitution is easy
   to make and hard to notice. This was defect P1-1 of owner review round 2.
9. Averaging, summing, or scaling a pH-like number.
10. Comparing an `I_m` with an `I_c`.

## Open questions

1. Resolved in favour of distinct types — see `ADR-0004` §2, which now uses the
   *defined-operations* criterion rather than an "arithmetic allowed" criterion
   (finding P2-1).
   ~~Should `I_m` and `I_c` be distinct types so mixing bases is a compile error
   rather than a documented rule?~~ **Yes** — the numeric difference is under
   tolerance, so the mistake would be invisible at runtime, which is exactly
   when the compiler should carry the distinction.
2. Does the vessel need to track water *mass* explicitly, or can it be derived
   from volume and a density model? **Leaning: track the mass.** It is the
   conserved quantity, and deriving it would reintroduce a density model into the
   thermodynamic path that molality was chosen to avoid.
