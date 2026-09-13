# M4 Reference and PHREEQC Oracle Validation Plan

> Scope: execute M4's existing Task 7–10 contract after the schema and
> cross-system remediation. This plan does not promote M4 to S3 automatically;
> every disagreement remains visible until investigated.

> **Status:** Implemented and locally verified on the current round baseline.
> M4 remains S2 because AC-S3, AC-S7, and AC-S10…AC-S16 still require their
> own evidence and owner acceptance.

## Context

The deterministic v0 acid-base adapter, persisted genesis contracts, and
PHREEQC source/database manifest are implemented. The independent reference
matrix and actual pinned PHREEQC process execution are now recorded by the
artifacts produced by this plan; M4 remains S2 until the complete acceptance
matrix is exercised.

## Goal

- Hand-author canonical SPEC-0001 REF-1…REF-10 from an independent derivation
  and validate them with the production adapter without generating expected
  values from that adapter.
- Execute the pinned PHREEQC CLI with verified source/database/executable
  identity and parse named selected output.
- Compare the separately named ORACLE-1…ORACLE-10 TS/PHREEQC sweep over
  pre-equivalence, equivalence, and post-equivalence cases, reporting every
  point and every signed disagreement.

## Non-goals

- No new chemistry beyond the accepted monoprotic aqueous v0 model.
- No World Runtime, renderer, ACE, persistence, or M5 implementation.
- No averaging, nearest-point substitution, tolerance widening, or fixture
  rewriting to hide an unexplained disagreement.

## Ownership and assumptions

- Scientific Reality Core owns the TypeScript solver and scientific fixtures.
- `tools/oracle/phreeqc` owns test-only CLI execution and parsing.
- Reference values come from a separate high-precision Python derivation and/or
  citable source record; PHREEQC is a second independent check, not a source for
  copying TS output.
- The comparison convention, water activity convention, constants, database,
  and model validity envelope remain those recorded in M4 design/ADR-0012.

## Ordered implementation

1. [x] Fix documentation residue and make the pinned installer reproducible on the
   available Windows compiler without weakening the Linux CI path.
2. [x] Add a versioned reference fixture schema/loader and hand-authored REF-1…10
   cases covering strong acid/base, weak acid, dilute, buffer, pre-/at-/post-
   equivalence, projection, and indicator behavior. Add independent invariant
   checks and a tamper test.
3. [x] Add PHREEQC case generation/output parsing and a hard-required execution
   path. Verify the executable banner/version and generated toolchain metadata;
   local overrides remain explicitly unverified.
4. [x] Add TS/PHREEQC cross-engine comparison and a complete report with all input
   identities, output rows, max differences, and failure reasons.
5. [x] Update the M4 evidence matrix only from actual runs. Keep M4 S2 if a critical
   criterion is missing or any disagreement is unexplained.

## Acceptance criteria

| Criterion | Evidence |
|---|---|
| Canonical REF-1…REF-10 are independent and complete | checked-in fixtures, provenance/derivation, schema validation, tamper failure |
| TS satisfies reference tolerances | Vitest reference suite and invariant report |
| Pinned PHREEQC actually ran | verified toolchain metadata, CLI output, checksum/version report |
| Every ORACLE sweep point is compared | machine-readable cross-engine report; no missing rows or renamed canonical REF claims |
| Equivalence region is included | explicit weak-acid/strong-base pre/at/post points |
| Failures are truthful | domain/numerical failures retain tagged status; no averaging or hiding |

## Verification and handoff

Run the existing full TypeScript/Python gates plus the PHREEQC-required command
on a committed baseline. The current local run records 10/10 ORACLE points, a
maximum absolute pH difference of `0.0193938057606573`, signed differences, and
verified pinned PHREEQC source/executable/database identity. The complete
handoff is in `docs/evidence/M4.md` and
`docs/evidence/M4-oracle-sweep-report.json`. M5 remains unauthorized until the
owner accepts the completed M4 matrix.
