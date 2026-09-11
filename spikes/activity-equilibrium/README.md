# SPIKE — self-consistent activity equilibrium

> **Status: spike complete (revision 3). Not a production path.**
> Supersedes revision 2 of this file and `spikes/solver-validation`.

## Revision history

| Rev | Change |
|---|---|
| 1 | `spikes/solver-validation` — concentration-only solve, activity applied post-hoc. **Superseded.** |
| 2 | Activity moved *inside* the equilibrium; molality basis; `(m_H, I)` coupled. |
| 3 | **Round-2 fixes.** `−lg c(H⁺)` was being computed from a molality (P1-1); "thermodynamic pH" renamed to activity-based model pH (P1-2); computational domain separated from validated accuracy envelope (P1-3). |

## P1-1 — the defect this revision fixes

Revision 2 returned

```python
"p_cH": -math.log10(m_h)          # "taught quantity: -lg c(H+)"
```

`m_h` is a **molality** (mol/kg water). It was printed and documented as
`−lg c(H⁺)`, a quantity defined on **molarity** (mol/L solution). For 0.1000 mol/L
HCl that produced **0.9993**. The correct value is **1.0000**, because the
solution is *defined* as 0.1000 mol/L and HCl is fully dissociated. The spec then
carried both 0.9993 (in the prose) and 1.0000 (in the reference table).

**The fix is structural, not a corrected constant.** The scientific core is now
molality-only and returns no pH-like number at all. Molarity and both pH-like
quantities are produced in a `present()` step from the converged molality state
plus the mixture's conserved amounts and volume:

```
m(H⁺) = 0.100165 mol/kg water     ← solver output
c(H⁺) = n(H⁺) / V_solution        ← 0.100000 mol/L
a(H⁺) = γ_H · m(H⁺)/m°            ← 0.078279
−lg c(H⁺) = 1.0000                ← taught quantity
model pH  = 1.1064                ← −log₁₀ a(H⁺)
```

`c(H⁺)/m(H⁺) = 0.998354`. There is no code path that derives one from the other.

## P1-2 — terminology

The activity-based quantity is called **activity-based model pH**, not
"thermodynamic pH". IUPAC defines pH as `−lg a(H⁺)`, but the same definition is
**notional**: the activity of a single ion is not independently measurable, and
realising it operationally requires an extrathermodynamic convention
(Bates–Guggenheim for primary standards; Davies here). Presenting one number as
"the true pH" is the same category of error as ignoring activity altogether.

## P1-3 — computational domain ≠ validated accuracy envelope

| | Value | Meaning |
|---|---|---|
| Computational domain | `I_m ≤ 0.5 mol/kg` | Davies's approximate range. Outside: `MODEL_OUT_OF_DOMAIN`. |
| **Validated accuracy envelope** | `I_m ≤ 0.12 mol/kg` | ±0.02 pH is claimed and evidenced **here only**. |

`I ≤ 0.5` is a rule of thumb about where Davies is roughly usable, not an error
bound. ±0.02 pH has been demonstrated at two IUPAC anchors (`I = 0.01` and
`I = 0.10`); extrapolating it to 0.5 would be an unsupported claim. Between the
envelope and the domain limit the solver computes and the result carries
`accuracyStatus: "outside-validated-envelope"`.

## Method

The scientific core solves for `(m_H, I)` simultaneously. Given a trial `m_H`,
the ionic strength is found by a damped fixed point; the outer residual is then
bisected. Substituting the conditional constants
`Kw_c = Kw/(γ_H γ_OH)`, `Ka_c = Ka·γ_HA/(γ_H γ_A)` into the charge balance gives

```
m_Na + m_H − Kw_c/m_H − m_A,tot·Ka_c/(Ka_c + m_H) = 0
```

The scalar form is convenient; the point is that `Kw_c` and `Ka_c` depend on `I`,
which depends on the speciation, which depends on them. Treating them as
constants — what revision 1 did — solves a different, inconsistent model.

Mixing is on conserved quantities (water mass, amounts). Volume is additive,
which is a labelled **presentation** approximation: it affects the reported
molarity and never the thermodynamics.

