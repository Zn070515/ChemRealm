# SPIKE — self-consistent activity-based acid/base equilibrium

> **Status: spike complete. Not a production path.**
> **Supersedes `spikes/solver-validation` for the scientific formulation.**

## Question

`SPEC-0001` claimed an activity-based mass-action model, then solved a
**concentration-only** residual and applied the Davies equation afterwards as a
display correction. Is the model actually what it says it is? And does making it
self-consistent change the answers?

## Method

Activity coefficients participate **inside** the equilibrium constraints. The
unknowns are `(m_H, I)` and they are solved simultaneously by nested bisection:

```
charge balance   m_Na + m_H = m_OH + m_A + m_Cl
mass balance     m_HA,tot  = m_HA + m_A
Ka               Ka  = a_H a_A / a_HA  = g_H m_H g_A m_A / (g_HA m_HA)
Kw               Kw  = a_H a_OH        = g_H m_H g_OH m_OH
ionic strength   I   = 0.5 * sum(m_i z_i^2)
Davies           log10 g_i = -A z_i^2 ( sqrt(I)/(1+sqrt(I)) - b I )
```

**Scale: molality (mol/kg water)** — the basis on which thermodynamic `Ka` and
`Kw` are defined, and the basis PHREEQC uses internally. Activities are
dimensionless: `a_i = g_i * (m_i / m°)` with `m° = 1 mol/kg`.

The formulation is **not** a rejection of the earlier one. Substituting the
conditional constants `Kw_c = Kw/(g_H g_OH)` and `Ka_c = Ka·g_HA/(g_H g_A)` into
the charge balance recovers exactly the scalar form used before:

```
m_Na + m_H - Kw_c/m_H - m_A,tot * Ka_c/(Ka_c + m_H) = 0
```

The scalar structure was right. **What was wrong is that `Kw_c` and `Ka_c`
depend on `I`, which depends on the speciation, which depends on them.** The
earlier spike treated them as constants. This one closes the loop.

`sqrt` is used here. In Python it is correctly rounded. In JavaScript it is
also correctly rounded as of the July 2024 spec change — see
`spikes/numeric-policy`.

## Results

Run: `py -3.12 solve.py`. Python 3.12.0, **18/18 checks pass**.

| Check | Computed | Reference | Δ | Tol |
|---|---|---|---|---|
| Acetate buffer 0.1 mol/kg vs IUPAC | 4.6379 | 4.6440 | −0.0061 | ±0.02 |
| Acetate buffer 0.01 mol/kg vs IUPAC | 4.7018 | 4.7130 | −0.0112 | ±0.02 |
| Half-equivalence analytic identity | 4.6598 | 4.6593 | +0.0005 | ±0.005 |
| Strong acid/base, acid excess (3 cases) | — | analytic | <1e-9 | ±1e-9 |
| Strong acid/base, base excess (2 cases) | — | analytic | <1e-9 | ±1e-9 |
| `−lg c(H⁺)` for 0.1 M HCl | 0.9993 | 1.0000 | −0.0007 | ±0.01 |
| Thermodynamic pH for 0.1 M HCl | 1.1064 | 1.1061 | +0.0003 | ±0.02 |
| 1e-8 mol/kg HCl | 6.9783 | 6.978 | +0.0003 | ±0.02 |
| Molality vs molarity, worst over domain | 0.00077 pH | — | — | <0.005 |
| Charge conservation | 1.39e-17 mol/kg | 0 | — | <1e-14 |
| Element (A-group) conservation | 0.00e+00 mol/kg | 0 | — | <1e-15 |
| Outer residual monotone (sampled) | 0/7 non-monotone | — | — | 0 |
| 0.6 mol/kg HCl refused | `MODEL_OUT_OF_DOMAIN` | — | — | — |

## Findings

