# Research: scientific solver landscape for the acid-base slice

- **Date:** 2026-09-11 (revised after owner review remediation)
- **Status:** Investigation complete. Informs `ADR-0003`. Not itself a decision.
- **Question:** which scientific software, if any, should back the acid-base
  titration slice and the later Al(III)/Fe(III) stress cases?

> **Revision note.** Two conclusions from the first version were corrected after
> owner review, and one was made more precise:
>
> 1. **The molality basis is now matched to PHREEQC**, not merely nominated. The
>    original recommended molality for correctness but did not note that PHREEQC
>    also works in molality — which is what makes the oracle comparison test the
>    physics rather than a convention difference.
> 2. **The reference values in the table below changed.** Self-consistent
>    activity (§1) moves the strong-acid figure, and one secondary source value
>    (8.87) was wrong (§5).
> 3. **A third reference case was added**: the taught `−lg c(H⁺)` and the
>    thermodynamic pH are different quantities for the same solution. This is now
>    the single most consequential scientific fact for the product, and the
>    original version of this document did not mention it at all.

## Summary

For the bounded domain of acid-base titration in dilute aqueous solution at
25 °C, **a hand-written exact solver is justified and more defensible than
adopting a general speciation package.** `spikes/activity-equilibrium`
demonstrates it: the self-consistent activity solve reproduces analytic activity
relations to better than 1e-9 pH and IUPAC-traceable acetate buffer standards to
within 0.012 pH, on the same **molality** basis PHREEQC uses internally.

PHREEQC remains the right tool for the *later* multi-component cases. It is not
needed now, and putting it on the runtime path would force a server, contradicting
the owner's hybrid decision.

Two candidate libraries are actively harmful for this project and are ruled out.

## 1. The rigorous formulation

For a monoprotic acid HA (analytical **molality** `m_A,tot`) plus strong base
giving `m_Na` sodium, in water:

```
charge balance:    m_Na + m_H = m_OH + m_A + m_Cl
mass balance:      m_A,tot  = m_HA + m_A
acid dissociation: Ka = a_H·a_A / a_HA
water:             Kw = a_H·a_OH
activities:        a_i = γ_i · (m_i / m°),   m° = 1 mol/kg
ionic strength:    I = 0.5 · Σ m_i z_i²
Davies:            log₁₀γᵢ = −A z_i² ( √I/(1+√I) − b I )
```

**Activities are not optional and not post-hoc.** `Ka` and `Kw` are defined on
activities; substituting concentrations into them silently redefines the
constants. Substituting the *conditional* constants
`Kw_c = Kw/(γ_H γ_OH)` and `Ka_c = Ka·γ_HA/(γ_H γ_A)` into the charge balance
recovers a single scalar equation:

```
m_Na + m_H − Kw_c/m_H − m_A,tot·Ka_c/(Ka_c + m_H) = 0
```

The scalar structure is convenient, but `Kw_c` and `Ka_c` **depend on `I`, which
depends on the speciation, which depends on them.** An implementation that treats
them as constants — the superseded `spikes/solver-validation` did exactly this —
is solving a different, inconsistent model. The correct problem has two unknowns,
`(m_H, I)`, solved simultaneously.

For fixed `I` the residual is **strictly increasing** in `m_H` (its derivative is
`1 + Kw_c/m_H² + m_A,tot·Ka_c/(Ka_c+m_H)² > 0`), so a bracketed method converges
without an initial guess — a materially better numerical position than the
modified Newton–Raphson on log-activities that general packages must use. With
`I` coupled, monotonicity is **numerically verified over the sampled domain**
rather than proven analytically, and is stated as such.

**Standard state and scale.** Solute standard state is the hypothetical ideal
unit-molality solution; solvent is pure water with `a_w = 1`. Molality (mol/kg
water) is chosen because it is the basis on which thermodynamic `Ka` and `Kw` are
tabulated and the basis PHREEQC uses. Molarity is a presentation quantity. Full
treatment in `docs/science/quantity-ontology.md`.

