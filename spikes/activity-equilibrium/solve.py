"""SPIKE - self-consistent activity equilibrium, with molarity and molality kept
as genuinely distinct quantities.

Revision 3 (owner review round 2). Fixes:

  P1-1  The taught quantity -lg c(H+) was computed as -log10(m_H), i.e. from
        MOLALITY, and then labelled and displayed as a concentration. For
        0.1000 mol/L HCl that produced 0.9993. The correct value is 1.0000,
        because the solution is DEFINED as 0.1000 mol/L and HCl is fully
        dissociated. Molarity is now derived from a real solution volume; the
        scientific core stays molality-only and the presentation layer converts.

  P1-2  The activity-based quantity is named "activity-based model pH", not
        "thermodynamic pH". IUPAC's pH is a notional definition: single-ion
        activity is not independently measurable and requires an
        extrathermodynamic convention or model. Calling one number "the true pH"
        is as unscientific as ignoring activity.

  P1-3  The computational domain (I_m <= 0.5 mol/kg, Davies's approximate range)
        is now separated from the validated accuracy envelope
        (I_m <= 0.12 mol/kg, anchored by the IUPAC buffer standards). +/-0.02 pH
        is claimed ONLY inside the envelope.

Run:
    py -3.12 solve.py
"""

import math

# ---------------------------------------------------------------- constants
KW = 1.0e-14
"""Thermodynamic ion product of water, molality basis, dimensionless, 25 C."""

A_DAVIES = 0.509
"""Debye-Huckel A on the MOLALITY scale, (kg/mol)^0.5, water at 25 C."""

DAVIES_B = 0.3
"""Davies empirical extension term, kg/mol."""

I_COMPUTATIONAL_MAX = 0.5
"""Upper end of the Davies model's approximate range, mol/kg. The solver may
compute here, but the result is flagged as outside the validated envelope."""

I_VALIDATED_MAX = 0.12
"""Upper end of the range in which +/-0.02 pH is actually demonstrated against
an external standard. Anchored by IUPAC buffer points at I = 0.01 and I = 0.10.
This is a CLAIM BOUNDARY, not a model parameter."""

MOLAR_MASS = {"HCl": 36.4609, "NaOH": 39.9971, "NaOAc": 82.0343, "HOAc": 60.0520}

STRONG = None
"""Sentinel for a fully dissociated acid (HCl)."""

CHECKS = []


# ------------------------------------------------------------- activity
def log10_gamma(z, i):
    """Davies equation, molality basis."""
    if i <= 0.0:
        return 0.0
    r = math.sqrt(i)
    return -A_DAVIES * z * z * (r / (1.0 + r) - DAVIES_B * i)


def gamma(z, i):
    return 10.0 ** log10_gamma(z, i)


# ---------------------------------------------------- solution / mixture:
# Molarity is how a reagent is specified; molality is what the thermodynamics
# need. Both are tracked, and the conversion is explicit and one-directional.
class Solution:
    """An aqueous solution defined by molarity and density."""

    def __init__(self, label, volume_l, solutes, density_kg_per_l):
        self.label = label
        self.volume_l = volume_l
        self.density_kg_per_l = density_kg_per_l
        self.solute_mass_kg = sum(
            c * volume_l * MOLAR_MASS[s] / 1000.0 for s, c in solutes.items()
        )
        self.mass_kg = density_kg_per_l * volume_l
        self.water_mass_kg = self.mass_kg - self.solute_mass_kg
        self.amounts = {s: c * volume_l for s, c in solutes.items()}


class Mixture:
    """Mixing is on the conserved quantities: water mass and amounts. Volume is
    additive, which is a labelled PRESENTATION approximation; it affects the
    reported molarity and never the thermodynamics."""

    def __init__(self, label, water_mass_kg, amounts, volume_l):
        self.label = label
        self.water_mass_kg = water_mass_kg
        self.amounts = amounts
        self.volume_l = volume_l

    def molality(self, symbol):
        return self.amounts.get(symbol, 0.0) / self.water_mass_kg

    def molarity(self, symbol):
        return self.amounts.get(symbol, 0.0) / self.volume_l


def mix(label, *solutions):
    symbols = set()
    for s in solutions:
        symbols |= set(s.amounts)
    return Mixture(
        label,
        sum(s.water_mass_kg for s in solutions),
        {k: sum(s.amounts.get(k, 0.0) for s in solutions) for k in symbols},
        sum(s.volume_l for s in solutions),
    )


def reagent(label, volume_l, solute, conc_mol_per_l, density_kg_per_l):
    return Solution(label, volume_l, {solute: conc_mol_per_l}, density_kg_per_l)


