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
| Molarity (amount concentration) | `c_i` | mol/L **solution** | Per litre of solution |
| Mole fraction | `x_i` | dimensionless | Per mole of all species |

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

### Hydrogen ion, and the two numbers that look alike

This is the most consequential distinction in the document.

| Quantity | Symbol | Unit | Definition | Used by |
|---|---|---|---|---|
| Hydrogen ion molality | `m(H⁺)` | mol/kg | solver output | everything internal |
| Hydrogen ion concentration | `c(H⁺)` | mol/L | `m(H⁺)` converted via solution volume | teaching layer |
| Hydrogen ion activity | `a(H⁺)` | dimensionless | `γ_H · m(H⁺)/m°` | thermodynamics |
| **pH** | — | dimensionless | `−log₁₀ a(H⁺)` — **IUPAC definition** | scientific view |
| **Taught quantity** | — | dimensionless | `−lg c(H⁺)` | high-school view |

**These last two are not the same number and must never be silently identified.**

Measured (`spikes/activity-equilibrium`, finding F2): for 0.1 M HCl,

```
−lg c(H⁺) = 0.9993      ← the textbook "pH = 1"
pH        = 1.1064      ← −log₁₀ a(H⁺), the IUPAC quantity
```

A difference of 0.107 pH, entirely from `γ_H = 0.7815`.

`GOAL.md` §5.1 permits a teaching view to prefer the school heuristic. It does
not permit falsifying the underlying state. So v0 stores **both**, labels them
distinctly, and exposes the difference as a teaching asset rather than hiding it
— the gap between concentration and activity is a real concept the platform is
well placed to make visible (`GOAL.md` §1 "Visible").

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

| Layer | Speaks in |
|---|---|
| World state | amounts (mol), water mass (kg), volume (L) |
| Scientific core (internal) | molality (mol/kg), activity (dimensionless), `I_m` |
| Scientific core (output) | both molality and molarity; activity; `I_m`; `pH` |
| Observable model | whatever the view needs, converted explicitly |
| Teaching view | molarity (`mol/L`), `−lg c(H⁺)` |
| Scientific view | molality, activity, `pH` |
| Serialized forms | `{value, unit}` always; no bare numbers |

## Anti-patterns this document forbids

1. Naming a variable `concentration` when it holds a molality.
2. Passing an ionic strength without stating its basis.
3. Computing `I` from molarity and feeding it to a molality-scale activity model.
4. Calling `−lg c(H⁺)` "pH" in any code path that also computes `−log₁₀ a(H⁺)`.
5. Storing a conditional constant as if it were a thermodynamic one.
6. Giving an equilibrium constant units.
7. Using a geometry axis to carry a volume.

## Open questions

1. Should `I_m` and `I_c` be **distinct opaque types** (`IonicStrengthMolal`,
   `IonicStrengthMolar`) so mixing bases is a compile error rather than a
   documented rule? Given that the numeric difference is under tolerance, the
   mistake would be invisible at runtime. **Leaning: yes — this is precisely the
   case where the compiler should carry the distinction, because no test will.**
2. Does the vessel need to track water *mass* explicitly, or can it be derived
   from volume and a density model? **Leaning: track the mass.** It is the
   conserved quantity, and deriving it would reintroduce a density model into the
   thermodynamic path that molality was chosen to avoid.
