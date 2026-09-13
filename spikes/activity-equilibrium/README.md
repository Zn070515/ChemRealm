# SPIKE — self-consistent activity equilibrium

> **Status: spike complete (revision 5). Not a production path.**
> Supersedes revisions 1–4 of this file and `spikes/solver-validation`.

## Revision history

| Rev | Change |
|---|---|
| 1 | `spikes/solver-validation` — concentration-only solve, activity applied post-hoc. **Superseded.** |
| 2 | Activity moved *inside* the equilibrium; molality basis; `(m_H, I)` coupled. |
| 3 | **Round-2 fixes.** `−lg c(H⁺)` was being computed from a molality (P1-1); "thermodynamic pH" renamed to activity-based model pH (P1-2); computational domain separated from a proposed validation envelope (P1-3). |
| 4 | **Round-3 fixes.** Indicator equilibrium moved into the scientific layer (P1-C); `present()` renamed `project()` as a named `ScientificProjection` (P1-D); envelope downgraded to **proposed** (P1-E); **reduced** ionic strength `Î = I_m/m°` so Davies is dimensionally legal (P1-F); transfer semantics — `liquidVolume` as tracked state, homogeneous-fraction mixing — demonstrated (P1-A). |
| 5 | **Round-4 fix.** The whole algebra now runs in **reduced molality** `m̂ = m/m°`. Previously `m_OH = Kw_c/m_H` divided a dimensionless constant by a *physical* molality — `dimensionless / (mol/kg)` — correct only because `m° = 1 mol/kg` numerically (P1-1). |
| 6 | **Round-5 fix.** The reduced core is renamed `solve_reduced`, and every physical input now crosses an explicit **`solve_physical()`** boundary. The old call sites passed physical values straight into a reduced core — numerically identical at `m° = 1`, which is exactly why a **numeric** test cannot catch a standard-state error (P2-1). Transfer/mixing docstrings corrected: volume additivity is an **operational** approximation, not a display-only one (P1-4). |

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

**The fix is structural, not a corrected constant.** The scientific core solves
on the molality basis and does **not** return `c(H⁺)` or `−lg c(H⁺)`. Those
require the world's solution volume, and they are produced by a named
**`ScientificProjection`** step (`project()`) from the converged state plus the
mixture's conserved amounts and volume:

> **Round-3 correction (P1-D).** Revision 3 of this file said the core "returns
> no pH-like number at all". That was wrong in the other direction: `a_H`,
> activity, `I`, **model pH**, and indicator speciation are all scientific
> outputs and belong to the core. Only molarity-dependent quantities are
> projected. See `SPEC-0001` §Who owns which quantity.


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

## P1-3 / P1-E — computational domain, proposed envelope, validated envelope

| | Value | Status |
|---|---|---|
| Computational domain | `I_m ≤ 0.5 mol/kg` | Davies's approximate range. Outside: `MODEL_OUT_OF_DOMAIN`. |
| **Proposed validation envelope** | `I_m ≤ 0.12 mol/kg` | **The target, not yet earned.** |
| **Validated envelope** | — | **Does not exist yet.** M4's AC-S6 creates it, or does not. |

`I ≤ 0.5` is a rule of thumb about where Davies is roughly usable, not an error
bound. ±0.02 pH has been demonstrated at two IUPAC anchors (`I = 0.01` and
`I = 0.10`) — **and nowhere else**. Extrapolating it across the whole 0.12
envelope would repeat the round-2 mistake in a smaller window: equal ionic
strength does not imply equal model error, and the weak-acid equivalence region
is a different composition regime from an acetate buffer.

Between the proposed envelope and the domain limit the solver computes and the
result carries `accuracyStatus: "outside-proposed-envelope"`.

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