## Results

Run: `py -3.12 solve.py`. Python 3.12.0, **18/18 checks pass**.

| Check | Computed | Reference | Δ | Tol |
|---|---|---|---|---|
| Acetate buffer 0.1 mol/kg vs IUPAC | 4.6379 | 4.6440 | −0.0061 | ±0.02 |
| Acetate buffer 0.01 mol/kg vs IUPAC | 4.7018 | 4.7130 | −0.0112 | ±0.02 |
| **`−lg c(H⁺)` for 0.1000 mol/L HCl** | **1.0000** | 1.0000 | 0.0000 | ±0.0005 |
| Activity-based model pH, same solution | 1.1064 | 1.1061 | +0.0003 | ±0.02 |
| Strong acid/base excess regimes (5 cases) | — | analytic relation | <1e-9 | ±1e-9 |
| Half-equivalence vs `pKa + log₁₀ γ_A` | 4.6717 | 4.6711 | +0.0007 | ±0.005 |
| 1e-8 mol/kg HCl | 6.9782 | 6.978 | +0.0002 | ±0.02 |
| `−lg c(H⁺)` vs input concentration, 5 concentrations | worst 0.00000 | exact | — | <1e-4 |
| Molality/molarity model-pH sensitivity, envelope | worst 0.00096 | — | — | <0.002 |
| Charge conservation | 1.39e-17 mol/kg | 0 | — | <1e-14 |
| Element (A-group) conservation | 0.00e+00 mol/kg | 0 | — | <1e-15 |
| Outer residual monotone (sampled) | 0/6 non-monotone | — | — | 0 |
| 0.60 mol/L refused | `MODEL_OUT_OF_DOMAIN` | — | — | — |
| v0 scenario max `I_m` | 0.1002 mol/kg | ≤ 0.12 envelope | — | — |

## Findings carried into `SPEC-0001`

**F1 — The taught quantity is exact for a fully dissociated strong acid.** For
any nominal `c` mol/L HCl, `−lg c(H⁺) = −lg c` to 5 decimal places. This is now a
test across five concentrations, and it is what makes REF-5 a genuine check:
a molality-derived value fails it immediately.

**F2 — The two pH-like numbers differ by 0.107 at 0.1 M, from `γ_H` alone.**

**F3 — `pH = pKa` at half-equivalence is wrong under activity.** The correct form
is `pH = pKa + log₁₀ γ_A`; it matches to 0.0007.

**F4 — Activity enters base-excess regimes through `γ_OH`, not `γ_H`.** Two
checks initially failed because the analytic reference used the wrong ion. The
solver was right; the reference was wrong. Recorded because it is exactly the
kind of sign error that would otherwise ship as a "reference value".

**F5 — Molality/molarity sensitivity is 0.00096 pH across the envelope.** Small
enough that the two scales coexist without a learner noticing; **not** a licence
to merge them, since the margin is a property of these concentrations.

**F6 — `γ_HA = 1` is not the dominant residual.** A Setchenow term of
`+0.02 log₁₀` moves the buffer result from 4.6379 to 4.6579 — both inside ±0.02.

**F7 — The outer residual is monotone on all six sampled regimes.**
**Numerically verified, not analytically proven.**

**F8 — The v0 scenarios reach `I_m = 0.1002 mol/kg`**, inside the 0.12 envelope
with margin. The envelope is measured against the scenarios, not guessed.

## Reproduce

```
cd spikes/activity-equilibrium
py -3.12 solve.py
```

Expected: `RESULT: 18/18 checks`.

## Known limitations

- The **weak-acid equivalence region** still has no independent reference. Only
  the M4 PHREEQC oracle closes this.
- The inner ionic-strength solve is a **damped fixed point**, not a bracketed
  solve. M4 replaces it so convergence is guaranteed rather than observed.
- Density values (1.0020 kg/L for 0.1 M HCl, 1.0040 for NaOH) are **provisional
  scenario inputs**; they must be pinned to a citable source at M4.
- Volume additivity is an unmeasured display approximation.
