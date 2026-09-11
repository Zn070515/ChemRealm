"""SPIKE - not a production path. See README.md in this directory.

Purpose: test whether a hand-written exact equilibrium solver reproduces
authoritative acid-base reference values closely enough to serve as the
ChemRealm Scientific Reality Core for the acid/base titration vertical slice.

Method: solve the exact charge balance for a monoprotic acid + strong base in
pure water at 25 C. Standard library only. Bisection over a guaranteed bracket;
the residual is strictly increasing in [H+], so the root is unique.

References are derived by INDEPENDENT paths (closed form, IUPAC standards),
never by re-running the numerical method under test.

Run:
    py -3.12 solve.py
"""

import math

KW = 1.0e-14
"""Water autoionization constant, activity basis, 25 C. mol^2/L^2."""

A_DH = 0.5085
"""Davies / Debye-Huckel A parameter for water at 25 C (L^0.5 mol^-0.5)."""

STRONG = None
"""Sentinel: Ka is None means the acid is treated as fully dissociated."""


def residual(h, c_acid, c_base, ka):
    """Charge balance residual: [Na+] + [H+] - [OH-] - [A-].

    Strictly increasing in h for all physical inputs, since
        d/dh = 1 + Kw/h^2 + c_acid*Ka/(Ka+h)^2  > 0.
    A sign change over a bracket therefore implies exactly one root.
    """
    if ka is STRONG:
        a_minus = c_acid
    else:
        a_minus = c_acid * ka / (ka + h)
    return c_base + h - KW / h - a_minus


def solve_h(c_acid, c_base, ka, lo=1e-30, hi=1e3, iters=200):
    """Return [H+] in mol/L. Bisection uses only +, -, *, / and comparisons."""
    if not residual(lo, c_acid, c_base, ka) < 0.0:
        raise ValueError("bracket low end is not below the root")
    if not residual(hi, c_acid, c_base, ka) > 0.0:
        raise ValueError("bracket high end is not above the root")
    for _ in range(iters):
        mid = lo + 0.5 * (hi - lo)
        if residual(mid, c_acid, c_base, ka) < 0.0:
            lo = mid
        else:
            hi = mid
    return lo + 0.5 * (hi - lo)


def species(h, c_acid, ka):
    """Return (a_minus, ha, oh) concentrations at the converged state."""
    if ka is STRONG:
        a_minus = c_acid
    else:
        a_minus = c_acid * ka / (ka + h)
    return a_minus, c_acid - a_minus, KW / h


def ionic_strength(h, c_acid, c_base, ka):
    a_minus, _, oh = species(h, c_acid, ka)
    return 0.5 * (c_base * 1.0 + a_minus * 1.0 + h * 1.0 + oh * 1.0)


def davies_log_gamma(z, i):
    """Davies equation log10(gamma) for an ion of charge z at ionic strength i."""
    if i <= 0.0:
        return 0.0
    root_i = math.sqrt(i)
    return -A_DH * z * z * (root_i / (1.0 + root_i) - 0.3 * i)


def charge_imbalance(h, c_acid, c_base, ka):
    """Absolute charge imbalance at the reported root. Conservation invariant."""
    a_minus, _, oh = species(h, c_acid, ka)
    return (c_base + h) - (oh + a_minus)


def strong_closed_form(f, conc=0.1, vol_acid=1.0):
    """Independent closed form for strong acid vs strong base, in excess regimes.

    f = moles of base per mole of acid. Returns (ph, regime) or (None, regime)
    inside the near-stoichiometric window where neither excess dominates and a
    closed form is not available without solving the full balance.
    """
    moles_acid = conc * vol_acid
    moles_base = conc * vol_acid * f
    vol = vol_acid * (1.0 + f)
    excess = moles_acid - moles_base
    h_excess = excess / vol
    if h_excess > 1e-5:
        return -math.log10(h_excess), "acid excess"
    if h_excess < -1e-5:
        return 14.0 + math.log10(-h_excess), "base excess"
    return None, "near-stoichiometric"


CHECKS = []


def report(label, value, expected, tol, note=""):
    ok = abs(value - expected) <= tol
    CHECKS.append((label, ok))
    print(f"  [{'PASS' if ok else 'FAIL'}] {label}")
    print(f"         computed   = {value:.4f}")
    print(f"         reference  = {expected:.4f}   (delta {value - expected:+.4f}, "
          f"tol +/-{tol:.4f})")
    if note:
        print(f"         {note}")
    return ok


