"""SPIKE - self-consistent activity equilibrium, with molarity and molality kept
as genuinely distinct quantities.

Revision 5 (owner review round 4). Round-4 fix:

  P1-1r4  Ka/Kw CONDITIONAL CONSTANTS ARE DIMENSIONLESS and the algebra is now
          carried in REDUCED molality m_hat = m/m°. Previously `m_OH =
          Kw_cond/m_H` divided a dimensionless constant by a PHYSICAL molality
          -- `dimensionless / (mol/kg)` -- which is not mol/kg. It looked right
          only because m° = 1 mol/kg numerically. Physical molalities are now
          produced once, at the boundary, by multiplying by m°.

Revision 4 (owner review round 3). Fixes carried in:

  Round 2:
  P1-1  -lg c(H+) was computed as -log10(m_H) -- a MOLALITY labelled as a
        concentration. For 0.1000 mol/L HCl that gave 0.9993; correct is 1.0000.
        Molarity is now derived from a real solution volume.
  P1-2  "thermodynamic pH" -> "activity-based model pH". IUPAC's pH is a
        notional definition and depends on an chosen activity model.
  P1-3  Computational domain separated from the accuracy envelope.

  Round 3:
  P1-C  Indicator equilibrium MOVED INTO THE SCIENTIFIC CORE. The ratio
        m(In-)/m(HIn) = Ka_in/(a_H * gamma_In) contains Ka, an activity and an
        activity coefficient; it is chemistry, not a perceptual mapping. The
        observable layer receives the ratio and owns only ratio -> colour.
  P1-D  Molarity and -lg c(H+) are produced by a named ScientificProjection
        layer (function `project`), not by an unnamed "presentation layer".
  P1-E  The envelope is PROPOSED, not validated. +/-0.02 pH is evidenced only at
        the two IUPAC anchors; equal ionic strength does not imply equal error.
  P1-F  Davies takes the REDUCED (dimensionless) ionic strength I_hat = I_m/m°,
        so `1 + sqrt(I)` is dimensionally legal.
  P1-A  Transfer semantics demonstrated: liquidVolume is tracked state, and a
        transfer moves water and solutes by volume fraction.

Run:
    py -3.12 solve.py
"""

import math

# ---------------------------------------------------------------- constants
KW = 1.0e-14
"""Thermodynamic ion product of water, molality basis, dimensionless, 25 C."""

A_DAVIES = 0.509
"""Debye-Huckel A for water at 25 C, on the REDUCED ionic-strength convention.

Dimensionless, because its argument I_hat is dimensionless (P1-F). On a
dimensioned-I convention this coefficient would carry (kg/mol)^0.5 -- which is
precisely why the reduced convention is used."""

DAVIES_B = 0.3
"""Davies empirical extension term. Dimensionless on the reduced-I convention."""

M_STANDARD_MOLALITY = 1.0
"""Standard molality m°, mol/kg. Defines the reduced ionic strength I_hat = I_m/m°.

Davies contains `1 + sqrt(I)`, which is only defined if I is a pure number.
Working with the reduced (dimensionless) ionic strength is the standard
molality-scale resolution. Numerically I_hat == I_m because m° = 1 mol/kg; the
point is that it is written down, so the equation is dimensionally legal
(finding P1-F)."""

I_COMPUTATIONAL_MAX = 0.5
"""Upper end of the Davies model's approximate range, mol/kg. The solver may
compute here, but the result is flagged as outside the proposed envelope."""

I_PROPOSED_ENVELOPE_MAX = 0.12
"""The PROPOSED validation envelope, mol/kg. A target, not an achievement.

+/-0.02 pH has been demonstrated only at two IUPAC acetate-buffer anchors
(I = 0.01 and I = 0.10). Equal ionic strength does NOT imply equal model error:
buffer, strong-acid excess, and weak-acid equivalence are different composition
regimes. So this boundary is proposed here and is promoted to "validated" only
when M4's AC-S6 passes across the full swept curve including equivalence
(finding P1-E)."""

MOLAR_MASS = {"HCl": 36.4609, "NaOH": 39.9971, "NaOAc": 82.0343, "HOAc": 60.0520}

STRONG = None
"""Sentinel for a fully dissociated acid (HCl)."""

CHECKS = []


# ------------------------------------------------------------- activity
def reduced_ionic_strength(i_molal):
    """I_hat = I_m / m°, dimensionless. Argument of Davies must be a pure number."""
    return i_molal / M_STANDARD_MOLALITY


