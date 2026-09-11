"""Compare the Node/TypeScript results against arbitrary-precision references.

References are computed with decimal.Decimal at 60 significant digits, so the
comparison is against a near-exact value, not against another float library.

Run (after make_vectors.py and check.ts):
    py -3.12 compare.py
"""

import json
import math
import struct
from decimal import Decimal, getcontext

getcontext().prec = 60

LN10 = Decimal(10).ln()


def unhex(h):
    return struct.unpack(">d", bytes.fromhex(h))[0]


def ulp_error(computed, reference):
    """Absolute error expressed in units in the last place of the reference."""
    if reference == 0:
        return 0.0 if computed == 0 else float("inf")
    ref = Decimal(reference)
    comp = Decimal(computed)
    err = abs(comp - ref)
    # ulp of a double near |ref| is 2^(floor(log2|ref|) - 52)
    exp = ref.adjusted()  # decimal exponent
    # convert to binary exponent
    mag = abs(ref)
    be = int(mag.ln() / Decimal(2).ln())
    ulp = Decimal(2) ** (be - 52)
    return float(err / ulp)


def main():
    vectors = json.load(open("vectors.json", encoding="utf-8"))
    node = json.load(open("node_results.json", encoding="utf-8"))

    print("=" * 78)
    print("SPIKE (remediation P1-2): numeric behaviour, measured against")
    print("arbitrary-precision references (Decimal, 60 significant digits)")
    print(f"  Node engine: {node['engine']}")
    print("=" * 78)

    # ------------------------------------------------------------- sqrt
    print("\n-- Math.sqrt: is it correctly rounded, i.e. cross-engine stable? --")
    worst = 0.0
    for row in node["sqrt"]:
        x = unhex(row["x"])
        y = unhex(row["y"])
        ref = Decimal(x).sqrt()  # correctly rounded at prec=60
        e = ulp_error(y, float(ref))
        worst = max(worst, e)
    print(f"   {len(node['sqrt'])} inputs, domain 1e-300 .. 1e300, plus dense")
    print(f"   sampling of the acid/base range and values near 1.")
    print(f"   max error vs correctly-rounded reference = {worst:.3f} ulp")
    print(f"   -> {'CORRECTLY ROUNDED (deterministic)' if worst <= 0.5 else 'NOT correctly rounded'}")
    sqrt_ok = worst <= 0.5

    # ------------------------------------------------------------ log10
    print("\n-- Math.log10 vs a deterministic, self-implemented log10 --")
    worst_native = 0.0
    worst_det = 0.0
    worst_pairwise = 0.0
    for row in node["log10"]:
        x = unhex(row["x"])
        if x <= 0:
            continue
        ref = Decimal(x).ln() / LN10
        ref_f = float(ref)
        worst_native = max(worst_native, ulp_error(unhex(row["y"]), ref_f))
        worst_det = max(worst_det, ulp_error(unhex(row["det"]), ref_f))
        # how far apart are the two implementations from EACH OTHER?
        a, b = unhex(row["y"]), unhex(row["det"])
        if ref_f != 0:
            worst_pairwise = max(worst_pairwise, abs(a - b) / abs(ref_f) / 2 ** -52)
    print(f"   {len(node['log10'])} inputs")
    print(f"   Math.log10            max error = {worst_native:8.3f} ulp")
    print(f"   detLog10 (ours)       max error = {worst_det:8.3f} ulp")
    print(f"   native vs ours        max separation = {worst_pairwise:.3f} ulp")
    print("   The separation column is the one that matters: it bounds how far")
    print("   two engines using DIFFERENT log10 implementations can disagree.")
    log10_ok = worst_det <= 2.0

    # ------------------------------------------------------------ exp10
    print("\n-- Math.pow(10, x) vs a deterministic, self-implemented exp10 --")
    worst_native = 0.0
    worst_det = 0.0
    worst_in_domain = 0.0
    for row in node["exp10"]:
        x = unhex(row["x"])
        ref = Decimal(10) ** Decimal(x)
        if not ref.is_finite() or ref == 0:
            continue
        ref_f = float(ref)
        if not math.isfinite(ref_f) or ref_f == 0:
            continue
        e_n = ulp_error(unhex(row["y"]), ref_f)
        e_d = ulp_error(unhex(row["det"]), ref_f)
        worst_native = max(worst_native, e_n)
        worst_det = max(worst_det, e_d)
        if -0.135 <= x <= 0.0:  # the actual Davies domain
            worst_in_domain = max(worst_in_domain, e_d)
    print(f"   {len(node['exp10'])} inputs")
    print(f"   Math.pow(10, x)       max error = {worst_native:8.3f} ulp")
    print(f"   detExp10 (ours)       max error = {worst_det:8.3f} ulp")
    print(f"   detExp10 IN DOMAIN (-0.135..0) max error = {worst_in_domain:.3f} ulp")
    exp10_ok = worst_in_domain <= 2.0

    # ------------------------------------------------------ conservation
    print("\n-- Quantization vs conservation (the owner's question) --")
    c = node["conservation"]
    print("   100-step serial transfer of 0.1 mol, 500 trials each:")
    print(f"     A. quantize the TRANSFER amount, apply zero-sum : "
          f"{c['A_transfer_amount_quantized']:.3e} relative drift")
    print(f"     B. quantize each VESSEL independently           : "
          f"{c['B_vessels_quantized_independently']:.3e} relative drift")
    print(f"     C. no quantization                              : "
          f"{c['C_no_quantization']:.3e} relative drift")
    print("   -> Independent per-species quantization accumulates drift.")
    print("      Quantizing the event payload once does not. This is why the")
    print("      canonical state must store independent amounts, not species.")
    cons_ok = c["B_vessels_quantized_independently"] > c["A_transfer_amount_quantized"]

    print("\n" + "=" * 78)
    results = [
        ("Math.sqrt correctly rounded", sqrt_ok),
        ("detLog10 within 2 ulp", log10_ok),
        ("detExp10 within 2 ulp in domain", exp10_ok),
        ("independent quantization demonstrably worse", cons_ok),
    ]
    for label, ok in results:
        print(f"  [{'PASS' if ok else 'FAIL'}] {label}")
    print("=" * 78)


if __name__ == "__main__":
    main()