Run: `py -3.12 solve.py`. Python 3.12.0, **27/27 checks pass**.

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
| v0 scenario max `I_m` | 0.1002 mol/kg | ≤ 0.12 proposed | — | — |
| **§L** `Î = I_m/m°` | 0.100029 = 0.100029 | identity | — | <1e-15 |
| **§L2** `m̂_OH = Kw_c/m̂_H` | 5.558477e-10 (both sides) | dimensionless identity | <1e-20 | — |
| **§L2** `m̂_A` in dimensionless form | 1.000295e-01 (both sides) | dimensionless identity | <1e-20 | — |
| **§L2** `m_H = m̂_H · m°` | exact | boundary conversion | <1e-20 | — |
| **§M** indicator ratio monotone in `a_H` | yes | — | — | — |
| **§M** ratio crosses 1 near indicator `pKa` | 0.9669 → 1.2173 | at pA_H 9.3→9.4 | — | — |
| **§N** volume conserved, 100 × 5 mL transfers | drift 5.55e-15 | — | — | <1e-12 |
| **§N** water mass conserved | drift 1.11e-16 | — | — | <1e-12 |
| **§N** solute amount conserved | drift 0.00e+00 | — | — | <1e-12 |

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

**F8 — The v0 scenarios reach `I_m = 0.1002 mol/kg`**, inside the 0.12 proposed
envelope with margin. The envelope is measured against the scenarios, not guessed.

**F9 — Davies needs a dimensionless argument, and writing that down costs
nothing.** `Î = I_m/m°` is numerically identical to `I_m` because `m° = 1 mol/kg`,
so the correction is pure semantics — which is the point. `1 + √(mol/kg)` is not
a legal sum, and this document set elsewhere insists that activity and every
equilibrium constant be dimensionless.

**F10 — The indicator ratio crosses 1 at `pA_H ≈ 9.35`, i.e. at `pKa_in` shifted
by `log₁₀ γ_In`.** Measured at `I_m = 0.05` (`γ_In = 0.8215`): the ratio runs
0.9669 → 1.2173 across pA_H 9.3 → 9.4. So even the *transition point* of a
colour indicator is activity-dependent — which is why the ratio must be computed
in the scientific core and not in the renderer.

**F11 — `m(In⁻)/m(HIn)` spans ~5 orders of magnitude across the visible
transition** (0.012 at pA_H 7.4 to 122 at 11.4). A renderer handed a raw ratio
must therefore map it on a log-like scale to produce a sane perceptual ramp —
but that mapping is the *observable* layer's business, and it receives a ratio,
not a `Ka`.

**F12 — Transfer semantics conserve to machine precision under the
homogeneous-mixture assumption.** 100 × 5.00 mL transfers: volume drifts
5.6e-15, water mass 1.1e-16, solute amount exactly 0. This is what justifies
tracking `liquidVolume` as updated state rather than recomputing it: recomputing
would need a density model, and the quantity is conserved anyway.

**F13 — `Kw_c / m_H` divided a pure number by a dimensioned concentration.**
Found in round 4. `Kw_c` is dimensionless, so the quotient is not mol/kg; it
produced correct numbers only because `m° = 1 mol/kg` numerically. The whole
algebra now runs in reduced molality `m̂ = m/m°` and converts once, at the
boundary. §L2 verifies the identities hold in dimensionless form.

This is the **second instance of the same failure mode** — `1 + √I` (round 3)
and now `Kw_c/m_H` (round 4). Both were invisible because the standard-state
factor happens to be 1. Neither was caught by checking whether the *number*
looked right; both were caught by asking what the *units* of each term are.
The lesson recorded for M4: for every equation ported from the literature, write
the units beside each term before writing the code.

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
- The density literals in this historical spike are not the current v0 input
  contract. M4 acceptance uses the cited, manifest-owned records in
  `docs/research/v0-scientific-inputs.json`; changing those records requires
  rerunning the provenance and full-family sweep evidence.
- Volume additivity is an unmeasured **operational** approximation, not a
  display-only approximation: metering changes subsequent composition and can
  therefore affect later molality and model output. It is not part of the
  equilibrium algebra itself.