def main():
    pka = 4.7447
    ka = 10.0 ** -pka

    print("=" * 76)
    print("SPIKE: exact charge-balance solver vs independently derived references")
    print(f"  Kw = 1.0e-14 (25 C)   acetic acid pKa = {pka} (Ka = {ka:.4e})")
    print("=" * 76)

    # ---------------------------------------------------------------- A
    print("\n-- A. Acetate buffer standards (IUPAC-traceable) --")
    print("   A buffer is HOAc plus NaOAc, i.e. total acetate and Na+ present")
    print("   WITHOUT a neutralization reaction. Feeding this as acid+base")
    print("   would model equivalence, not a buffer.")

    for conc, ref in ((0.1, 4.644), (0.01, 4.713)):
        c_acid = 2.0 * conc      # total acetate: conc from HOAc + conc from NaOAc
        c_base = conc            # Na+ from NaOAc only
        h = solve_h(c_acid, c_base, ka)
        a_minus, ha, _ = species(h, c_acid, ka)
        i = ionic_strength(h, c_acid, c_base, ka)
        lg_ratio = math.log10(a_minus / ha)
        lg_gamma = davies_log_gamma(-1, i)
        ph_conc = -math.log10(h)
        ph_act = pka + lg_ratio + lg_gamma

        print(f"\n   {conc} mol/L HOAc + {conc} mol/L NaOAc   (I = {i:.4f})")
        print(f"     concentration-only pH  = {ph_conc:.4f}")
        print(f"     [A-]/[HA]              = {a_minus / ha:.6f}"
              f"   (log10 = {lg_ratio:+.5f})")
        print(f"     Davies log10(gamma_A-) = {lg_gamma:+.5f}"
              f"   (gamma = {10.0 ** lg_gamma:.4f})")
        print(f"     activity-corrected pH  = {ph_act:.4f}")
        report(f"acetate buffer {conc} M vs IUPAC", ph_act, ref, 0.02,
               "0.02 is our MODEL accuracy, not the standard's uncertainty "
               "(IUPAC quotes +/-0.003 on the standard itself).")

    # ---------------------------------------------------------------- B
    print("\n-- B. Half-equivalence: pH approaches pKa, but is not identically pKa --")
    va, ca, f = 1.0, 0.1, 0.5
    vol = va * (1.0 + f)
    h = solve_h(ca * va / vol, ca * va * f / vol, ka)
    print(f"     exact solve         = {-math.log10(h):.4f}")
    print(f"     pKa                 = {pka:.4f}")
    print(f"     difference          = {-math.log10(h) - pka:+.4f} pH")
    print("     The identity is asymptotic: dilution asymmetry and Kw shift it.")
    report("half-equivalence within 0.01 of pKa", -math.log10(h), pka, 0.01,
           "an approximate identity, NOT an exact one.")

    # ---------------------------------------------------------------- C
    print("\n-- C. Equivalence point, 0.1 M acetic acid + 0.1 M NaOH --")
    h = solve_h(0.1 / 2.0, 0.1 / 2.0, ka)
    acetate = 0.05
    closed = 7.0 + 0.5 * (pka + math.log10(acetate))
    print(f"     exact solve         = {-math.log10(h):.4f}")
    print(f"     textbook closed form = {closed:.4f}   (7 + 0.5*(pKa + log C))")
    report("equivalence, numerical vs textbook closed form", -math.log10(h),
           closed, 0.03,
           "Two independent routes agreeing validates the solver; neither "
           "validates the closed form's own assumptions.")

    # ---------------------------------------------------------------- D
    print("\n-- D. Strong acid / strong base vs INDEPENDENT closed form --")
    for f in (0.0, 0.5, 0.9, 1.0, 1.1, 1.5):
        vol = 1.0 * (1.0 + f)
        h = solve_h(0.1 / vol, 0.1 * f / vol, STRONG)
        ph = -math.log10(h)
        ref, regime = strong_closed_form(f)
        print(f"\n     f = {f:.1f} eq   regime: {regime}")
        if ref is None:
            print(f"       computed = {ph:.4f}")
            report(f"HCl/NaOH at {f:.1f} eq -> neutral", ph, 7.0, 0.0005,
                   "the only regime needing the full balance; a closed form "
                   "cannot produce this value.")
        else:
            report(f"HCl/NaOH at {f:.1f} eq vs closed form", ph, ref, 0.005)

    # ---------------------------------------------------------------- E
    print("\n-- E. Adversarial: dilute strong acid, water cannot be ignored --")
    h = solve_h(1.0e-8, 0.0, STRONG)
    print(f"     naive -log10(C)     = {-math.log10(1.0e-8):.4f}   "
          f"<-- reports an ACID as basic")
    report("1e-8 M HCl with water included", -math.log10(h), 6.9788, 0.002)

    # ---------------------------------------------------------------- F
    print("\n-- F. Adversarial: dilute weak acid, Henderson-Hasselbalch fails --")
    h = solve_h(1.0e-6, 0.0, ka)
    hh = 0.5 * (pka - math.log10(1.0e-6))
    print(f"     Henderson-Hasselbalch = {hh:.4f}")
    print(f"     exact solve           = {-math.log10(h):.4f}")
    print(f"     divergence            = {-math.log10(h) - hh:+.4f} pH"
          f"   <-- HH is outside its validity range")
    print("     A pedagogical view may SHOW the HH shortcut here, but the")
    print("     scientific state must come from the exact solve.")

    # ---------------------------------------------------------------- G
    print("\n-- G. Conservation invariant across the whole sweep --")
    worst = 0.0
    for conc_a, conc_b, ka_ in ((0.1, 0.0, STRONG), (0.1, 0.1, STRONG),
                                (0.05, 0.075, STRONG), (0.1, 0.05, ka),
                                (0.01, 0.0, ka), (1e-7, 1e-7, STRONG)):
        h = solve_h(conc_a, conc_b, ka_)
        worst = max(worst, abs(charge_imbalance(h, conc_a, conc_b, ka_)))
    print(f"     max |charge imbalance| over sweep = {worst:.3e} mol/L")
    CHECKS.append(("charge conservation", worst < 1e-15))
    print(f"  [{'PASS' if worst < 1e-15 else 'FAIL'}] charge conservation")

    print("\n" + "=" * 76)
    passed = sum(1 for _, ok in CHECKS if ok)
    print(f"RESULT: {passed}/{len(CHECKS)} checks within stated tolerance")
    for label, ok in CHECKS:
        if not ok:
            print(f"  FAILED: {label}")
    print("=" * 76)


if __name__ == "__main__":
    main()