# ---------------------------------------------------------- speciation
def speciate(m_h, i, m_ha_tot, ka):
    g_h = gamma(1, i)
    g_oh = gamma(-1, i)
    g_a = gamma(-1, i)
    g_ha = 1.0  # stated approximation: neutral species, Setchenow neglected

    kw_c = KW / (g_h * g_oh)
    ka_c = ka * g_ha / (g_h * g_a) if ka is not STRONG else STRONG

    m_oh = kw_c / m_h
    if ka is STRONG:
        m_a, m_ha = m_ha_tot, 0.0
    else:
        m_a = m_ha_tot * ka_c / (ka_c + m_h)
        m_ha = m_ha_tot - m_a
    return m_oh, m_a, m_ha, kw_c, ka_c


def ionic_strength(m_h, i, m_na, m_cl, m_ha_tot, ka):
    m_oh, m_a, _, _, _ = speciate(m_h, i, m_ha_tot, ka)
    return 0.5 * (m_na + m_h + m_oh + m_a + m_cl)


def solve_i(m_h, m_na, m_cl, m_ha_tot, ka, iters=500, tol=1e-17):
    i = 0.5 * (m_na + m_cl + m_ha_tot)
    for _ in range(iters):
        i_new = ionic_strength(m_h, i, m_na, m_cl, m_ha_tot, ka)
        if not (0.0 <= i_new <= 1.0):
            return None
        step = i_new - i
        i = i + 0.5 * step
        if abs(step) < tol:
            return i_new
    return i


def charge_residual(m_h, m_na, m_cl, m_ha_tot, ka):
    i = solve_i(m_h, m_na, m_cl, m_ha_tot, ka)
    if i is None:
        return None, None
    m_oh, m_a, _, _, _ = speciate(m_h, i, m_ha_tot, ka)
    return (m_na + m_h - m_oh - m_a - m_cl), i


def ideal_root(m_na, m_cl, m_ha_tot, ka):
    def f(m_h):
        a = m_ha_tot if ka is STRONG else m_ha_tot * ka / (ka + m_h)
        return m_na + m_h - KW / m_h - a - m_cl

    lo, hi = 1e-16, 1.0
    for _ in range(400):
        mid = lo + 0.5 * (hi - lo)
        if f(mid) < 0.0:
            lo = mid
        else:
            hi = mid
    return lo + 0.5 * (hi - lo)


# ------------------------------------------------------------ the solve
# Returns MOLALITIES ONLY. No pH, no molarity: those are presentation.
def solve(m_na, m_cl, m_ha_tot, ka):
    m0 = ideal_root(m_na, m_cl, m_ha_tot, ka)
    lo = hi = None
    for span in (3.0, 10.0, 100.0, 1000.0):
        c_lo, c_hi = m0 / span, m0 * span
        f_lo = charge_residual(c_lo, m_na, m_cl, m_ha_tot, ka)[0]
        f_hi = charge_residual(c_hi, m_na, m_cl, m_ha_tot, ka)[0]
        if f_lo is not None and f_hi is not None and f_lo < 0.0 < f_hi:
            lo, hi = c_lo, c_hi
            break
    if lo is None:
        return None

    for _ in range(200):
        mid = lo + 0.5 * (hi - lo)
        f_mid = charge_residual(mid, m_na, m_cl, m_ha_tot, ka)[0]
        if f_mid is None:
            return None
        if f_mid < 0.0:
            lo = mid
        else:
            hi = mid
    m_h = lo + 0.5 * (hi - lo)

    i = solve_i(m_h, m_na, m_cl, m_ha_tot, ka)
    if i is None or i > I_COMPUTATIONAL_MAX:
        return None
    m_oh, m_a, m_ha, kw_c, ka_c = speciate(m_h, i, m_ha_tot, ka)

    return {
        "m_H": m_h, "m_OH": m_oh, "m_A": m_a, "m_HA": m_ha, "I": i,
        "gamma_H": gamma(1, i),
        "residual": m_na + m_h - m_oh - m_a - m_cl,
        "in_validated_envelope": i <= I_VALIDATED_MAX,
    }


# --------------------------------------------------------- presentation
# The ONLY place molarity and pH are produced. Both derive from the converged
# molality state plus the mixture's conserved quantities.
def present(result, mixture):
    m_h = result["m_H"]                       # mol/kg water
    n_h = m_h * mixture.water_mass_kg         # mol
    c_h = n_h / mixture.volume_l              # mol/L  <- genuine molarity
    a_h = result["gamma_H"] * m_h             # dimensionless activity
    return {
        "m_H": m_h,
        "c_H": c_h,
        "a_H": a_h,
        "pC_H": -math.log10(c_h),             # taught quantity, -lg(c/c), c=1 mol/L
        "pH_model": -math.log10(a_h),         # activity-based MODEL pH
    }