### Where Henderson–Hasselbalch fails

`pH = pKa + log([A⁻]/[HA])` assumes `Kw` is negligible, `[A⁻] ≈ C_B`, and
`[HA] ≈ C_A − C_B`. It is adequate only in the buffer plateau (`pKa ± 1`) when
concentrations exceed ~1e-4 M. It fails:

- near equivalence, where the correct pH requires hydrolysis of the conjugate base;
- below ~1e-4 M, where water contributes materially;
- in the strong-acid and strong-base regions;
- for acids with `Ka > 1e-2`.

Measured in the spike: at 1e-6 M acetic acid, HH gives 5.37 and the exact solve
gives 6.02 — a **0.65 pH error**. This is exactly the "plausible but numerically
wrong" output `GOAL.md` §5.2 prohibits.

## 2. Library assessment

| Library | License | Windows install | Verdict for this project |
|---|---|---|---|
| **PHREEQC / IPhreeqc** (USGS) | Public domain / CC0 | Official x64 `.msi`; needs MSVC redistributable | **Adopt later as oracle and adapter.** Clean license, self-contained. |
| **phreeqpython** (Vitens) | *Not confirmed* | `pip`, 64-bit only, bundles a binary | Usable, but license unverified. **Prefer the PHREEQC CLI in batch mode**, which has no third-party binding and no license ambiguity. |
| **phreeqpy** | BSD | No 64-bit Windows library | Windows gap. Reject. |
| **Reaktoro** | LGPL-2.1 | **conda-forge only**; source build needs CMake + MSVC, known Windows build issues | No clean pip wheel. Heavy. **Defer.** |
| **Cantera** | BSD-3 | pip, cp310–cp314 wheels | **Wrong tool.** Its electrolyte model cannot impose fixed pH or charge-balancing constraints. |
| **chempy** | BSD-2 | Pure Python | Last release >2 years ago. Abandoned. |
| **thermo** (Caleb Bell) | MIT | pip/conda | Chemical-engineering phase equilibria, not aqueous titration pH. Not applicable. |
| **pyEQL** | LGPL **but transitively pulls GPL-3 `iapws`** | Docs recommend WSL on Windows | **Reject.** License contamination plus Windows hostility. |
| **iapws** | **GPL-3.0** | Pure Python | **Reject.** Viral copyleft; also unnecessary, since the slice is fixed at 25 °C. |
| **pymatgen** | MIT | pip, active | Overkill. Reject for this slice. |
| **RDKit** | BSD-3 | pip, ~500 MB extracted | No aqueous equilibrium. Irrelevant here; revisit for organic graph chemistry. |

### License notes

- No candidate is AGPL, so AGPL §13 does not bind the project's own code.
- The GPL-3 landmine is `iapws`, reached transitively through `pyEQL`. Avoid the
  chain entirely.
- PHREEQC's core is USGS public domain, but its *binary* bundles third-party
  components (a Basic interpreter, SUNDIALS/CVODE, ZedGraph) that may carry
  LGPL/GPL/BSD terms. **If the PHREEQC binary is ever redistributed rather than
  installed by the user, that bundle must be audited.** Recorded as an open item,
  not a blocker: the oracle runs locally in CI/developer machines.
- `phreeqpython`'s license could not be confirmed from a primary source and must
  be checked before use. This is part of why the CLI route is preferred.

## 3. Determinism

None of the assessed solvers use RNG, so all are deterministic in principle.
Caveats:

- **PHREEQC** uses a modified Newton–Raphson with a defined convergence tolerance
  (default `G_TOL = 1e-8`, adjustable). On non-convergence it tries up to 12
  fallback parameter sets — deterministic, but input-sensitive.
- **Cantera** is tolerance-dependent and offers no global seed.
- Cross-platform floating-point differences are possible in all of them.
- **A single-threaded, double-precision, hand-written solve using only
  exactly-specified IEEE-754 operations is the most reproducible option
  available** — see `ADR-0007`.

