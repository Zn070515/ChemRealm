# M4 independent reference and oracle validation

`packages/sci/test/reference/` contains two deliberately separate fixture
namespaces:

- `REF-1.json` … `REF-10.json` are the canonical SPEC-0001 acceptance fixtures.
  REF-1/2 retain the published buffer anchors; REF-3/4/8 are analytic identity
  suites; REF-9 is the charge-conservation sweep; REF-10 is the measured
  molality/molarity sensitivity bound.
- `ORACLE-1.json` … `ORACLE-10.json` are the PHREEQC cross-engine sweep. They
  include explicit pre-/at-/post-equivalence points and are not substitutes for
  the canonical REF IDs.

The expected values for single-case REF fixtures are produced by a separate
high-precision Decimal derivation in `derive_acid_base.py`; the TypeScript
solver never writes these fixtures. Analytic and invariant REF fixtures retain
their independent relation/invariant definitions rather than inventing a
second set of expected state numbers.

After building the TypeScript workspace and installing the pinned PHREEQC
toolchain, run the complete validation with:

```text
CHEMREALM_REQUIRE_PHREEQC=1 \
  uv run python tools/oracle/reference/run_m4_validation.py \
  --output docs/evidence/M4-oracle-sweep-report.json
```

The command fails if any reference point is missing, either engine refuses a
reference case, selected output is missing, the PHREEQC toolchain is not
verified, or the pH difference exceeds `0.02`. It records every point and
never averages results. ORACLE-7, ORACLE-8, and ORACLE-9 are explicitly labelled
pre-equivalence, equivalence, and post-equivalence in the report. The report
also records signed TS-minus-PHREEQC differences and a bounded disagreement
analysis; passing the tolerance does not by itself explain the observed offset.

PHREEQC is a test-time oracle only. It is not imported into the browser or the
Scientific Reality Core.