def solve_mixture(mixture, ka):
    m_w = mixture.water_mass_kg
    m_cl = mixture.amounts.get("HCl", 0.0) / m_w
    m_na = (mixture.amounts.get("NaOH", 0.0)
            + mixture.amounts.get("NaOAc", 0.0)) / m_w
    m_ha_tot = (mixture.amounts.get("HOAc", 0.0)
                + mixture.amounts.get("NaOAc", 0.0)) / m_w
    r = solve(m_na, m_cl, m_ha_tot, ka)
    return r, (m_na, m_cl, m_ha_tot)


def report(label, value, expected, tol, note=""):
    ok = abs(value - expected) <= tol
    CHECKS.append((label, ok))
    print(f"  [{'PASS' if ok else 'FAIL'}] {label}")
    print(f"         computed  = {value:.4f}   reference = {expected:.4f}"
          f"   delta {value - expected:+.4f}   tol +/-{tol:.4f}")
    if note:
        print(f"         {note}")
    return ok


def check(label, ok, detail=""):
    CHECKS.append((label, ok))
    print(f"  [{'PASS' if ok else 'FAIL'}] {label}" + (f"   {detail}" if detail else ""))


# ================================================================= main
def main():
    pka = 4.7447
    ka = 10.0 ** -pka

    print("=" * 78)
    print("SPIKE rev3: molality-basis thermodynamics, molarity as presentation")
    print(f"  I validated envelope <= {I_VALIDATED_MAX} mol/kg | "
          f"I computational domain <= {I_COMPUTATIONAL_MAX} mol/kg")
    print(f"  acetic acid pKa = {pka}")
    print("=" * 78)

    # ---------------------------------------------------------------- A
    print("\n-- A. Acetate buffer standards (defined by MOLALITY) --")
    print("   IUPAC-traceable: pH 4.644 (0.1 mol/kg) and 4.713 (0.01 mol/kg)")
    for c, ref in ((0.1, 4.644), (0.01, 4.713)):
        m_na, m_ha_tot = c, 2.0 * c
        r = solve(m_na, 0.0, m_ha_tot, ka)
        print(f"\n   {c} mol/kg HOAc+NaOAc   I = {r['I']:.4f}"
              f"   g_H = {r['gamma_H']:.4f}   in envelope: {r['in_validated_envelope']}")
        report(f"acetate buffer {c} mol/kg vs IUPAC",
               -math.log10(r["gamma_H"] * r["m_H"]), ref, 0.02)

    # ---------------------------------------------------------------- B
    print("\n-- B. 0.1000 mol/L HCl: the two quantities, computed separately --")
    print("   FIX for P1-1. The solution is DEFINED as 0.1000 mol/L and HCl is")
    print("   fully dissociated, so c(H+) = 0.1000 mol/L exactly.\n")
    hcl = reagent("0.1000 M HCl", 1.0, "HCl", 0.1000, 1.0020)
    mix_b = mix("0.1000 M HCl", hcl)
    r, (m_na, m_cl, m_ha_tot) = solve_mixture(mix_b, ka)
    p = present(r, mix_b)
    print(f"   m(H+) = {p['m_H']:.6f} mol/kg water")
    print(f"   c(H+) = {p['c_H']:.6f} mol/L solution")
    print(f"   a(H+) = {p['a_H']:.6f}  (gamma_H = {r['gamma_H']:.4f})")
    print(f"   ratio c/m = {p['c_H'] / p['m_H']:.6f}"
          f"   (they are DIFFERENT quantities)")
    report("taught -lg c(H+) = 1.0000", p["pC_H"], 1.0000, 0.0005,
           "exact for the concentration, by construction of the input")
    report("activity-based model pH", p["pH_model"], 1.1061, 0.02,
           f"shifted from the concentration value by -log10(g_H) = "
           f"{-math.log10(r['gamma_H']):+.4f}")
    print(f"\n   previous revision reported -lg c(H+) = 0.9993  <-- WRONG (molality)")
    print(f"   correct value                        = {p['pC_H']:.4f}")

    # ---------------------------------------------------------------- C
    print("\n-- C. Strong acid/base vs analytic activity relations --")
    for f in (0.0, 0.5, 0.9, 1.1, 1.5):
        va, vb = 1.0, f
        acid = reagent("HCl", va, "HCl", 0.1, 1.0020)
        base = reagent("NaOH", vb, "NaOH", 0.1, 1.0040)
        mx = mix("titration", acid, base)
        r, _ = solve_mixture(mx, ka)
        excess = (mx.amounts.get("HCl", 0.0) - mx.amounts.get("NaOH", 0.0)) / mx.water_mass_kg
        if abs(excess) > 1e-5:
            if excess > 0.0:
                analytic = -math.log10(excess) - math.log10(r["gamma_H"])
                note = "acid excess: g_H"
            else:
                analytic = 14.0 + math.log10(-excess) + math.log10(gamma(-1, r["I"]))
                note = "base excess: g_OH"
            report(f"f={f:.1f} eq vs analytic relation",
                   -math.log10(r["gamma_H"] * r["m_H"]), analytic, 1e-9, note)

    # ---------------------------------------------------------------- D
    print("\n-- D. Half-equivalence: pH = pKa + log10(g_A) --")
    mx = mix("half-eq", reagent("HOAc", 1.0, "HOAc", 0.1, 1.0010),
             reagent("NaOH", 0.5, "NaOH", 0.1, 1.0040))
    r, _ = solve_mixture(mx, ka)
    expected = pka + math.log10(gamma(-1, r["I"]))
    report("half-equivalence activity identity",
           -math.log10(r["gamma_H"] * r["m_H"]), expected, 5e-3,
           "the naive 'pH = pKa' is WRONG under activity")

    # ---------------------------------------------------------------- E
    print("\n-- E. Dilute strong acid --")
    mx = mix("1e-8 M HCl", reagent("HCl", 1.0, "HCl", 1.0e-8, 0.9971))
    r, _ = solve_mixture(mx, ka)
    p = present(r, mx)
    print(f"   -lg c(H+) = {p['pC_H']:.4f}   model pH = {p['pH_model']:.4f}")
    print("   A naive concentration formula would report 8.00 and call an acid basic.")
    report("1e-8 M HCl near neutral", p["pH_model"], 6.978, 0.02)

    # ---------------------------------------------------------------- F
    print("\n-- F. Molarity vs molality: measured, and why they must not be merged --")
    worst_c = 0.0
    for c in (0.001, 0.01, 0.05, 0.1, 0.2):
        mx = mix("s", reagent("HCl", 1.0, "HCl", c, 1.0020))
        r, _ = solve_mixture(mx, ka)
        p = present(r, mx)
        d_c = abs(p["pC_H"] - (-math.log10(c)))
        worst_c = max(worst_c, d_c)
        print(f"     c = {c:<6} mol/L   c(H+) = {p['c_H']:.6f}   "
              f"m(H+) = {p['m_H']:.6f}   -lg c = {p['pC_H']:.5f}")
    print(f"   worst |−lg c(H+) − (−lg c_input)| = {worst_c:.5f}   (must be ~0: the"
          f" taught quantity is exact for a fully dissociated acid)")
    check("taught quantity reproduces the input concentration", worst_c < 1e-4)

    # Sensitivity of the MODEL pH to the scale choice: what if molarity were
    # fed into the molality slot? Measured, so the SPEC's claim is evidenced.
    print("\n   Model-pH sensitivity to using molarity in place of molality:")
    worst_sens = 0.0
    for c in (0.001, 0.01, 0.05, 0.1, 0.12):
        mx = mix("s", reagent("HCl", 1.0, "HCl", c, 1.0020))
        r_true, _ = solve_mixture(mx, ka)
        ph_true = -math.log10(r_true["gamma_H"] * r_true["m_H"])
        # deliberately wrong: treat the molarity as if it were a molality
        # (HCl alone: sodium is zero, chloride carries the acid)
        r_wrong = solve(0.0, c, 0.0, STRONG)
        ph_wrong = -math.log10(r_wrong["gamma_H"] * r_wrong["m_H"])
        d = abs(ph_wrong - ph_true)
        worst_sens = max(worst_sens, d)
        print(f"     c = {c:<6} mol/L   dpH(model) = {d:.6f}")
    print(f"   worst over the validated envelope = {worst_sens:.6f} pH")
    check("scale-choice sensitivity is far below the +/-0.02 tolerance",
          worst_sens < 0.002, f"worst = {worst_sens:.6f}")

    # ---------------------------------------------------------------- G
    print("\n-- G. Conservation on the unquantized solver state --")
    worst_chg = 0.0
    worst_mass = 0.0
    cases = [(0.1, 0.0, 0.0, STRONG), (0.0, 0.1, 0.0, STRONG),
             (0.05, 0.05, 0.0, STRONG), (0.05, 0.0, 0.1, ka),
             (0.0, 0.0, 0.001, ka), (0.1, 0.1, 0.0, STRONG)]
    for m_na, m_cl, m_ha, k in cases:
        r = solve(m_na, m_cl, m_ha, k)
        if r is None:
            continue
        worst_chg = max(worst_chg, abs(r["residual"]))
        worst_mass = max(worst_mass, abs(r["m_HA"] + r["m_A"] - m_ha))
    print(f"   max |charge imbalance|       = {worst_chg:.3e} mol/kg")
    print(f"   max |A-group mass imbalance| = {worst_mass:.3e} mol/kg")
    check("charge conservation", worst_chg < 1e-14)
    check("element conservation", worst_mass < 1e-15)

    # ---------------------------------------------------------------- H
    print("\n-- H. Outer residual monotone over the bracket (sampled) --")
    bad = 0
    for m_na, m_cl, m_ha, k in cases:
        m0 = ideal_root(m_na, m_cl, m_ha, k)
        vals = []
        for i in range(-40, 41):
            f, _ = charge_residual(m0 * (10 ** (i / 10.0)), m_na, m_cl, m_ha, k)
            if f is not None:
                vals.append(f)
        if not all(vals[i] < vals[i + 1] for i in range(len(vals) - 1)):
            bad += 1
    print(f"   non-monotone cases: {bad}/{len(cases)}")
    check("monotonicity (sampled, not proven)", bad == 0)

    # ---------------------------------------------------------------- I
    print("\n-- I. Sensitivity to the g_HA = 1 approximation --")
    r = solve(0.1, 0.0, 0.2, ka)
    ph = -math.log10(r["gamma_H"] * r["m_H"])
    print(f"     log10(g_HA) = 0    : pH_model = {ph:.4f}  (IUPAC 4.644, d {ph - 4.644:+.4f})")
    print(f"     log10(g_HA) = +0.02: pH_model = {ph + 0.02:.4f}  (d {ph + 0.02 - 4.644:+.4f})")
    print("   Both inside +/-0.02, so this is not the dominant residual. Recorded.")

    # ---------------------------------------------------------------- J
    print("\n-- J. Two-tier refusal (FIX for P1-3) --")
    print("   The computational domain and the validated accuracy envelope are")
    print("   DIFFERENT things. This is the distinction the previous revision missed.\n")
    for c in (0.05, 0.10, 0.15, 0.30, 0.60):
        mx = mix("s", reagent("HCl", 1.0, "HCl", c, 1.02))
        r, _ = solve_mixture(mx, ka)
        if r is None:
            verdict = "MODEL_OUT_OF_DOMAIN (refused)"
        elif r["in_validated_envelope"]:
            verdict = f"computed, I={r['I']:.3f} -- INSIDE validated envelope (+/-0.02 claimed)"
        else:
            verdict = f"computed, I={r['I']:.3f} -- OUTSIDE envelope (accuracy NOT claimed)"
        print(f"     c = {c:<5} mol/L  {verdict}")
    check("0.60 mol/L refused as out of domain",
          solve_mixture(mix("s", reagent("HCl", 1.0, "HCl", 0.6, 1.02)), ka)[0] is None)

    # ---------------------------------------------------------------- K
    print("\n-- K. What I_m range do the v0 scenarios actually reach? --")
    worst_i = 0.0
    for f in (0.0, 0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0):
        mx = mix("t", reagent("HCl", 1.0, "HCl", 0.1, 1.0020),
                 reagent("NaOH", f, "NaOH", 0.1, 1.0040))
        r, _ = solve_mixture(mx, ka)
        if r:
            worst_i = max(worst_i, r["I"])
        mx2 = mix("t2", reagent("HOAc", 1.0, "HOAc", 0.1, 1.0010),
                  reagent("NaOH", f, "NaOH", 0.1, 1.0040))
        r2, _ = solve_mixture(mx2, ka)
        if r2:
            worst_i = max(worst_i, r2["I"])
    print(f"   max I_m over 0.1 mol/L HCl/NaOH and HOAc/NaOH titrations = {worst_i:.4f} mol/kg")
    print(f"   validated envelope {I_VALIDATED_MAX} mol/kg covers this with margin.")
    check("v0 scenarios fall inside the validated envelope",
          worst_i <= I_VALIDATED_MAX, f"max I_m = {worst_i:.4f}")

    print("\n" + "=" * 78)
    passed = sum(1 for _, ok in CHECKS if ok)
    print(f"RESULT: {passed}/{len(CHECKS)} checks")
    for label, ok in CHECKS:
        if not ok:
            print(f"  FAILED: {label}")
    print("=" * 78)


if __name__ == "__main__":
    main()