This is a decisive point in favour of the hand-written runtime solver: it is not
merely adequate, it is *more* reproducible than the alternatives.

## 4. Precision comparison

- PHREEQC's default convergence tolerance is 1e-8 relative on mass-balance
  residuals. It is adjustable but floor-limited by machine precision.
- A bisection on the charge balance in double precision reaches machine
  precision in `[H⁺]` — far beyond the ±0.005 pH accuracy of a real glass
  electrode.
- **PHREEQC's advantage for this domain is not pH precision. It is activity
  models and curated, provenance-tracked log K databases.** That advantage
  becomes decisive only for multi-component speciation with solid phases.

## 5. Validation anchors

| Anchor | Value at 25 °C | Provenance | Usable as |
|---|---|---|---|
| Acetate buffer, 0.1 mol/kg HOAc / 0.1 mol/kg NaOAc | **pH 4.644 ± 0.003** | IUPAC-traceable, reproduced in GOST 8.134-98 | Primary reference case |
| Acetate buffer, 0.01 mol/kg / 0.01 mol/kg | **pH 4.713** | Same | Primary reference case |
| Half-equivalence | `pH = pKa + log₁₀ γ_A` | Analytic activity identity | Correct form (NOT `pH = pKa`) |
| Strong acid/base, acid excess | `pH = −log₁₀ m_H − log₁₀ γ_H` | Analytic activity relation | Independent cross-check |
| Strong acid/base, base excess | `pH = 14 + log₁₀ m_OH + log₁₀ γ_OH` | Analytic activity relation | Independent cross-check |
| **0.1 M HCl — taught quantity** | **`−lg c(H⁺) = 1.0000`** | Definition of the taught quantity | Separate reference case |
| **0.1 M HCl — thermodynamic pH** | **pH 1.1064** | `−log₁₀ a(H⁺)`, γ_H = 0.7815 | Separate reference case |
| 0.1 M HOAc equivalence | pH 8.72 | Textbook closed form `7 + ½(pKa + log C)` | Cross-check only — see below |

**The two 0.1 M HCl rows are not a mistake and not a rounding artifact.** They
are two different physical quantities that both get called "pH" in different
contexts. `SPEC-0001` REF-5 and REF-6 keep them side by side precisely so a
future contributor cannot "fix" one to agree with the other. Full treatment in
`docs/science/quantity-ontology.md`.

**Activity functions are no longer post-hoc.** The analytic relations above are
what the self-consistent solve reproduces to <1e-9 pH; they are identities that
verify the activity coupling is wired correctly, not independent validation of
the model. Only the IUPAC buffer values and the M4 oracle validate the model.
Note in particular that **activity enters base-excess regimes through `γ_OH`, not
`γ_H`** — the original version of this document's corresponding spike had that
sign wrong.

**Important distinction:** the ±0.003 on the IUPAC buffer value is the
*uncertainty of the standard itself*, not the accuracy our model can claim
against it. Our demonstrated agreement is ~0.012 pH with the Davies activity
model. **A stated model tolerance of ±0.02 pH is defensible; ±0.003 would be
fake precision.**

There is **no single canonical NIST-published titration-curve dataset**. The
defensible anchors are buffer-standard pH values plus activity-based Ka/Kw.
Textbook titration curves are pedagogical, not metrological, and must not be
used as reference data.

### Constants discrepancy to resolve

`Ka = 1.8e-5` implies `pKa = 4.7447`, while textbooks commonly print 4.75 or
4.76. `SPEC-0001` fixes one value with a source and records it in the solver
configuration, because it is part of replay identity (`ADR-0007` §8).

## 6. China deployment

- **PyPI**: official PyPI is often slow or times out. Tsinghua TUNA
  (`pypi.tuna.tsinghua.edu.cn/simple`) and Aliyun mirrors generally work but both
  have intermittency reports. Configure a mirror with a fallback.
- **conda-forge** (required by Reaktoro): mirror stability varies; SUSTech has
  been reported most stable, TUNA has had redirect and mid-transfer failures.
  Another reason to avoid a conda-only dependency.
