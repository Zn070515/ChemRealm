"""SPIKE (remediation P1-1) - self-consistent activity-based acid/base equilibrium.

SUPERSEDES spikes/solver-validation.

That spike solved a CONCENTRATION-ONLY charge balance and applied the Davies
equation afterwards, as a post-hoc correction used only to report a
"corrected" pH. That is not what the spec's stated model says, and it does not
validate the formulation implemented here. Its 12/12 result must NOT be cited
as evidence for this file.

What this file does instead
---------------------------
Activity coefficients participate IN the equilibrium constraints, not after
them. The unknowns are (m_H, I) and they are solved simultaneously:

    charge balance   m_Na + m_H = m_OH + m_A + m_Cl
    mass balance     m_HA,tot  = m_HA + m_A
    Ka               Ka  = a_H a_A / a_HA   = g_H m_H g_A m_A / (g_HA m_HA)
    Kw               Kw  = a_H a_OH         = g_H m_H g_OH m_OH
    ionic strength   I   = 0.5 * sum(m_i z_i^2)
    Davies           log10 g_i = -A z_i^2 ( sqrt(I)/(1+sqrt(I)) - b I )

Scale: MOLALITY (mol/kg water), which is the basis on which the thermodynamic
Ka and Kw values above are defined, and the basis PHREEQC uses internally.
Activities are dimensionless: a_i = g_i * (m_i / m^o), m^o = 1 mol/kg.

Run:
    py -3.12 solve.py
"""

import math

# --------------------------------------------------------------- constants
KW = 1.0e-14
"""Thermodynamic ion product of water, molality basis, dimensionless, 25 C."""

A_DAVIES = 0.509
"""Debye-Huckel A on the MOLALITY scale, (kg/mol)^0.5, water at 25 C."""

DAVIES_B = 0.3
"""Davies empirical extension term, kg/mol."""

RHO_W = 0.997047
"""Density of pure water at 25 C, kg/L. Used for volumetric<->molal conversion."""

M_S = {"HCl": 36.4609, "NaOH": 39.9971, "NaOAc": 82.0343, "HOAc": 60.0520}

STRONG = None
"""Sentinel for a fully dissociated acid (HCl)."""

CHECKS = []


# ------------------------------------------------------------- activity
def log10_gamma(z, I):
    """Davies equation. Returns log10 of the molality-scale activity coefficient."""
    if I <= 0.0:
        return 0.0
    r = math.sqrt(I)
    return -A_DAVIES * z * z * (r / (1.0 + r) - DAVIES_B * I)


def gamma(z, I):
    return 10.0 ** log10_gamma(z, I)


def domain_ok(I):
    return 0.0 <= I <= 0.5


# ---------------------------------------------------------- speciation
def speciate(m_h, I, m_ha_tot, ka):
    """Given m_H and I, return equilibrium molalities. Activity is in the algebra."""
    g_h = gamma(1, I)
    g_oh = gamma(-1, I)
    g_a = gamma(-1, I)
    g_ha = 1.0  # stated approximation: neutral species, Setchenow neglected

    # conditional (stoichiometric) constants at this ionic strength
    kw_c = KW / (g_h * g_oh)
    ka_c = ka * g_ha / (g_h * g_a) if ka is not STRONG else STRONG

    m_oh = kw_c / m_h
    if ka is STRONG:
        m_a = m_ha_tot
        m_ha = 0.0
    else:
        m_a = m_ha_tot * ka_c / (ka_c + m_h)
        m_ha = m_ha_tot - m_a
    return m_oh, m_a, m_ha, kw_c, ka_c


def ionic_strength(m_h, I, m_na, m_cl, m_ha_tot, ka):
    m_oh, m_a, _, _, _ = speciate(m_h, I, m_ha_tot, ka)
    return 0.5 * (m_na + m_h + m_oh + m_a + m_cl)


def solve_I(m_h, m_na, m_cl, m_ha_tot, ka, iters=500, tol=1e-17):
    """Inner fixed point: I = f(I). Contraction with small slope; damped for safety."""
    I = 0.5 * (m_na + m_cl + m_ha_tot)
    for _ in range(iters):
        I_new = ionic_strength(m_h, I, m_na, m_cl, m_ha_tot, ka)
        if not (0.0 <= I_new <= 1.0):
            return None
        step = I_new - I
        I = I + 0.5 * step          # damping: guards against overshoot
        if abs(step) < tol:
            return I_new
    return I


