# M4 independent reference and oracle validation

`packages/sci/test/reference/` contains the checked-in REF-1…REF-10 cases. The
expected values are produced by a separate high-precision Decimal derivation
in `derive_acid_base.py`; the TypeScript solver never writes these fixtures.

After building the TypeScript workspace and installing the pinned PHREEQC
toolchain, run the complete validation with:

```text
CHEMREALM_REQUIRE_PHREEQC=1 \
  uv run python tools/oracle/reference/run_m4_validation.py \
  --output docs/evidence/M4-reference-report.json
```

The command fails if any reference point is missing, either engine refuses a
reference case, selected output is missing, the PHREEQC toolchain is not
verified, or the pH difference exceeds `0.02`. It records every point and
never averages results. REF-7, REF-8, and REF-9 are explicitly labelled
pre-equivalence, equivalence, and post-equivalence in the report.

PHREEQC is a test-time oracle only. It is not imported into the browser or the
Scientific Reality Core.
