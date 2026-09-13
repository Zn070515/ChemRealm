# v0 Scientific Input Manifest

> **Status:** M4 evidence input record; it is not a claim that the v0 model is
> equivalent to PHREEQC or valid outside its declared envelope.

[`v0-scientific-inputs.json`](v0-scientific-inputs.json) is the canonical
machine-readable input record for the M4 v0 acid-base acceptance scenarios.
The TypeScript acceptance sweep and the Python provenance checker must read the
same file. No test may silently copy its concentration, density, molar-mass,
temperature, or equivalent-factor catalog.

## What is frozen

The manifest freezes:

- the 25 °C / 101.325 kPa scenario condition where a solution-density source is
  condition-dependent;
- the four v0 stock identities: HCl, NaOH, HOAc, and NaOAc;
- each stock's analytical concentration, solution density, and molar mass;
- datum-level provenance, source literal, citation, precision, and method;
- the strong-acid/strong-base and weak-acid/strong-base families;
- the eight equivalent factors from 0 through 2;
- the proposed `0.12 mol/kg` accuracy envelope and expected measured maximum.

The stock concentration is a scenario-defined analytical input, not a claim
that a particular commercial bottle was assayed. Density records distinguish a
direct product value from a handbook interpolation or a rounded literature
value. Molar masses are calculated from the cited IUPAC atomic weights. Those
distinctions are part of the provenance and must not be erased by the test
fixture.

## Source and approximation boundaries

The HCl and NaOH density records cite the relevant 0.100 normal product
records. The dilute HOAc value is an explicit interpolation from the cited
handbook table, and the NaOAc value is a rounded v0 input based on the cited
aqueous density study. Their uncertainty/method fields are therefore not
optional decoration: changing either value requires updating its record and
rerunning the acceptance evidence.

This manifest does not make volume additivity a thermodynamic law. The v0
operational scenario uses the stated stock volumes and water-mass calculation;
composition changes remain inputs to the Scientific Reality Core. The
historical activity-equilibrium spike is not an additional source of truth.

## Required checks

`tools/oracle/tests/test_constants_provenance.py` must fail when a stock loses a
datum provenance record, source record, citation, or precision metadata. It
also checks that all four stocks are present and that the source record covers
the fields used by resolution.

`apps/web/src/m4-acceptance.test.ts` must fail when either v0 family or any
equivalent factor is omitted. It records the measured ionic strength for every
point, verifies the global maximum and its family/factor against the manifest,
and checks that all results remain within the computational and proposed
accuracy domains.

The manifest is input evidence, not a replacement for independent reference
fixtures. Canonical `REF-*` cases and the PHREEQC `ORACLE-*` namespace retain
their separate identities.
