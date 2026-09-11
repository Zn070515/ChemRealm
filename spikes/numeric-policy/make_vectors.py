"""Generate input vectors for the numeric-policy spike (remediation P1-2).

Inputs only. The high-precision references are computed in compare.py, so that
no reference value is ever produced by the implementation under test.

Run: py -3.12 make_vectors.py
"""

import json
import math
import random
import struct


def hexf(x):
    return struct.pack(">d", x).hex()


def main():
    random.seed(20260911)

    log10_values = []

    # (a) logarithmic sweep over the full normal-double range
    for e in range(-300, 301, 3):
        log10_values.append(10.0 ** e)
        log10_values.append(3.0 * 10.0 ** e)

    # (b) dense sweep in the range that actually matters for acid/base:
    #     hydrogen-ion activity spans roughly 1e-14 .. 1. In practice the
    #     quantity passed to log10 is a_H and gamma.
    for i in range(0, 601):
        log10_values.append(10.0 ** (-14.0 + 14.0 * i / 600.0))

    # (c) values close to 1, where subtractive cancellation hurts
    for i in range(1, 200):
        log10_values.append(1.0 + i * 1.0e-8)
        log10_values.append(1.0 - i * 1.0e-8)

    # (d) random uniforms over several decades
    for _ in range(400):
        log10_values.append(10.0 ** random.uniform(-16.0, 1.0))

    # (e) exact powers of two, where a correct implementation is exact
    log10_values.extend([float(1 << k) for k in range(0, 60)])

    log10_values = [v for v in log10_values if v > 0.0 and math.isfinite(v)]

    exp10_values = []

    # (a) THE ACTUAL DOMAIN: log10(gamma) from Davies at I in [0, 0.5].
    #     A = 0.509, b = 0.3 -> log10(gamma) in about [-0.135, 0].
    for i in range(0, 601):
        exp10_values.append(-0.135 * i / 600.0)

    # (b) a wider margin, in case the activity model is extended later
    for i in range(-1600, 201, 7):
        exp10_values.append(i / 100.0)

    # (c) random values across a broad range
    for _ in range(400):
        exp10_values.append(random.uniform(-30.0, 5.0))

    # (d) exact integers, where exp10 has no exact answer but is well conditioned
    exp10_values.extend([float(k) for k in range(-30, 6)])

    exp10_values = [v for v in exp10_values if math.isfinite(v)]

    out = {
        "generator": "make_vectors.py",
        "seed": 20260911,
        "log10": [hexf(v) for v in log10_values],
        "exp10": [hexf(v) for v in exp10_values],
    }

    with open("vectors.json", "w", encoding="utf-8") as f:
        json.dump(out, f)

    print(f"wrote vectors.json: {len(log10_values)} log10 inputs, "
          f"{len(exp10_values)} exp10 inputs")


if __name__ == "__main__":
    main()
