# v0 Scientific Input Manifest

> **Status:** M4 evidence input record; it is not a claim that the v0 model is
> equivalent to PHREEQC or valid outside its declared envelope.

[`v0-scientific-inputs.json`](v0-scientific-inputs.json) is the canonical
machine-readable input record for the M4 v0 acid-base acceptance scenarios.
The TypeScript acceptance sweep and the Python provenance checker must read the
same file. No test may silently copy its concentration, density, molar-mass,
temperature, or equivalent-factor catalog.

## What is frozen

The manifest freezes only scientific **inputs**:

- the 25 °C scenario condition when a solution-density source reports it;
- the four v0 stock identities: HCl, NaOH, HOAc, and NaOAc;
- each stock's analytical concentration, solution density, and molar mass;
- datum-level provenance, source literal, citation, reported precision, source
  conditions, and any model derivation;
- the strong-acid/strong-base and weak-acid/strong-base families;
- the eight equivalent factors from 0 through 2;
- the proposed `0.12 mol/kg` accuracy envelope.

[`v0-envelope-reference.json`](v0-envelope-reference.json) is a separate,
independent acceptance reference. It pins the envelope maximum, its location,
its tolerance, and the SHA-256 digest of the input manifest it was reviewed
against. An input edit therefore cannot silently retune the expected result.

The stock concentration is a scenario-defined analytical input, not a claim
that a particular commercial bottle was assayed. Density records distinguish a
direct product value, a handbook interpolation, and a bounded model
approximation. Molar masses are calculated from the cited IUPAC atomic weights.
Those distinctions are part of the provenance and must not be erased by the
test fixture.

## Source and approximation boundaries

The HCl and NaOH density records cite the relevant 0.100 normal product
records. Their source literals preserve the display actually reported by the
supplier: the NaOH record is `1 g/cm³`, not invented `1.000 g/mL` precision.
The dilute HOAc value is an explicit interpolation from Perry's **8th edition**
Table 2-109, with its two table rows recorded. The NaOAc value is explicitly a
bounded v0 model approximation based on the cited aqueous-density study; it is
not represented as a source-quoted density. A source that does not report a
numeric pressure does not acquire `101.325 kPa` in its provenance.

`reportedPrecision` describes only what the source reports. `model-approximation`
and `derived` make a project decision visible rather than laundering it into a
measurement. Changing an input requires updating its record, reviewing the
separate envelope reference, and rerunning acceptance evidence.

This manifest does not make volume additivity a thermodynamic law. The v0
operational scenario uses the stated stock volumes and water-mass calculation;
composition changes remain inputs to the Scientific Reality Core. The
historical activity-equilibrium spike is not an additional source of truth.

## Required checks

`tools/oracle/tests/test_constants_provenance.py` must fail when a stock loses a
datum provenance record, source record, citation, source-faithful precision, or
condition metadata. It also checks that all four stocks are present, rejects
invented density pressure, and checks the known NaOH and HOAc source records.

`apps/web/src/m4-acceptance.test.ts` must fail when either v0 family or any
equivalent factor is omitted. It records the measured ionic strength for every
point, verifies the global maximum and its family/factor against the separate
reference, and checks that all results remain within the computational and
proposed accuracy domains. The sweep runs the production path:
`Scenario → WorldCreated → canonical WorldState → SolveRequest → SolverAdapter`.

The manifest is input evidence, not a replacement for independent reference
fixtures. Canonical `REF-*` cases and the PHREEQC `ORACLE-*` namespace retain
their separate identities.
