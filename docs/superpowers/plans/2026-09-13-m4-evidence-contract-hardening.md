# M4 Evidence Contract Hardening Plan

> **Status:** implemented locally; M4 remains S2 and this plan does not grant
> owner acceptance.

## Context

The prior M4 audit found that AC-S7 and AC-S14 were labelled PASS while their
tests covered a narrower object than the accepted criteria. The missing link
was not the solver: the tests had no single, machine-checked source for all v0
material inputs and the acceptance coverage checker only verified attachment.

## Goal

1. Make every v0 concentration, density, and molar mass traceable through one
   canonical manifest.
2. Make AC-S14 execute both declared v0 titration families and record the
   measured global maximum.
3. Strengthen AC-S13 and AC-S8 with assertions for the measured boundary and a
   scientific-core quantity guard.
4. State explicitly which evidence is mapping-only and which is semantic.

## Non-goals

- No change to the acid-base equations, model validity, or PHREEQC tolerance.
- No promotion of M4 from S2 to S3.
- No claim that the PHREEQC offset is causally explained or that the models are
  equivalent.
- No M5 UI or observable implementation.

## Architecture and ownership

The manifest and provenance records belong to M4 scientific evidence tooling.
The Scientific Reality Core remains the owner of ionic strength and model
validity. `apps/web` is only the composition-level acceptance harness; it does
not introduce a second chemistry catalog. The molarity boundary guard permits
`ScientificProjection` and rejects molarity names in other scientific
production modules.

## Scientific design

The manifest records scenario-defined concentrations, condition-dependent
solution densities, and IUPAC-derived molar masses with their source and
precision semantics. Handbook interpolation and rounded literature values are
labelled as such. AC-S14 computes water mass and analytical amounts from that
manifest, then runs both strong-acid/strong-base and weak-acid/strong-base
families over factors 0, 0.25, 0.5, 0.75, 1, 1.25, 1.5, and 2.

## Test and evidence plan

| Step | Objective | Evidence | Stop/go |
|---|---|---|---|
| 1 | Add manifest-driven provenance assertions | Python test traverses all four stocks and all datum/source records | Stop if any record is absent or uncitable |
| 2 | Replace duplicated acceptance inputs | TypeScript sweep reads the manifest and requires both families and every factor | Stop if a family/point can be omitted while the test passes |
| 3 | Strengthen criterion-specific guards | AC-S13 checks measured `I_m`; AC-S8 checks the approved molarity boundary and illegal fixture | Stop if the guard self-test does not fail on an illegal fixture |
| 4 | Align evidence and governance wording | M4 packet, provenance docs, and mapping-checker output state their exact scope | Go only after targeted and full gates pass |

## Acceptance criteria for this remediation

- Removing any v0 datum provenance or source precision causes the provenance
  test to fail.
- Removing either AC-S14 family or any factor causes the acceptance test to
  fail.
- The maximum reported by AC-S14 includes its family and equivalent factor and
  matches the manifest expectation within the stated evidence tolerance.
- A measured `0.15` or `0.30 mol/kg` HCl result must be close to the requested
  ionic strength while carrying the false accuracy-envelope flag.
- `MolPerLitre`/`molarityOf` are confined to the projection boundary, and the
  illegal-core self-test is rejected.
- The repository remains explicitly M4 S2 until the remaining owner review and
  scientific evidence gates are independently accepted.

## Rollout and migration

The manifest is a new M4 evidence artifact and does not change persisted world
or scientific wire schema. Updating a stock value requires updating its datum
record and rerunning the complete M4 evidence commands.

## Current result

The manifest, tests, guard, documentation updates, and CI wiring are complete
in the working tree. The required local verification and hosted CI attestation
must still be run on the final committed baseline before handoff.
