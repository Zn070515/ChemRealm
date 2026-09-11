# SPIKE — branded-type guarantees and the deterministic-numeric policy

> **Status: spike complete. Not a production path.**
> Answers remediation findings **P1-2** (determinism) and **P1-4** (branded types).

## Question 1 (P1-4): does `number & { __unit }` actually prevent bad arithmetic?

`ADR-0004` claimed branded numeric types make unit-mixing and pH-averaging
"unavailable". The claim was tested by writing `@ts-expect-error` directives on
the operations that are supposed to be illegal. If a directive is **unused**,
TypeScript reports `TS2578` — and that report is the falsification.

## Result 1: the claim was overstated

`npx tsc --noEmit --strict --skipLibCheck brands_number.ts`

```
brands_number.ts(47,1): error TS2578: Unused '@ts-expect-error' directive.
brands_number.ts(50,1): error TS2578: Unused '@ts-expect-error' directive.
brands_number.ts(53,1): error TS2578: Unused '@ts-expect-error' directive.
```

| Line | Operation | Branded result |
|---|---|---|
| 47 | `molA + litreB` | **compiles** — no error |
| 50 | `molA + molA` | **compiles** — no error |
| 53 | `(pH₁ + pH₂) / 2` | **compiles** — no error |

What branded types **do** provide (verified — no TS2578 on those lines):
a plain `number` cannot be assigned to a quantity; a `Mol` cannot be assigned to
a `Litre`; the *result* of arithmetic cannot be stored back as a quantity.

What they **do not** provide: they do not stop the arithmetic. `a + b` is legal
TypeScript whose type is simply `number`. The earlier wording — "arithmetic such
as adding or averaging pH is unavailable" — was false. Averaging two pH values
compiled; only *storing the result as a `Ph`* was blocked.

## Result 2: opaque types do provide it

`npx tsc --noEmit --strict --skipLibCheck brands_opaque.ts` → **exit 0, zero errors.**

Every directive was used, meaning every one of these is a genuine type error:

| Operation | Opaque result |
|---|---|
| `phA + phB` | type error — `+` not defined for `Ph` |
| `phA / 2` | type error — `/` not defined for `Ph` |
| `molA` assigned to `Litre` | type error |
| plain `number` assigned to `Mol` | type error |

The value is reachable only by explicit unwrapping (`p.value`), which is visible
in review. **That is the guarantee `ADR-0004` claimed and branded numbers do not
deliver.**

**A bug in the first version of this test is worth recording:** `Mol` and `Litre`
were initially given the *same* brand symbol, which made them structurally
identical and assignable to each other. The test caught it only because it
asserted the assignment *should* fail. A branded-type scheme with a copy-paste
error in the brand key silently provides nothing.

**Decision carried into `ADR-0004`:** opaque types for `pH` and for any quantity
whose arithmetic is conceptually meaningless; branded numbers for physical
quantities, with the guarantee stated honestly and arithmetic routed through
explicit operators that return the branded type; and a unit-round-trip property
test, since the compile-time guarantee is narrower than originally written.

## Question 2 (P1-2): is `Math.sqrt` really in the same category as `Math.log`?

No. The ECMAScript specification changed in **July 2024**: `Math.sqrt` was removed
from the "implementation-approximated" set and now carries a
correctly-rounded requirement, possible because every engine ships WebAssembly's
`f64.sqrt` and IEEE 754-2019 specifies `squareRoot` exactly. `Math.log`,
`Math.pow`, and `Math.exp` **remain implementation-approximated** under the same
NOTE that recommends (but does not require) fdlibm-derived algorithms.

Measured here on Node 26.4.0 against a 60-significant-digit `decimal` reference
over 1861 inputs spanning 1e-300 to 1e300 plus dense sampling of the acid/base
range:

| Operation | Measured error | Verdict |
|---|---|---|
| `Math.sqrt` | **0.000 ulp** | correctly rounded — safe in the hot path |
| `Math.log10` | 0.500 ulp | correctly rounded **in V8 only** |
| `Math.pow(10, x)` | 0.000 ulp | correctly rounded **in V8 only** |

**The important caveat:** these measurements describe V8. The spec permits other
engines to differ, and this spike cannot test SpiderMonkey or JavaScriptCore. So
the honest conclusion is not "log10 is fine" but "log10 is fine here, and we
cannot rely on it elsewhere."

## Question 3: can a deterministic implementation replace them?

`check.ts` implements `detLog10` (bit decomposition + atanh series) and
`detExp10` (argument reduction + Taylor), using **only** `+ - * /` and
exactly-specified integer operations, so they are bit-identical on every
conforming engine by construction.

| Implementation | Error vs true value |
|---|---|
| `detLog10` | 1.500 ulp (max) |
| `detExp10`, actual Davies domain (−0.135 .. 0) | 1.500 ulp (max) |
| `detExp10`, wide sweep (−30 .. 5) | **32.5 ulp (max)** |

`detExp10` degrades badly outside its domain: the single-constant argument
reduction loses precision as `|x|` grows. **This is an honest limitation, not a
pass.** The fix is a two-part (Cody–Waite) reduction constant, listed as an M4
task. Until then the deterministic exponential must be domain-restricted and
must refuse outside it.

## Question 4: can independent quantization break conservation?

Yes, and it is measured. 100-step serial transfer of 0.1 mol, 500 trials:

| Strategy | Relative drift in total |
|---|---|
| A. quantize the **transfer amount**, apply zero-sum | **1.39e-15** |
| B. quantize each **vessel** independently | **4.00e-12** |
| C. no quantization (float baseline) | 1.25e-15 |

Strategy B is ~3000× worse than A, and A is indistinguishable from the
unquantized baseline. Independent per-vessel (or per-species) quantization
accumulates drift because each rounding is an independent error that no
constraint corrects.

**This answers the owner's question directly and changes the design:** the
canonical persisted state stores **independent conserved amounts** (material
amounts and water mass), not species concentrations. Species, activities, and
ionic strength are **derived** and never quantized independently. A transfer is
quantized once, in the event payload, and applied as an exact zero-sum update.

## Reproduce

```
cd spikes/numeric-policy
npm install
npx tsc --noEmit --strict --skipLibCheck brands_number.ts   # expect 3x TS2578
npx tsc --noEmit --strict --skipLibCheck brands_opaque.ts   # expect exit 0
py -3.12 make_vectors.py
node check.ts
py -3.12 compare.py
```

## Provenance of the spec claim

- ECMAScript `Math.sqrt` change (July 2024) and the shared NOTE for
  `acos, asin, atan, atan2, cos, exp, log, pow, sin, sqrt, tan`:
  <https://zenn.dev/pixiv/articles/407e91e63c089e>
- IEEE 754-2019 `squareRoot`, WebAssembly `f64.sqrt`.
- **Not independently confirmed against the tc39.es normative text**: `tc39.es`
  was unreachable from this environment. The claim is corroborated by the
  measured 0.000 ulp result but the primary source should be pinned at M4.