def log10_gamma(z, i_reduced):
    """Davies equation. Takes the REDUCED (dimensionless) ionic strength."""
    if i_reduced <= 0.0:
        return 0.0
    r = math.sqrt(i_reduced)
    return -A_DAVIES * z * z * (r / (1.0 + r) - DAVIES_B * i_reduced)


def gamma(z, i_molal):
    """Convenience wrapper: call sites hold I_m in mol/kg, Davies needs I_hat."""
    return 10.0 ** log10_gamma(z, reduced_ionic_strength(i_molal))


def indicator_ratio(a_h, i_molal, ka_in):
    """Indicator protonation ratio m(In-)/m(HIn). SCIENTIFIC CORE OUTPUT.

    This is equilibrium chemistry -- Ka_in, an activity, and an activity
    coefficient -- and belongs here, not in the renderer (ADR-0006, P1-C).
    The observable layer receives the ratio and owns only the mapping
    ratio -> colour.
    """
    g_in = gamma(-1, i_molal)   # In- is charged
    g_hin = 1.0                 # HIn is neutral (stated approximation)
    return ka_in * g_hin / (a_h * g_in)


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
    """Mixing is on the conserved quantities: water mass and amounts.

    Volume is additive. That is an OPERATIONAL approximation, not a display one
    (finding P1-4): liquidVolume sets the volume fraction f = dV/V moved on the
    NEXT transfer, so it shapes later canonical composition and hence later
    molality. The equilibrium algebra never consumes a molarity -- but the
    approximation still propagates into the thermodynamics through metering.
    Acceptable at these concentrations; described honestly rather than called
    'display-only'."""

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
# ALL thermodynamic algebra runs in REDUCED molality, m_hat = m / m°, which is
# dimensionless (finding P1-1, round 4).
#
# This is not pedantry. Kw is a DIMENSIONLESS thermodynamic constant, so
# `Kw / (gamma_H * gamma_OH * m_H)` is only meaningful if m_H is reduced.
# Written with a physical molality it reads `dimensionless / (mol/kg)`, which
# is not mol/kg -- it merely LOOKS right because m° = 1 mol/kg numerically.
# The previous revision did exactly that. Physical molalities are produced at
# the boundary by multiplying by m°.
def reduce_molality(m_physical):
    """m_hat = m / m°, dimensionless."""
    return m_physical / M_STANDARD_MOLALITY


def physical_molality(m_reduced):
    """m = m_hat * m°, mol/kg."""
    return m_reduced * M_STANDARD_MOLALITY


def speciate(mh, i_molal, mh_tot, ka):
    """Reduced molalities in, reduced molalities out. i_molal is physical."""
    g_h = gamma(1, i_molal)
    g_oh = gamma(-1, i_molal)
    g_a = gamma(-1, i_molal)
    g_ha = 1.0  # stated approximation: neutral species, Setchenow neglected

    # conditional constants: DIMENSIONLESS, as they must be
    kw_c = KW / (g_h * g_oh)
    ka_c = ka * g_ha / (g_h * g_a) if ka is not STRONG else STRONG

    mh_oh = kw_c / mh                          # dimensionless / dimensionless
    if ka is STRONG:
        mh_a, mh_ha = mh_tot, 0.0
    else:
        mh_a = mh_tot * ka_c / (ka_c + mh)     # dimensionless / dimensionless
        mh_ha = mh_tot - mh_a
    return mh_oh, mh_a, mh_ha, kw_c, ka_c


def ionic_strength_molal(mh, i_molal, mh_na, mh_cl, mh_tot, ka):
    """Returns I_m in mol/kg from reduced inputs. The m° factor is explicit."""
    mh_oh, mh_a, _, _, _ = speciate(mh, i_molal, mh_tot, ka)
    return 0.5 * M_STANDARD_MOLALITY * (mh_na + mh + mh_oh + mh_a + mh_cl)


def solve_i(mh, mh_na, mh_cl, mh_tot, ka, iters=500, tol=1e-17):
    i = 0.5 * M_STANDARD_MOLALITY * (mh_na + mh_cl + mh_tot)
    for _ in range(iters):
        i_new = ionic_strength_molal(mh, i, mh_na, mh_cl, mh_tot, ka)
        if not (0.0 <= i_new <= 1.0):
            return None
        step = i_new - i
        i = i + 0.5 * step
        if abs(step) < tol:
            return i_new
    return i


