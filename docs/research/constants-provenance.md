# M4 Scientific Constant Provenance

Status: **implementation evidence in progress; not an S3 acceptance record**.

This file is the source record for the fixed `acidbase-monoprotic-davies@1.0.0`
identity and for scenario-frozen indicator constants. A number in the TypeScript
implementation is not accepted merely because it is familiar or appears in a
textbook. The source, basis, temperature, precision, and approximation status
must be recorded here first.

## Fixed model parameters

| Parameter | Value used by M4 | Interpretation | Basis/condition | Source and precision | Status |
|---|---:|---|---|---|---|
| `Kw` | `1.0e-14` | thermodynamic autoprotolysis constant of water | activity/molality convention, 25 °C | [IUPAC Gold Book, autoprotolysis constant](https://goldbook.iupac.org/terms/view/A00532); source literal is `1.0e-14` at 25 °C | pinned at the recorded source precision |
| `Ka_HOAc` | `1.7539e-5` | thermodynamic dissociation constant for CH₃COOH ⇌ H⁺ + CH₃COO⁻ | aqueous, 25 °C, pKa `4.7560`; converted as `10^-pKa` | [USGS acetic-acid data report](https://pubs.usgs.gov/of/1990/0408/report.pdf), table value `pKa = 4.7560` at 25 °C | pinned derived value; oracle alignment still required |
| `Davies A` | `0.509` | Davies coefficient on the reduced ionic-strength convention | water, 25 °C | Davies, C. W. (1962), *Ion Association*, Butterworths; value and convention are fixed by `SPEC-0001` and `ADR-0003` | model policy, source record retained |
| `Davies b` | `0.3` | original Davies empirical extension coefficient | water, 25 °C | Davies, C. W. (1962), *Ion Association*, Butterworths; fixed by `SPEC-0001` and `ADR-0003` | model policy, source record retained |
| `standardMolality` | `1 mol/kg` | standard molality / standard-state scale used to make reduced molality dimensionless | molality basis | `docs/science/quantity-ontology.md` and `ADR-0004`; a convention, not an empirical fit | pinned convention |
| `neutralAcidActivityCoefficient` | `1` | bounded v0 approximation for neutral HA | dilute aqueous domain | `SPEC-0001` §Scientific design; explicitly labelled approximation, not measured data | pinned approximation |
| `waterActivity` | `1` | unit-water-activity v0 convention; not a multiplier in `Kw = a_H · a_OH` | dilute aqueous domain | `SPEC-0001`, `ADR-0003`, and `ADR-0012`; explicitly labelled model convention | pinned approximation |

`Ka_HOAc` is stored as the derived decimal shown above so the replay identity
is stable. It must not be recomputed from a different rounded pKa at runtime.
The implementation must still assert that a request's HOAc `ka` exactly equals
this frozen value.

The machine-readable companion [`constants-provenance.json`](constants-provenance.json)
records the source literal, source significant digits, canonical value, and
canonical significant digits for every numeric solver-identity parameter. The
trailing zeros sometimes used in explanatory prose are display formatting, not
additional source precision; the JSON record is the precision authority.

## Scenario-frozen indicator inputs

Indicator constants are scenario-specific scientific inputs, not silently
promoted to the global solver configuration. Content resolution must attach the
canonical positive `kaIn` and a per-datum `DataProvenance` record to
`ScenarioSnapshot.indicators`; the genesis content hash then freezes the value.
SolveRequest builders copy indicators only from that snapshot and never read a
mutable catalog at replay time. The current v0 teaching contract names these
candidate values:

| Indicator | Candidate `pKa_in` | Candidate `Ka_in` | Source/status |
|---|---:|---:|---|
| Phenolphthalein | approximately `9.4` | derived only after source precision is pinned | `SPEC-0001` transition table; primary source still required before AC-S7 can be claimed |
| Methyl orange | approximately `3.4` | derived only after source precision is pinned | `SPEC-0001` transition table; primary source still required before AC-S7 can be claimed |

No indicator candidate is evidence-complete yet. M4 may use an explicitly
recorded provisional fixture for continuity tests, but S3 must remain blocked
until each value used in accepted evidence has a citable source and source
precision. An ad hoc request-local indicator that is absent from the frozen
snapshot is not a replayable world input.

## Precision and model boundary rules

- A source precision is not improved by JavaScript `number` formatting.
- `Davies A = 0.509` and `b = 0.3` are dimensionless under the accepted reduced
  ionic-strength formulation. They must not be silently replaced by a
  molarity-basis coefficient or by PHREEQC's unrelated activity convention.
- `γ_HA = 1` and `a_w = 1` are model approximations. They are not presented as
  measured universal constants.
- The v0 water equation uses the pinned autoprotolysis definition
  `Kw = a_H · a_OH`. `waterActivity = 1` is retained in solver identity as an
  explicit convention, but is not multiplied into `Kw`; a future non-unit
  water-activity model requires a new convention, source, version, and oracle
  validation.
- A changed fixed value means a changed solver configuration and therefore a
  changed replay identity. It requires a new evidence baseline and owner review.

## PHREEQC toolchain provenance

The test oracle is the pinned USGS release described by
[`tools/oracle/phreeqc/manifest.json`](../../tools/oracle/phreeqc/manifest.json):

- release: `3.8.6-17100`;
- source archive: the official USGS PHREEQC download;
- database: `phreeqc.dat` from the same archive;
- archive and extracted-database SHA-256 values are recorded in the manifest;
- PHREEQC runs in test tooling only and is never bundled into the browser or
  runtime package.

The PHREEQC/database checksum and version are prerequisites for AC-S6. A local
run without the executable is not an oracle pass.

## Open evidence items

The following are intentionally visible rather than silently promoted to
accepted evidence:

1. The exact primary sources for the indicator values and their usable source
   precision must be added before M4 S3.
2. The PHREEQC database entries and generated input conventions must be checked
   against the TypeScript model in the cross-engine report.
3. The neutral-acid and unit-water-activity approximations need the bounded
   error statement already required by the SPEC; they must not be described as
   experimentally exact.