- **Binary weight**: RDKit ~500 MB extracted; Cantera and pymatgen also pull
  large compiled artifacts. For a lightweight titration slice, prefer a minimal
  dependency set — which the hand-written solver achieves at zero dependencies.
- **PHREEQC databases ship with the source**; vendor the archive locally rather
  than fetching from USGS at runtime.
- **No telemetry** in any assessed library, consistent with `GOAL.md` §5.5.

## 7. Conclusions carried into the ADRs

1. **Runtime solver = hand-written exact charge-balance solve** (`ADR-0003`).
   Justified by the spike, and more reproducible than the alternatives.
2. **Test-time oracle = PHREEQC driven via its own CLI in batch mode**, not
   through a third-party Python binding. Avoids the unverified `phreeqpython`
   license and the 64-bit Windows gap in `phreeqpy`.
3. **Reject `iapws` and `pyEQL` entirely** (GPL-3 contamination).
4. **Defer Reaktoro and Cantera.** Reaktoro for install weight; Cantera because
   it is the wrong tool for aqueous acid-base.
5. **Activity model is mandatory, not optional** — the 0.10 pH gap between
   concentration-only chemistry and the IUPAC buffer standard is the activity
   coefficient (`ADR-0003`, open question 3).
6. **The equivalence-point region of a weak acid has no independent reference**
   and is the one place the spike could not validate. This is an explicit gap in
   `SPEC-0001`, to be closed by the PHREEQC oracle at M4.

## Sources

- PHREEQC public-domain notice — <https://water.usgs.gov/water-resources/software/PHREEQC/NOTICE.TXT>
- PHREEQC numerical method and tolerance — <https://wwwbrr.cr.usgs.gov/projects/GWC_coupled/phreeqc/html/final-12.html>
- PHREEQC Windows README — <https://wwwbrr.cr.usgs.gov/projects/GWC_coupled/phreeqc/README.Win.TXT>
- Reaktoro (LGPL-2.1, conda-only) — <https://github.com/reaktoro/reaktoro>, <https://reaktoro.org/installation/installation-using-cmake.html>
- Cantera license and pip wheels — <https://cantera.org/2.3/sphinx/html/about.html>, <https://cantera.org/dev/_sources/install/pip.md.txt>
- Cantera aqueous-chemistry limitations (Sandia) — <https://www.osti.gov/servlets/purl/970260-uxiXwl/>
- chempy — <https://github.com/bjodah/chempy>
- thermo — <https://github.com/CalebBell/thermo>
- phreeqpython — <https://github.com/Vitens/phreeqpython>
- phreeqpy (Windows gap) — <https://pypi.org/project/phreeqpy/>
- pyEQL (LGPL, WSL recommendation, dependency chain) — <https://pyeql.readthedocs.io/en/v0.8.1/>
- iapws (GPL-3) — <https://iapws.readthedocs.io/en/latest/modules.html>
- RDKit — <https://github.com/rdkit/rdkit>
- PHREEQC database differences — <https://phreeqcusers.org/index.php/topic,1709.msg5715#msg5715>
- IUPAC acetate buffer values (GOST 8.134-98) — <https://meganorm.ru/mega_doc/norm/gost_gosudarstvennyj-standart/26/gost_8_134-98_mezhgosudarstvennyy-standart_gosudarstvennaya.html>
- China mirror status (2026) — <https://github.com/sickn33/agentic-awesome-skills/blob/main/skills/remote-gpu-trainer/references/china-network.md>

## Uncertainties explicitly not resolved

- Exact license of `phreeqpython`.
- Exact certified pH of NIST SRM 191d (withdrawn/commercial form; certificate not
  retrieved). The IUPAC/GOST values above are used instead.
- The complete set of third-party components inside the PHREEQC binary and their
  licenses. Matters only if the binary is redistributed.
- Whether a versioned Reaktoro release tag exists as of 2026.