def charge_residual(mh, mh_na, mh_cl, mh_tot, ka):
    """Reduced charge balance: every term is dimensionless."""
    i = solve_i(mh, mh_na, mh_cl, mh_tot, ka)
    if i is None:
        return None, None
    mh_oh, mh_a, _, _, _ = speciate(mh, i, mh_tot, ka)
    return (mh_na + mh - mh_oh - mh_a - mh_cl), i


def ideal_root(mh_na, mh_cl, mh_tot, ka):
    """Concentration-only root in REDUCED molality (gamma = 1). Bracketing only."""
    def f(mh):
        a = mh_tot if ka is STRONG else mh_tot * ka / (ka + mh)
        return mh_na + mh - KW / mh - a - mh_cl    # KW is dimensionless

    lo, hi = 1e-16, 1.0
    for _ in range(400):
        mid = lo + 0.5 * (hi - lo)
        if f(mid) < 0.0:
            lo = mid
        else:
            hi = mid
    return lo + 0.5 * (hi - lo)


# ------------------------------------------------------------ the solve
# Solved entirely in REDUCED molality. Callers holding PHYSICAL molalities must
# go through solve_physical(); the boundary is crossed in exactly two places.
# No pH and no molarity here: those are the projection layer's job.
def solve_reduced(mh_na, mh_cl, mh_tot, ka):
    m0 = ideal_root(mh_na, mh_cl, mh_tot, ka)
    lo = hi = None
    for span in (3.0, 10.0, 100.0, 1000.0):
        c_lo, c_hi = m0 / span, m0 * span
        f_lo = charge_residual(c_lo, mh_na, mh_cl, mh_tot, ka)[0]
        f_hi = charge_residual(c_hi, mh_na, mh_cl, mh_tot, ka)[0]
        if f_lo is not None and f_hi is not None and f_lo < 0.0 < f_hi:
            lo, hi = c_lo, c_hi
            break
    if lo is None:
        return None

    for _ in range(200):
        mid = lo + 0.5 * (hi - lo)
        f_mid = charge_residual(mid, mh_na, mh_cl, mh_tot, ka)[0]
        if f_mid is None:
            return None
        if f_mid < 0.0:
            lo = mid
        else:
            hi = mid
    mh_h = lo + 0.5 * (hi - lo)

    i = solve_i(mh_h, mh_na, mh_cl, mh_tot, ka)
    if i is None or i > I_COMPUTATIONAL_MAX:
        return None
    mh_oh, mh_a, mh_ha, kw_c, ka_c = speciate(mh_h, i, mh_tot, ka)
    g_h = gamma(1, i)

    return {
        # reduced (dimensionless) -- the algebra's native variables
        "mh_H": mh_h, "mh_OH": mh_oh, "mh_A": mh_a, "mh_HA": mh_ha,
        "Ka_cond": ka_c, "Kw_cond": kw_c,
        # physical (mol/kg) -- produced at the boundary
        "m_H": physical_molality(mh_h), "m_OH": physical_molality(mh_oh),
        "m_A": physical_molality(mh_a), "m_HA": physical_molality(mh_ha),
        "I_m": i,                                   # mol/kg
        "I_hat": reduced_ionic_strength(i),         # dimensionless
        "gamma_H": g_h,
        "a_H": g_h * mh_h,                          # gamma * REDUCED molality
        "residual": (mh_na + mh_h - mh_oh - mh_a - mh_cl),   # reduced
        "in_proposed_envelope": i <= I_PROPOSED_ENVELOPE_MAX,
    }

def solve_physical(m_na, m_cl, m_ha_tot, ka):
    """Entry point for callers holding PHYSICAL molalities (mol/kg).

    Wrapping rather than overloading keeps the physical/reduced boundary visible
    at every call site. The spike's call sites used to pass physical values
    straight into the reduced core -- numerically identical because m0 = 1
    mol/kg, which is precisely why a NUMERIC test cannot catch the mistake.
    Standard-state type safety is a compile-time property (SPEC AC-U5)."""
    return solve_reduced(reduce_molality(m_na), reduce_molality(m_cl),
                         reduce_molality(m_ha_tot), ka)