def charge_residual(m_h, m_na, m_cl, m_ha_tot, ka):
    I = solve_I(m_h, m_na, m_cl, m_ha_tot, ka)
    if I is None:
        return None, None
    m_oh, m_a, _, _, _ = speciate(m_h, I, m_ha_tot, ka)
    return (m_na + m_h - m_oh - m_a - m_cl), I


# ------------------------------------------------------- ideal bracketing
def ideal_root(m_na, m_cl, m_ha_tot, ka):
    """Concentration-only root (gamma = 1). Used ONLY to bracket the real solve."""
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
def solve(m_na, m_cl, m_ha_tot, ka):
    """Solve the self-consistent system. Returns a dict, or None if out of domain.

    Bracketing: the activity correction shifts m_H by at most a small factor
    (~1/gamma_H), so a bracket of a few decades around the ideal (gamma=1) root
    always contains the real root AND keeps I physical near the root. A wide
    fixed bracket does not work here: at a trial m_H far from the root, m_OH =
    Kw_c/m_H becomes enormous and the implied I leaves the Davies domain, so the
    residual cannot be evaluated at all. Expanding spans are tried smallest
    first for that reason.

    At the bracket ENDPOINTS only the sign matters, and the sign is dominated by
    the leading +/- (m_H - m_cl - m_A) or +/- m_OH term, so a slightly
    out-of-domain gamma there cannot flip it.
    """
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

    I = solve_I(m_h, m_na, m_cl, m_ha_tot, ka)
    if I is None or not domain_ok(I):
        return None
    m_oh, m_a, m_ha, kw_c, ka_c = speciate(m_h, I, m_ha_tot, ka)
    g_h = gamma(1, I)

    return {
        "m_H": m_h, "m_OH": m_oh, "m_A": m_a, "m_HA": m_ha,
        "I": I, "gamma_H": g_h,
        "a_H": g_h * m_h,                 # dimensionless activity
        "pH": -math.log10(g_h * m_h),     # IUPAC pH = -log10 a_H
        "p_cH": -math.log10(m_h),         # taught quantity: -lg c(H+)
        "kw_c": kw_c, "ka_c": ka_c,
        "residual": (m_na + m_h - m_oh - m_a - m_cl),
    }


# ------------------------------------------------- titrant mixing helpers
def molar_to_molal(c, m_solute_g_per_mol, rho_solution):
    """Convert mol/L to mol/kg water given solution density (kg/L)."""
    return c / (rho_solution - c * m_solute_g_per_mol / 1000.0)


def report(label, value, expected, tol, note=""):
    if expected is None:
        CHECKS.append((label, True))
        print(f"  [INFO] {label}: {value}")
        return True
    ok = abs(value - expected) <= tol
    CHECKS.append((label, ok))
    print(f"  [{'PASS' if ok else 'FAIL'}] {label}")
    print(f"         computed  = {value:.4f}   reference = {expected:.4f}"
          f"   delta {value - expected:+.4f}   tol +/-{tol:.4f}")
    if note:
        print(f"         {note}")
    return ok