**F1 — Self-consistency barely changes the buffer answer, and that is the point.**
0.1 M acetate gives 4.6379 self-consistently and 4.6379 with the old post-hoc
correction. The earlier spike was *numerically lucky* here, not correct. For the
buffer the old method was right by accident; for other cases it is not, and it
had no way to know the difference. Correctness now comes from the formulation
rather than from the case being forgiving.

**F2 — The thermodynamic pH of 0.1 M HCl is 1.106, not 1.000.** This is the most
consequential finding for the product. Charge balance forces `m_H = m_Cl` for a
pure strong acid, so the activity coefficient shifts pH by exactly
`−log10(g_H) = +0.107` at I = 0.10. The familiar "pH = 1" is `−lg c(H⁺)`, a
statement about **concentration**, not about pH. `GOAL.md` §5.1 permits a
teaching view to prefer the school heuristic — but only if it is labelled and the
underlying scientific state is not falsified. `SPEC-0001` now carries **two
distinct quantities**: `−lg c(H⁺)` for the taught view and `pH = −log10 a(H⁺)`
for the scientific view. They must never be silently identified.

**F3 — The `pH = pKa` half-equivalence identity is wrong under activity.** The
correct form is `pH = pKa + log10(g_A)`, which at I = 0.05 gives
`4.7447 − 0.0853 = 4.6594`, matching the solver to 0.0005. This is a genuine
correction to the earlier spike, which tested the activity-free identity.

**F4 — Activity enters through whichever ion carries the excess.** Two checks in
this spike initially failed because the analytic reference used `g_H` in the
base-excess regime. The correct relation there is `pH = 14 + log10(m_OH) + log10(g_OH)`.
Measured at f = 1.1: solver 11.5910 vs the corrected analytic 11.5910; the
`g_H`-form gave 11.7646, wrong by 0.17 pH. Recorded because it is exactly the
kind of sign error that would otherwise ship as a "reference value".

**F5 — The molality/molarity distinction is real but below our tolerance.**
Measured over the supported domain, the worst difference is **0.00077 pH**,
against a stated tolerance of ±0.02. So v0 can hold thermodynamics in molality
(the correct basis) while the taught view speaks in mol/L, and the discrepancy is
two orders of magnitude inside the noise. This is measured, not assumed.

**F6 — `g_HA = 1` is not the dominant residual.** A Setchenow salting term would
contribute roughly `+0.02` to `log10(g_HA)` at I = 0.1, moving the buffer result
from 4.6379 to 4.6579. Both lie inside the ±0.02 band around 4.644. The residual
is therefore dominated by Davies-vs-Bates–Guggenheim, not by neglecting the
neutral-species term. The approximation is recorded and bounded rather than
quietly dropped.

**F7 — The outer residual is monotone on every case tested.** Bisection needs
only a sign change, but a second root would silently return the wrong one. The
bracket was sampled across seven regimes and found strictly increasing in all of
them. This is **numerically verified, not analytically proven**, and is stated as
such.

## Numerical structure (carried into M4)

- Bracketing uses the ideal (γ = 1) root and expands by factors of 3, 10, 100,
  1000. A wide fixed bracket does not work: far from the root, `m_OH = Kw_c/m_H`
  becomes enormous and the implied `I` leaves the Davies domain, so the residual
  cannot be evaluated at all. Activity shifts `m_H` by only a small factor, so the
  narrow bracket always contains the root.
- At bracket endpoints only the **sign** matters, and the sign is dominated by the
  leading `±(m_H − m_Cl − m_A)` or `±m_OH` term, so a slightly out-of-domain γ
  there cannot flip it.
- The inner ionic-strength loop is a damped fixed point. It is a contraction with
  a small slope in this domain.
- **M4 improvement to make:** replace fixed-point with a bracketed inner solve so
  convergence is guaranteed rather than observed, and use a two-part (Cody–Waite)
  argument reduction in the deterministic `exp10`.

## Reproduce

```
cd spikes/activity-equilibrium
py -3.12 solve.py
```

Expected: `RESULT: 18/18 checks`.