# ---------------------------------------------------- ScientificProjection
# The ONLY place molarity and the taught quantity are produced. Both need the
# converged scientific state AND the world's physical state (water mass,
# liquid volume). This is a named layer, not "the presentation layer"
# (ADR-0003, finding P1-D).
def project(result, mixture):
    m_h = result["m_H"]                       # mol/kg water
    n_h = m_h * mixture.water_mass_kg         # mol
    c_h = n_h / mixture.volume_l              # mol/L  <- genuine molarity
    a_h = result["a_H"]                       # gamma * reduced molality
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
    # the core works in REDUCED molality; physical values are returned alongside
    r = solve_reduced(reduce_molality(m_na), reduce_molality(m_cl),
                      reduce_molality(m_ha_tot), ka)
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
    print(f"  I PROPOSED envelope <= {I_PROPOSED_ENVELOPE_MAX} mol/kg | "
          f"I computational domain <= {I_COMPUTATIONAL_MAX} mol/kg")
    print(f"  acetic acid pKa = {pka}")
    print("=" * 78)

    # ---------------------------------------------------------------- A
    print("\n-- A. Acetate buffer standards (defined by MOLALITY) --")
    print("   IUPAC-traceable: pH 4.644 (0.1 mol/kg) and 4.713 (0.01 mol/kg)")
    for c, ref in ((0.1, 4.644), (0.01, 4.713)):
        m_na, m_ha_tot = c, 2.0 * c
        r = solve_physical(m_na, 0.0, m_ha_tot, ka)
        print(f"\n   {c} mol/kg HOAc+NaOAc   I = {r['I_m']:.4f}"
              f"   g_H = {r['gamma_H']:.4f}   in envelope: {r['in_proposed_envelope']}")
        report(f"acetate buffer {c} mol/kg vs IUPAC",
               -math.log10(r["a_H"]), ref, 0.02)

    # ---------------------------------------------------------------- B
    print("\n-- B. 0.1000 mol/L HCl: the two quantities, computed separately --")
    print("   FIX for P1-1. The solution is DEFINED as 0.1000 mol/L and HCl is")
    print("   fully dissociated, so c(H+) = 0.1000 mol/L exactly.\n")
    hcl = reagent("0.1000 M HCl", 1.0, "HCl", 0.1000, 1.0020)
    mix_b = mix("0.1000 M HCl", hcl)
    r, (m_na, m_cl, m_ha_tot) = solve_mixture(mix_b, ka)
    p = project(r, mix_b)
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
                analytic = 14.0 + math.log10(-excess) + math.log10(gamma(-1, r["I_m"]))
                note = "base excess: g_OH"
            report(f"f={f:.1f} eq vs analytic relation",
                   -math.log10(r["a_H"]), analytic, 1e-9, note)

    # ---------------------------------------------------------------- D
    print("\n-- D. Half-equivalence: pH = pKa + log10(g_A) --")
    mx = mix("half-eq", reagent("HOAc", 1.0, "HOAc", 0.1, 1.0010),
             reagent("NaOH", 0.5, "NaOH", 0.1, 1.0040))
    r, _ = solve_mixture(mx, ka)
    expected = pka + math.log10(gamma(-1, r["I_m"]))
    report("half-equivalence activity identity",
           -math.log10(r["a_H"]), expected, 5e-3,
           "the naive 'pH = pKa' is WRONG under activity")

    # ---------------------------------------------------------------- E
    print("\n-- E. Dilute strong acid --")
    mx = mix("1e-8 M HCl", reagent("HCl", 1.0, "HCl", 1.0e-8, 0.9971))
    r, _ = solve_mixture(mx, ka)
    p = project(r, mx)
    print(f"   -lg c(H+) = {p['pC_H']:.4f}   model pH = {p['pH_model']:.4f}")
    print("   A naive concentration formula would report 8.00 and call an acid basic.")
    report("1e-8 M HCl near neutral", p["pH_model"], 6.978, 0.02)

    # ---------------------------------------------------------------- F
    print("\n-- F. Molarity vs molality: measured, and why they must not be merged --")
    worst_c = 0.0
    for c in (0.001, 0.01, 0.05, 0.1, 0.2):
        mx = mix("s", reagent("HCl", 1.0, "HCl", c, 1.0020))
        r, _ = solve_mixture(mx, ka)
        p = project(r, mx)
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
        ph_true = -math.log10(r_true["a_H"])
        # deliberately wrong: treat the molarity as if it were a molality
        # (HCl alone: sodium is zero, chloride carries the acid)
        r_wrong = solve_physical(0.0, c, 0.0, STRONG)
        ph_wrong = -math.log10(r_wrong["a_H"])
        d = abs(ph_wrong - ph_true)
        worst_sens = max(worst_sens, d)
        print(f"     c = {c:<6} mol/L   dpH(model) = {d:.6f}")
    print(f"   worst over the proposed envelope = {worst_sens:.6f} pH")
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
        r = solve_physical(m_na, m_cl, m_ha, k)
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
    r = solve_physical(0.1, 0.0, 0.2, ka)
    ph = -math.log10(r["a_H"])
    print(f"     log10(g_HA) = 0    : pH_model = {ph:.4f}  (IUPAC 4.644, d {ph - 4.644:+.4f})")
    print(f"     log10(g_HA) = +0.02: pH_model = {ph + 0.02:.4f}  (d {ph + 0.02 - 4.644:+.4f})")
    print("   Both inside +/-0.02, so this is not the dominant residual. Recorded.")

    # ---------------------------------------------------------------- J
    print("\n-- J. Two-tier refusal (FIX for P1-3; envelope PROPOSED per P1-E) --")
    print("   The computational domain and the PROPOSED accuracy envelope are")
    print("   DIFFERENT things. This is the distinction the previous revision missed.\n")
    for c in (0.05, 0.10, 0.15, 0.30, 0.60):
        mx = mix("s", reagent("HCl", 1.0, "HCl", c, 1.02))
        r, _ = solve_mixture(mx, ka)
        if r is None:
            verdict = "MODEL_OUT_OF_DOMAIN (refused)"
        elif r["in_proposed_envelope"]:
            verdict = f"computed, I={r['I_m']:.3f} -- INSIDE proposed envelope (+/-0.02 claimed at M4)"
        else:
            verdict = f"computed, I={r['I_m']:.3f} -- OUTSIDE proposed envelope (accuracy NOT claimed)"
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
            worst_i = max(worst_i, r["I_m"])
        mx2 = mix("t2", reagent("HOAc", 1.0, "HOAc", 0.1, 1.0010),
                  reagent("NaOH", f, "NaOH", 0.1, 1.0040))
        r2, _ = solve_mixture(mx2, ka)
        if r2:
            worst_i = max(worst_i, r2["I_m"])
    print(f"   max I_m over 0.1 mol/L HCl/NaOH and HOAc/NaOH titrations = {worst_i:.4f} mol/kg")
    print(f"   proposed envelope {I_PROPOSED_ENVELOPE_MAX} mol/kg covers this with margin.")
    check("v0 scenarios fall inside the proposed envelope",
          worst_i <= I_PROPOSED_ENVELOPE_MAX, f"max I_m = {worst_i:.4f}")

    # ---------------------------------------------------------------- L
    print("\n-- L. Reduced ionic strength: Davies is dimensionally legal (P1-F) --")
    r = solve_physical(0.1, 0.0, 0.2, ka)
    print(f"   I_m   = {r['I_m']:.6f} mol/kg          (physical quantity)")
    print(f"   I_hat = {r['I_hat']:.6f}  dimensionless (= I_m / m°)")
    print("   Davies evaluates sqrt(I_hat)/(1+sqrt(I_hat)). Every term is a pure")
    print("   number, so `1 + sqrt(...)` is a legal sum and A and b carry no units.")
    check("I_hat equals I_m / m° with m° = 1 mol/kg",
          abs(r["I_hat"] - r["I_m"] / M_STANDARD_MOLALITY) < 1e-15)

    print("\n  -- L2. Ka/Kw conditional constants are dimensionless (P1-1 round 4) --")
    r = solve_physical(0.1, 0.0, 0.2, ka)
    kw_c, ka_c = r["Kw_cond"], r["Ka_cond"]
    mh_h, mh_oh, mh_a, mh_tot = r["mh_H"], r["mh_OH"], r["mh_A"], 0.2
    print(f"   Kw_cond = {kw_c:.6e}   Ka_cond = {ka_c:.6e}   (pure numbers)")
    print(f"   mh(OH) = Kw_cond/mh(H)          : {mh_oh:.6e} vs {kw_c / mh_h:.6e}")
    print(f"   mh(A)  = mh_tot*Ka_cond/(Ka+mh) : {mh_a:.6e}"
          f" vs {mh_tot * ka_c / (ka_c + mh_h):.6e}")
    check("mh_OH = Kw_cond / mh_H  (dimensionless / dimensionless)",
          abs(mh_oh - kw_c / mh_h) < 1e-20)
    check("mh_A in the dimensionless Henderson-like form",
          abs(mh_a - mh_tot * ka_c / (ka_c + mh_h)) < 1e-20)
    check("physical molality = reduced molality x m0",
          abs(r["m_H"] - r["mh_H"] * M_STANDARD_MOLALITY) < 1e-20)
    print("   Before round 4 this read `m_OH = Kw_cond / m_H` with a PHYSICAL")
    print("   m_H -- dimensionless / (mol/kg). It looked right only because")
    print("   m0 = 1 mol/kg numerically. The algebra is now carried in the")
    print("   reduced variables and converted once, at the boundary.")

    # ---------------------------------------------------------------- M
    print("\n-- M. Indicator equilibrium belongs to the SCIENTIFIC CORE (P1-C) --")
    print("   The renderer receives a ratio; it never computes one.\n")
    ka_in = 10.0 ** -9.4                       # phenolphthalein, provisional
    r = solve_physical(0.05, 0.0, 0.1, ka)
    print(f"   solution I_m = {r['I_m']:.4f}   gamma_In = {gamma(-1, r['I_m']):.4f}")
    prev, crossed, mono = None, False, True
    for d in (-2.0, -1.0, -0.5, -0.1, 0.0, 0.5, 1.0, 2.0):
        ratio = indicator_ratio(10.0 ** -(9.4 + d), r["I_m"], ka_in)
        flag = ""
        if prev is not None:
            if ratio < prev:
                mono = False
            if prev < 1.0 <= ratio:
                flag, crossed = "   <-- crosses 1", True
        print(f"     pA_H = {9.4 + d:5.2f}   m(In-)/m(HIn) = {ratio:10.4f}{flag}")
        prev = ratio
    check("indicator ratio increases monotonically as a_H falls", mono)
    check("indicator ratio crosses 1 near the indicator pKa", crossed)
    print("   The ratio is chemistry (Ka_in, gamma_In, a_H) -> scientific core.")
    print("   The observable layer owns only the mapping ratio -> colour.")

    # ---------------------------------------------------------------- N
    print("\n-- N. Transfer semantics: volume is tracked state (P1-A) --")

    def contents(mx):
        return {"waterMass": mx.water_mass_kg, "liquidVolume": mx.volume_l,
                "amounts": dict(mx.amounts)}

    def transfer(src, dst, dv):
        f = dv / src["liquidVolume"]                 # homogeneous mixture
        src["liquidVolume"] -= dv
        dst["liquidVolume"] += dv
        mw = f * src["waterMass"]
        src["waterMass"] -= mw
        dst["waterMass"] += mw
        for k in list(src["amounts"]):
            moved = f * src["amounts"][k]
            src["amounts"][k] -= moved
            dst["amounts"][k] = dst["amounts"].get(k, 0.0) + moved

    src = contents(mix("burette", reagent("NaOH", 1.0, "NaOH", 0.1, 1.0040)))
    dst = contents(mix("flask", reagent("HCl", 1.0, "HCl", 0.1, 1.0020)))
    v0 = src["liquidVolume"] + dst["liquidVolume"]
    w0 = src["waterMass"] + dst["waterMass"]
    n0 = sum(src["amounts"].values()) + sum(dst["amounts"].values())
    for _ in range(100):
        transfer(src, dst, 0.005)
    v1 = src["liquidVolume"] + dst["liquidVolume"]
    w1 = src["waterMass"] + dst["waterMass"]
    n1 = sum(src["amounts"].values()) + sum(dst["amounts"].values())
    print("   100 transfers x 5.00 mL under the homogeneous-mixture assumption:")
    print(f"     liquidVolume  {v0:.6f} -> {v1:.6f}   drift {abs(v1 - v0) / v0:.2e}")
    print(f"     waterMass     {w0:.6f} -> {w1:.6f}   drift {abs(w1 - w0) / w0:.2e}")
    print(f"     total amount  {n0:.6f} -> {n1:.6f}   drift {abs(n1 - n0) / n0:.2e}")
    check("liquid volume conserved across transfers", abs(v1 - v0) / v0 < 1e-12)
    check("water mass conserved across transfers", abs(w1 - w0) / w0 < 1e-12)
    check("solute amount conserved across transfers", abs(n1 - n0) / n0 < 1e-12)
    print("   Volume is updated by transfer, never recomputed from mass -- which is")
    print("   why it is canonical state and must enter replayHash.")

    print("\n" + "=" * 78)
    passed = sum(1 for _, ok in CHECKS if ok)
    print(f"RESULT: {passed}/{len(CHECKS)} checks")
    for label, ok in CHECKS:
        if not ok:
            print(f"  FAILED: {label}")
    print("=" * 78)


if __name__ == "__main__":
    main()