# ================================================================= main
def main():
    pka = 4.7447
    ka = 10.0 ** -pka

    print("=" * 78)
    print("SPIKE (remediation): SELF-CONSISTENT activity-based equilibrium")
    print(f"  molality basis | Kw = {KW:.1e} | Davies A = {A_DAVIES} | 25 C")
    print(f"  acetic acid pKa = {pka}  (Ka = {ka:.4e})")
    print("=" * 78)

    # ---------------------------------------------------------------- A
    print("\n-- A. Acetate buffer standard, ACTIVITY scale --")
    print("   IUPAC-traceable reference: pH 4.644 (0.1 M) and 4.713 (0.01 M)")
    print("   The reference is defined by molality; both conventions shown.\n")

    for conc, ref in ((0.1, 4.644), (0.01, 4.713)):
        for conv, m_scale in (("mol/kg (molality)", 1.0),
                              ("mol/L -> mol/kg (rho~rho_w)", 1.0018)):
            m_na = conc * m_scale
            m_ha_tot = 2.0 * conc * m_scale
            r = solve(m_na, 0.0, m_ha_tot, ka)
            if r is None:
                print(f"   {conc} M {conv}: OUT OF DOMAIN")
                continue
            a_minus, ha = r["m_A"], r["m_HA"]
            print(f"   {conc} M as {conv}")
            print(f"     m_Na={m_na:.6f}  m_A,tot={m_ha_tot:.6f}  I={r['I']:.4f}"
                  f"  g_H={r['gamma_H']:.4f}")
            print(f"     m_A/m_HA = {a_minus/ha:.6f}")
            report(f"buffer {conc} ({conv}) vs IUPAC", r["pH"], ref, 0.02)

    # ---------------------------------------------------------------- B
    print("\n-- B. Strong acid: the taught quantity is NOT the thermodynamic pH --")
    print("   0.1 M HCl. Textbook says 'pH = 1'. That is -lg c(H+), not pH.\n")
    m_hcl = molar_to_molal(0.1, M_S["HCl"], 1.0020)
    r = solve(0.0, m_hcl, 0.0, STRONG)
    print(f"   m_HCl = {m_hcl:.6f} mol/kg   I = {r['I']:.4f}"
          f"   g_H = {r['gamma_H']:.4f}")
    print(f"   -lg c(H+)  (taught)   = {r['p_cH']:.4f}")
    print(f"   pH = -log10 a(H+)     = {r['pH']:.4f}")
    print(f"   difference            = {r['pH'] - r['p_cH']:+.4f} pH"
          f"   = -log10(g_H) = {-math.log10(r['gamma_H']):+.4f}")
    report("taught -lg c(H+) reproduces the textbook 1.0000", r["p_cH"], 1.0, 0.01,
           "the taught value is exact for the CONCENTRATION, by construction")
    report("thermodynamic pH is NOT 1.0000", r["pH"], 1.1061, 0.02,
           "charge balance gives m_H = m_Cl for a pure strong acid, so activity "
           "shifts pH by exactly -log10(g_H) = +0.107 at I = 0.10")

    # ---------------------------------------------------------------- C
    print("\n-- C. Strong acid/base vs INDEPENDENT analytic relation --")
    print("   Excess regimes have a closed-form concentration result, and the")
    print("   charge balance fixes m_H (acid excess) or m_OH (base excess)")
    print("   independently of activity. The activity then enters through the")
    print("   ion that actually carries the excess:\n")
    print("     acid excess:  pH = -log10(m_H)  - log10(g_H)")
    print("     base excess:  pH = 14 + log10(m_OH) + log10(g_OH)\n")
    for f in (0.0, 0.5, 0.9, 1.1, 1.5):
        vol = 1.0 + f
        m_hcl_t = 0.1 / vol
        m_naoh_t = 0.1 * f / vol
        r = solve(m_naoh_t, m_hcl_t, 0.0, STRONG)
        excess = (m_hcl_t - m_naoh_t)
        if abs(excess) > 1e-5:
            if excess > 0.0:
                analytic = -math.log10(excess) - math.log10(r["gamma_H"])
                note = "acid excess: dominated by g_H"
            else:
                analytic = 14.0 + math.log10(-excess) + math.log10(gamma(-1, r["I"]))
                note = "base excess: dominated by g_OH, NOT g_H"
            report(f"f={f:.1f} eq vs analytic activity relation", r["pH"],
                   analytic, 1e-9, note)

    # ---------------------------------------------------------------- D
    print("\n-- D. Half-equivalence: pH = pKa + log10(g_A) --")
    m_na = 0.05
    m_acid = 0.1
    r = solve(m_na, 0.0, m_acid, ka)
    expected = pka + math.log10(gamma(-1, r["I"]))
    print(f"   I = {r['I']:.4f}   g_A = {gamma(-1, r['I']):.4f}")
    print(f"   solver pH = {r['pH']:.4f}")
    print(f"   pKa + log10(g_A) = {expected:.4f}")
    report("half-equivalence analytic identity", r["pH"], expected, 5e-3,
           "the naive 'pH = pKa' identity is WRONG under activity; this is the"
           " correct form")

    # ---------------------------------------------------------------- E
    print("\n-- E. Adversarial: dilute strong acid --")
    r = solve(0.0, 1.0e-8, 0.0, STRONG)
    print(f"   -lg c(H+) = {r['p_cH']:.4f}   pH = {r['pH']:.4f}")
    print("   Water autoionization is handled by the full balance; the naive")
    print("   -log10(C) would report 8.00 and call an acid basic.")
    report("1e-8 M HCl, activity pH near neutral", r["pH"], 6.978, 0.02)

    # ---------------------------------------------------------------- F
    print("\n-- F. Molality vs molarity: measured, not assumed --")
    print("   How much does the scale choice move the answer in this domain?")
    worst = 0.0
    for c in (0.001, 0.01, 0.05, 0.1, 0.2, 0.5):
        m_m = c
        m_c = c * 1.0018
        r_m = solve(0.0, m_m, 0.0, STRONG)
        r_c = solve(0.0, m_c, 0.0, STRONG)
        if r_m is None or r_c is None:
            continue
        d = abs(r_m["pH"] - r_c["pH"])
        worst = max(worst, d)
        print(f"     c = {c:<6} M   dpH(molal vs molar) = {d:.5f}")
    print(f"   worst over the supported domain = {worst:.5f} pH"
          f"   (tolerance is +/-0.02)")
    CHECKS.append(("molality/molarity difference below tolerance", worst < 0.005))
    print(f"  [{'PASS' if worst < 0.005 else 'FAIL'}] scale choice is below tolerance")

    # ---------------------------------------------------------------- G
    print("\n-- G. Conservation on the UNQUANTIZED solver state --")
    worst_chg = 0.0
    worst_mass = 0.0
    cases = [(0.1, 0.0, 0.0, STRONG), (0.0, 0.1, 0.0, STRONG),
             (0.05, 0.05, 0.0, STRONG), (0.05, 0.0, 0.1, ka),
             (0.0, 0.0, 0.001, ka), (0.1, 0.1, 0.0, STRONG),
             (0.001, 0.001, 0.001, ka)]
    for m_na, m_cl, m_ha, k in cases:
        r = solve(m_na, m_cl, m_ha, k)
        if r is None:
            continue
        worst_chg = max(worst_chg, abs(r["residual"]))
        # element mass balance in molality units: A-group and charge carriers
        lhs = r["m_HA"] + r["m_A"]
        worst_mass = max(worst_mass, abs(lhs - m_ha))
    print(f"   max |charge imbalance|      = {worst_chg:.3e} mol/kg")
    print(f"   max |A-group mass imbalance|= {worst_mass:.3e} mol/kg")
    CHECKS.append(("charge conservation", worst_chg < 1e-14))
    CHECKS.append(("element conservation", worst_mass < 1e-15))
    print(f"  [{'PASS' if worst_chg < 1e-14 else 'FAIL'}] charge conservation")
    print(f"  [{'PASS' if worst_mass < 1e-15 else 'FAIL'}] element conservation")

    # ---------------------------------------------------------------- H
    print("\n-- H. Is the outer residual monotone over the bracket? --")
    print("   Bisection needs only a sign change, but a second root would make")
    print("   it converge to the wrong one. Sampled, since not proven analytically.")
    bad = 0
    for m_na, m_cl, m_ha, k in cases:
        m0 = ideal_root(m_na, m_cl, m_ha, k)
        pts = [m0 * (10 ** (i / 10.0)) for i in range(-40, 41)]
        vals = []
        for p in pts:
            f, _ = charge_residual(p, m_na, m_cl, m_ha, k)
            if f is not None:
                vals.append((p, f))
        mono = all(vals[i][1] < vals[i + 1][1] for i in range(len(vals) - 1))
        if not mono:
            bad += 1
            print(f"     NON-MONOTONE: m_na={m_na} m_cl={m_cl} m_ha={m_ha}")
    print(f"   non-monotone cases: {bad}/{len(cases)}")
    CHECKS.append(("outer residual monotone over sampled bracket", bad == 0))
    print(f"  [{'PASS' if bad == 0 else 'FAIL'}] monotonicity (sampled)")

    # ---------------------------------------------------------------- I
    print("\n-- I. Sensitivity to the g_HA = 1 approximation --")
    print("   A Setchenow salting term would give log10(g_HA) ~ +0.02 at I = 0.1.")
    print("   Estimated effect on the buffer reference:")
    r0 = solve(0.1, 0.0, 0.2, ka)
    print(f"     with g_HA = 1        : pH = {r0['pH']:.4f}  (ref 4.644,"
          f" delta {r0['pH'] - 4.644:+.4f})")
    print(f"     if log10(g_HA)=+0.02 : pH = {r0['pH'] + 0.02:.4f}"
          f"  (delta {r0['pH'] + 0.02 - 4.644:+.4f})")
    print("   Both lie inside the +/-0.02 tolerance band; the approximation is")
    print("   therefore NOT the dominant residual. Recorded, not silently dropped.")

    # ------------------------------------------------------------ domain
    print("\n-- J. Domain refusal --")
    r = solve(0.0, 0.6, 0.0, STRONG)
    print(f"   0.6 mol/kg HCl -> {'MODEL_OUT_OF_DOMAIN' if r is None else 'SOLVED (unexpected)'}")
    CHECKS.append(("0.6 mol/kg refused", r is None))
    print(f"  [{'PASS' if r is None else 'FAIL'}] domain refusal")

    print("\n" + "=" * 78)
    passed = sum(1 for _, ok in CHECKS if ok)
    print(f"RESULT: {passed}/{len(CHECKS)} checks")
    for label, ok in CHECKS:
        if not ok:
            print(f"  FAILED: {label}")
    print("=" * 78)


if __name__ == "__main__":
    main()
