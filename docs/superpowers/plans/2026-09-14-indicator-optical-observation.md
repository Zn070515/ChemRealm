# Indicator Optical Observation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace endpoint-RGB indicator presentation with a replayable, provenance-bearing Beer–Lambert optical-observation boundary that refuses unsupported chemistry or optics instead of inventing a colour.

**Architecture:** The World Runtime freezes an indicator dose, an optical-profile snapshot, and a declared vessel optical path at genesis. The Scientific Reality Core supplies model-owned chemical-form fractions or a chemical-coverage refusal; the Representation Engine combines only covered forms, conserved concentration, frozen path, and spectrum data into a deterministic optical observation. Renderer and DOM consume the tagged observation and never infer an indicator colour from pH, `Ka`, or a protonation ratio.

**Tech Stack:** TypeScript 5.9, Zod, Vitest, React, Playwright, pnpm workspaces, existing `@chemrealm/schema` canonical hashing and branded quantities, Rust/WASM native bridge, Python evidence checks.

**Spec:** `docs/superpowers/specs/2026-09-14-indicator-optical-observation.md` and the required `SPEC-0001` revision 27 Candidate amendment.

## Global Constraints

- `contracts/version-manifest.json` is the sole manually maintained current-version source; run `pnpm generate:versions` after every active-version change and `pnpm verify:versions` before every commit.
- Do not alter accepted M4 acid-base equations, constants, or validity domain to make a colour appear. The current Davies v0 model cannot emit phenolphthalein's extreme-acid orange form.
- `OPTICAL_MODEL_OK` requires a checked-in quantitative spectrum, source/condition provenance, a reviewed profile, a covered chemical form, a conserved indicator amount, and a declared path length.
- `OPTICAL_MODEL_DATA_MISSING` and `OPTICAL_MODEL_OUT_OF_COVERAGE` are valid, user-visible outcomes. They must never fall back to `INDICATOR_COLOUR_PALETTES`, endpoint RGB interpolation, or a generic acid/base colour.
- Persisted world/event and authored-scenario version changes are forward-only. A migration may add an empty optical block but may not invent a historic indicator dose, profile, spectrum, form, or source condition.
- Profile content hashes and path artifacts are frozen genesis truth. A replay or export may not look up mutable current content to recover them.
- The renderer consumes `IndicatorOpticalObservation` only. It does not receive `Ka`, pH, activity, activity coefficient, or raw form-equilibrium expressions.
- A fixed declared optical path is the only initial path rule. View-dependent, camera-derived, scattering, fluorescence, turbidity, and precipitation optics are outside this plan.
- Use source statements literally: do not add decimal precision, pressure, wavelength coverage, concentration range, or license rights absent from the source record.

---

## File Structure

| File | Responsibility |
|---|---|
| `contracts/version-manifest.json` | Sole active versions for world/scenario/scientific/observable/optical-profile contracts. |
| `packages/schema/src/indicator-optics.ts` | Serializable profile, path, form-observation and output DTO schemas, canonical hashes, and DTO-to-domain parsers. |
| `packages/schema/src/scientific.ts` | Scientific-state and solve-request indicator contracts. |
| `packages/schema/src/content.ts` / `world.ts` | Authored optical declaration and frozen genesis snapshot contracts. |
| `packages/schema/src/migrate.ts` / `scenario-migrate.ts` | Explicit v4→v5 migration/refusal behaviour. |
| `packages/world/src/state.ts` / `reduce.ts` | Per-vessel conserved indicator inventory and transfer semantics. |
| `apps/web/src/world-creation.ts` | One-time authoring-to-genesis resolution of optical inputs and content hashes. |
| `packages/sci/src/acidbase/indicator.ts` / `request.ts` / `result.ts` | Model-owned form output or explicit chemical-coverage refusal. |
| `native/sci-core/src/lib.rs` / `tests/contract.rs` | Same serialized indicator result semantics for WASM/native execution. |
| `packages/render/src/observable/optics.ts` | Deterministic Beer–Lambert, spectral integration, coverage checks, and tagged observation construction. |
| `packages/render/src/observable/index.ts` / `state/scene.ts` | Observable/scene consumption of optical status, tint, and inspection metadata. |
| `apps/web/src/composition.ts` / `App.tsx` | Only production path from committed world to scientific frame, optical observation, and DOM. |
| `docs/research/indicator-optics/` | Source packets, extraction records, profile review records, and accepted numeric artifacts. |
| `tools/check_indicator_optics_contract.mjs` | Static cross-core boundary and source-artifact checks. |
| `tools/check_versions.mjs` | Extended manifest-only version verification. |

## Contracts Introduced by This Plan

All names below are introduced in the task that creates them; later tasks use
these exact contracts.

```ts
type IndicatorChemicalObservation =
  | {
      readonly status: "CHEMICAL_FORMS_OK";
      readonly indicatorId: string;
      readonly totalAmount: Mol;
      readonly forms: readonly { readonly formId: string; readonly fraction: number }[];
      readonly modelId: string;
      readonly modelVersion: string;
      readonly sourceReplayHash: string;
    }
  | {
      readonly status: "CHEMICAL_FORMS_UNAVAILABLE";
      readonly indicatorId: string;
      readonly totalAmount: Mol | undefined;
      readonly reason: string;
      readonly modelId: string;
      readonly modelVersion: string;
      readonly sourceReplayHash: string;
    };

type IndicatorOpticalObservation =
  | {
      readonly status: "OPTICAL_MODEL_OK";
      readonly indicatorId: string;
      readonly tintSrgb: readonly [number, number, number];
      readonly tintStrength: number;
      readonly transmittanceSamples: readonly {
        readonly wavelengthNanometres: number;
        readonly transmittance: number;
      }[];
      readonly profileId: string;
      readonly profileHash: string;
      readonly sourceReplayHash: string;
      readonly conditions: Readonly<Record<string, number | string>>;
    }
  | {
      readonly status: "OPTICAL_MODEL_DATA_MISSING" | "OPTICAL_MODEL_OUT_OF_COVERAGE";
      readonly indicatorId: string;
      readonly reason: string;
      readonly sourceReplayHash: string;
      readonly missingOrOutOfRange: readonly string[];
    };

interface FrozenIndicatorOpticalInput {
  readonly indicatorId: string;
  readonly initialVesselId: string;
  readonly totalAmount: Mol;
  readonly opticalProfile: OpticalProfileSnapshot;
  readonly provenance: DataProvenance;
}

interface FrozenOpticalPathSnapshot {
  readonly pathRuleId: string;
  readonly pathRuleVersion: string;
  readonly pathRuleHash: string;
  readonly representation: "fixed-path";
  readonly pathLength: Millimetre;
  readonly minLiquidVolume: Litre;
  readonly maxLiquidVolume: Litre;
  readonly provenance: DataProvenance;
}

interface OpticalProfileSourceRecord {
  readonly citation: string;
  readonly sourceUrl: string;
  readonly accessedOn: string;
  readonly licenseOrPermission: "open" | "permission-recorded";
  readonly extractionMethod: "machine-readable" | "digitized";
  readonly rawDataLocation: string;
  readonly reportedPrecision: string;
  readonly digitisationUncertainty: string | undefined;
  readonly conditions: {
    readonly solvent: string;
    readonly temperature: string;
    readonly concentration: string;
    readonly pathLength: string;
    readonly acidityOrIonicStrength: string;
  };
}
```

The persisted path uses the repository's existing canonical length unit `mm`.
The Representation Engine converts it exactly once to centimetres with
`pathLengthCm = pathLengthMm / 10` immediately before the Beer–Lambert equation;
no new length unit or duplicated conversion contract is introduced.

`OpticalProfileSnapshot` is a schema-owned, content-addressed artifact with
`profileId`, `profileVersion`, `profileHash`, indicator/form spectra, declared
conditions/ranges, illuminant/observer/transform identity, source provenance,
`source: OpticalProfileSourceRecord`, and `reviewStatus`. Its exact Zod schema
is defined in Task 2; its hash excludes the self-referential `profileHash`
field, like `VolumeProfileSnapshot`.

### Task 1: Establish canonical authority, explicit versions, and admission gates

**Files:**
- Modify: `contracts/version-manifest.json`
- Modify: `packages/schema/src/generated/versions.ts` (generated)
- Modify: `docs/specs/SPEC-0001-world-foundation-acid-base-titration.md`
- Create: `docs/adr/0016-indicator-optical-observation-boundary.md`
- Create: `tools/check_indicator_optics_contract.mjs`
- Modify: `package.json`
- Test: `tests/version-manifest.test.mjs`
- Test: `tests/indicator-optics-contract.test.mjs`

**Interfaces:**
- Consumes: `VERSION_MANIFEST` and accepted revision 20.
- Produces: revision 27 Candidate, `VERSION_MANIFEST.schema.world === 5`, `VERSION_MANIFEST.schema.scenario === 5`, `VERSION_MANIFEST.schema.scientific === 4`, `VERSION_MANIFEST.representation.observableModel === 2`, `VERSION_MANIFEST.representation.indicatorOpticalProfile === "1.0.0"`, and `VERSION_MANIFEST.representation.opticalPath === "1.0.0"`.

- [ ] **Step 1: Write the failing manifest and contract checks**

```ts
expect(VERSION_MANIFEST.schema.world).toBe(5);
expect(VERSION_MANIFEST.schema.scenario).toBe(5);
expect(VERSION_MANIFEST.schema.scientific).toBe(4);
expect(VERSION_MANIFEST.representation.indicatorOpticalProfile).toBe("1.0.0");
expect(VERSION_MANIFEST.representation.opticalPath).toBe("1.0.0");
```

Make `tools/check_indicator_optics_contract.mjs` fail unless the canonical SPEC
revision 27 Candidate states all three optical statuses, prohibits endpoint-RGB
fallback, freezes dose/profile/path in genesis, and says v0 cannot emit
strong-acid phenolphthalein orange.

- [ ] **Step 2: Run the checks and verify RED**

```text
pnpm exec vitest run tests/version-manifest.test.mjs tests/indicator-optics-contract.test.mjs
pnpm verify:versions
node tools/check_indicator_optics_contract.mjs
```

Expected: failures because the manifest has no optical profile/path versions,
SPEC has no revision 27 contract, and the optical contract checker does not
exist.

- [ ] **Step 3: Make the central version and canonical-spec change**

Edit only `contracts/version-manifest.json` for active version values, run
`pnpm generate:versions`, and never insert an active schema/profile version
literal in production TypeScript, Rust, Python, JSON artifacts, or docs. Add
SPEC revision 27 Candidate with AC-O1 through AC-O8 verbatim from the approved
design. ADR-0016 records the four-core ownership, status/refusal rule, fixed
path v1 scope, and the distinction between chemical-form coverage and optical
coverage. Add the package scripts `verify:indicator-optics` for
`node tools/check_indicator_optics_contract.mjs` and
`verify:indicator-profiles` for `node tools/check_indicator_optical_profiles.mjs`;
the latter command may fail until Task 8 creates its checker.

- [ ] **Step 4: Run focused checks and verify GREEN**

```text
pnpm generate:versions
pnpm verify:versions
pnpm exec vitest run tests/version-manifest.test.mjs tests/indicator-optics-contract.test.mjs
node tools/check_indicator_optics_contract.mjs
```

- [ ] **Step 5: Commit the authority boundary**

```text
git add contracts/version-manifest.json packages/schema/src/generated/versions.ts docs/specs/SPEC-0001-world-foundation-acid-base-titration.md docs/adr/0016-indicator-optical-observation-boundary.md tools/check_indicator_optics_contract.mjs package.json tests/version-manifest.test.mjs tests/indicator-optics-contract.test.mjs
git commit -m "Specify indicator optical observation contracts"
```

### Task 2: Create serializable optical-profile and fixed-path artifacts

**Files:**
- Create: `packages/schema/src/indicator-optics.ts`
- Create: `packages/schema/src/indicator-optics.test.ts`
- Modify: `packages/schema/src/index.ts`
- Modify: `packages/schema/src/json-schema.ts`
- Modify: `packages/schema/scripts/emit-json-schema.mjs`
- Modify: `packages/schema/json-schema/*.schema.json` (generated)

**Interfaces:**
- Consumes: `DataProvenanceSchema`, canonical quantities, `hashCanonical`, and manifest-derived profile/path versions.
- Produces: `OpticalProfileSnapshotSchema`, `FrozenOpticalPathSnapshotSchema`, `IndicatorChemicalObservationSchema`, `IndicatorOpticalObservationSchema`, `opticalProfileHash`, `opticalPathHash`, `parseOpticalProfileSnapshot`, and `parseFrozenOpticalPathSnapshot`.

- [ ] **Step 1: Write failing parser/hash tests**

```ts
expect(() => parseOpticalProfileSnapshot({
  ...validProfile,
  profileHash: validProfile.profileHash,
  formSpectra: [{ ...validProfile.formSpectra[0], samples: reversedSamples }],
})).toThrow("optical profile hash mismatch");

expect(() => OpticalProfileSnapshotSchema.parse({
  ...validProfile,
  reviewStatus: "quantitative",
  formSpectra: [{ ...validProfile.formSpectra[0], samples: [{ wavelengthNanometres: 500, epsilon: 1 }] }],
})).toThrow();

expect(() => parseFrozenOpticalPathSnapshot({
  ...validPath,
  pathLength: { value: 2, unit: "cm" },
})).toThrow("optical path hash mismatch");
```

The quantitative profile fixture contains at least two strictly increasing
wavelength samples, finite non-negative molar absorptivity values, a declared
temperature range, concentration range, fixed illuminant `D65`, observer
`CIE-1931-2deg`, transform `sRGB-IEC-61966-2-1`, source provenance, and
`reviewStatus: "quantitative"`. A qualitative profile fixture has
`reviewStatus: "qualitative-only"` and must not contain or enable an `OK`
transform.

- [ ] **Step 2: Run tests and verify RED**

```text
pnpm exec vitest run packages/schema/src/indicator-optics.test.ts
```

Expected: module/import failures.

- [ ] **Step 3: Implement schema-owned validation**

Define `OpticalSpectrumSampleSchema` with integer nanometres and finite,
non-negative epsilon values. Require at least two samples and strict wavelength
increase. Require every quantitative profile form to carry the same wavelength
grid. Require non-empty form IDs without duplicates. Require all declared range
minima to be less than or equal to maxima. Reject `reviewStatus:
"qualitative-only"` when an observation requests quantitative output. Require
the `OpticalProfileSourceRecord` fields above for every quantitative profile;
its literals describe only the cited source and are not normalized into invented
conditions. Compute profile/path hashes from canonical hash-excluded payloads
and parse only when the recomputed hash matches.

Define chemical-form parser rules here: no duplicate form ID, no negative or
non-finite fraction, non-empty list for `CHEMICAL_FORMS_OK`, and a sum within
`1e-12` of one. `CHEMICAL_FORMS_UNAVAILABLE` cannot carry a form list.

- [ ] **Step 4: Run schema checks and verify GREEN**

```text
pnpm exec vitest run packages/schema/src/indicator-optics.test.ts
pnpm typecheck
pnpm verify:schema-artifacts
```

- [ ] **Step 5: Commit the artifact boundary**

```text
git add packages/schema/src/indicator-optics.ts packages/schema/src/indicator-optics.test.ts packages/schema/src/index.ts packages/schema/src/json-schema.ts packages/schema/scripts/emit-json-schema.mjs packages/schema/json-schema
git commit -m "Add content-addressed indicator optical artifacts"
```

### Task 3: Freeze dose, profile, and path in genesis; conserve dose in World Runtime

**Files:**
- Modify: `packages/schema/src/content.ts`
- Modify: `packages/schema/src/world.ts`
- Modify: `packages/schema/src/migrate.ts`
- Modify: `packages/schema/src/scenario-migrate.ts`
- Modify: `packages/schema/src/events.ts`
- Modify: `packages/world/src/state.ts`
- Modify: `packages/world/src/reduce.ts`
- Modify: `packages/world/src/hash.ts`
- Test: `packages/schema/src/contracts.test.ts`
- Test: `packages/schema/src/migrate.test.ts`
- Test: `packages/world/src/reduce.test.ts`
- Test: `packages/world/src/replay.test.ts`

**Interfaces:**
- Consumes: Task 2 schemas.
- Produces: optional authored `IndicatorDefinition.optical`, frozen `ScenarioSnapshot.indicatorOpticalInputs`, `CanonicalContents.indicatorAmounts`, and a v4→v5 world migration that adds no invented optical data.

- [ ] **Step 1: Write failing persistence and conservation tests**

```ts
expect(created.event.payload.scenarioSnapshot.indicatorOpticalInputs[0]).toMatchObject({
  indicatorId: "phenolphthalein",
  initialVesselId: "titration-flask",
  totalAmount: { value: 5e-7, unit: "mol" },
});
expect(created.state.canonical.byVessel["titration-flask"]!.indicatorAmounts).toEqual([
  { indicatorId: "phenolphthalein", amount: 5e-7 },
]);

expect(sumIndicator("phenolphthalein", beforeTransfer)).toBe(
  sumIndicator("phenolphthalein", afterTransfer),
);

expect(migrateWorld(v4World, 5)).toMatchObject({ status: "OK" });
expect(replay(migratedV4Log).state.canonical.byVessel.flask!.indicatorAmounts).toEqual([]);
```

Add a full-transfer fixture with a 15-significant-digit dose and assert source
becomes exact zero and target receives the exact source amount. Add a partial
transfer fixture proving the same pre-transfer fraction is used for water,
components, and every indicator amount. Add a migration fixture that retains
existing `indicators[].kaIn` but produces no optical input or inventory.

- [ ] **Step 2: Run focused tests and verify RED**

```text
pnpm exec vitest run packages/schema/src/contracts.test.ts packages/schema/src/migrate.test.ts packages/world/src/reduce.test.ts packages/world/src/replay.test.ts
```

Expected: schema fields and runtime inventory do not exist; v4 migration cannot
produce the v5 shape.

- [ ] **Step 3: Implement one source of truth per state layer**

Extend authoring indicators with optional `optical` containing `initialVesselId`,
`totalAmount`, a profile reference resolved at genesis, and per-datum
provenance. Put the complete parsed `OpticalProfileSnapshot` in the frozen
`ScenarioSnapshot.indicatorOpticalInputs` so replay never resolves current
content. Put the complete parsed fixed-path snapshot in the frozen vessel
snapshot. Add `indicatorAmounts` alongside `componentAmounts`; it is an empty
array for worlds with no optical dose.

`createInitialState` allocates each declared genesis dose exactly once to its
declared vessel. `transfer` moves each amount using the current source snapshot,
uses exact source amount for a full transfer, and applies one quantized delta to
both partial-transfer sides. Include `indicatorAmounts` and frozen optical data
in state/replay identity projections.

The v4→v5 world migration adds `indicatorOpticalInputs: []`, each vessel's
fixed-path field only when an explicit resolver returns a validated path, and
empty `indicatorAmounts`. If a legacy record requires an absent path resolver,
return `NO_PATH`. It never creates a dose, profile, or spectrum.

- [ ] **Step 4: Run focused tests and verify GREEN**

```text
pnpm exec vitest run packages/schema/src/contracts.test.ts packages/schema/src/migrate.test.ts packages/world/src/reduce.test.ts packages/world/src/replay.test.ts
pnpm verify:world
pnpm verify:schema-artifacts
```

- [ ] **Step 5: Commit world truth and migration**

```text
git add packages/schema/src/content.ts packages/schema/src/world.ts packages/schema/src/migrate.ts packages/schema/src/scenario-migrate.ts packages/schema/src/events.ts packages/world/src/state.ts packages/world/src/reduce.ts packages/world/src/hash.ts packages/schema/src/contracts.test.ts packages/schema/src/migrate.test.ts packages/world/src/reduce.test.ts packages/world/src/replay.test.ts
git commit -m "Freeze and conserve indicator optical inputs"
```

### Task 4: Resolve authored profiles once and construct optical-aware scientific requests

**Files:**
- Modify: `apps/web/src/world-creation.ts`
- Modify: `apps/web/src/world-creation.test.ts`
- Modify: `packages/sci/src/request.ts`
- Modify: `packages/sci/src/request.test.ts`
- Modify: `packages/sci/src/acidbase/request.ts`
- Modify: `packages/sci/src/acidbase/request.test.ts`
- Modify: `apps/web/src/production-scenario.ts`

**Interfaces:**
- Consumes: Task 3 frozen snapshot and `CanonicalContents.indicatorAmounts`.
- Produces: `buildAcidBaseSolveRequest({ ..., indicators: [{ indicatorId, kaIn, totalAmount? }] })`; no solver request reads an authored indicator catalog.

- [ ] **Step 1: Write failing resolution/request tests**

```ts
const snapshot = resolveScenario(opticalScenario);
expect(snapshot.indicatorOpticalInputs[0]!.opticalProfile.profileHash).toMatch(/^sha256:/);
expect(snapshot.vessels.find((vessel) => vessel.vesselId === "titration-flask")!.opticalPath.pathRuleHash)
  .toMatch(/^sha256:/);

const request = buildAcidBaseSolveRequest({
  ...targetContents,
  indicators: snapshot.indicators,
  indicatorAmounts: targetContents.indicatorAmounts,
});
expect(request.indicators[0]!.totalAmount).toBe(5e-7);
```

Also assert that a profile with a stale content hash, a duplicated indicator
optical input, a dose assigned to an unknown vessel, or a profile whose
indicator ID differs from its indicator input causes `createWorld` to reject
before `WorldCreated` exists.

- [ ] **Step 2: Run focused tests and verify RED**

```text
pnpm exec vitest run apps/web/src/world-creation.test.ts packages/sci/src/request.test.ts packages/sci/src/acidbase/request.test.ts
```

Expected: the resolver does not freeze optical artifacts and solve requests
cannot carry a conserved indicator amount.

- [ ] **Step 3: Implement resolver-only authoring conversion**

In `resolveScenario`, parse the authored profile/path registry record, verify
its payload hash, canonicalize dose/path quantities, enforce one optical input
per indicator, and attach the complete resolved artifact to the snapshot. In
the request builder, map only the persisted snapshot input and committed vessel
inventory into the solve request; an indicator absent from the target vessel has
`totalAmount: undefined`, not an invented zero-dose optical form.

Update the production scenario to declare a small phenolphthalein dose and a
fixed path with `reviewStatus: "qualitative-only"` until Task 8 admits a
quantitative profile. Its production observation must therefore be data-missing
rather than a palette colour.

- [ ] **Step 4: Run focused tests and verify GREEN**

```text
pnpm exec vitest run apps/web/src/world-creation.test.ts packages/sci/src/request.test.ts packages/sci/src/acidbase/request.test.ts
pnpm typecheck:tests
```

- [ ] **Step 5: Commit resolution and request wiring**

```text
git add apps/web/src/world-creation.ts apps/web/src/world-creation.test.ts packages/sci/src/request.ts packages/sci/src/request.test.ts packages/sci/src/acidbase/request.ts packages/sci/src/acidbase/request.test.ts apps/web/src/production-scenario.ts
git commit -m "Resolve frozen indicator optical inputs at genesis"
```

### Task 5: Make chemical-form availability a Scientific Core result, including native parity

**Files:**
- Modify: `packages/schema/src/scientific.ts`
- Modify: `packages/sci/src/acidbase/indicator.ts`
- Modify: `packages/sci/src/acidbase/indicator.test.ts`
- Modify: `packages/sci/src/acidbase/adapter.ts`
- Modify: `packages/sci/src/acidbase/adapter.test.ts`
- Modify: `packages/sci/src/result.ts`
- Modify: `packages/sci/src/native-backend.ts`
- Modify: `packages/sci/src/native-backend.test.ts`
- Modify: `native/sci-core/src/lib.rs`
- Modify: `native/sci-core/tests/contract.rs`

**Interfaces:**
- Consumes: solve-request indicator dose and Task 2 `IndicatorChemicalObservationSchema`.
- Produces: `ScientificState.indicatorObservations: readonly IndicatorChemicalObservation[]` while retaining legacy `indicators[].protonationRatio` only for historical compatibility surfaces.

- [ ] **Step 1: Write failing TS/native parity tests**

```ts
const state = await adapter.solveWithScientificArtifacts(requestWithPhenolphthaleinDose, identity);
expect(state.result.status).toBe("OK");
if (state.result.status === "OK") {
  expect(state.result.state.indicatorObservations[0]).toMatchObject({
    status: "CHEMICAL_FORMS_UNAVAILABLE",
    indicatorId: "phenolphthalein",
    totalAmount: 5e-7,
  });
}

expect(nativeSerializedResult).toEqual(legacyTsSerializedResult);
```

Add a regression asserting that request pH/model pH cannot change an
`UNAVAILABLE` observation into `CHEMICAL_FORMS_OK`, and that the present v0
adapter cannot emit `strong-acid-cation` or any orange instruction.

- [ ] **Step 2: Run focused tests and verify RED**

```text
pnpm exec vitest run packages/sci/src/acidbase/indicator.test.ts packages/sci/src/acidbase/adapter.test.ts packages/sci/src/native-backend.test.ts
cargo test --manifest-path native/sci-core/Cargo.toml --test contract
```

Expected: no indicator observation field exists and native JSON cannot preserve
the new wire contract.

- [ ] **Step 3: Implement conservative v0 semantics**

The v0 acid-base adapter continues to calculate its accepted monoprotic
`protonationRatio`, but for every optically dosed indicator returns
`CHEMICAL_FORMS_UNAVAILABLE` with a reason naming the missing multi-form
chemical model. It must not relabel the existing HIn/In− ratio as lactone,
quinoid dianion, or strong-acid cation. Serialize/parse the identical tagged
result in TypeScript and Rust/WASM and add it to adapter provenance identity.

- [ ] **Step 4: Run focused tests and verify GREEN**

```text
pnpm exec vitest run packages/sci/src/acidbase/indicator.test.ts packages/sci/src/acidbase/adapter.test.ts packages/sci/src/native-backend.test.ts
pnpm verify:native-schema
pnpm verify:native-differential
cargo test --manifest-path native/sci-core/Cargo.toml
```

- [ ] **Step 5: Commit scientific refusal parity**

```text
git add packages/schema/src/scientific.ts packages/sci/src/acidbase/indicator.ts packages/sci/src/acidbase/indicator.test.ts packages/sci/src/acidbase/adapter.ts packages/sci/src/acidbase/adapter.test.ts packages/sci/src/result.ts packages/sci/src/native-backend.ts packages/sci/src/native-backend.test.ts native/sci-core/src/lib.rs native/sci-core/tests/contract.rs
git commit -m "Expose indicator chemical-form coverage"
```

### Task 6: Implement deterministic optical observation and refusal semantics

**Files:**
- Create: `packages/render/src/observable/optics.ts`
- Create: `packages/render/src/observable/optics.test.ts`
- Create: `packages/render/src/observable/optics-reference-vectors.json`
- Modify: `packages/render/src/observable/index.ts`
- Modify: `packages/render/src/index.ts`
- Modify: `tools/check_indicator_optics_contract.mjs`

**Interfaces:**
- Consumes: one `IndicatorChemicalObservation`, one parsed `OpticalProfileSnapshot`, one parsed `FrozenOpticalPathSnapshot`, committed vessel liquid volume, and source replay hash.
- Produces: `observeIndicatorOptics(input): IndicatorOpticalObservation`.

- [ ] **Step 1: Write failing optical/reference tests**

```ts
expect(observeIndicatorOptics({ ...validInput, chemical })).toMatchObject({
  status: "OPTICAL_MODEL_DATA_MISSING",
  indicatorId: "phenolphthalein",
});

const onePath = observeIndicatorOptics(withPathLength(quantitativeInput, 10));
const twoPath = observeIndicatorOptics(withPathLength(quantitativeInput, 20));
expect(twoPath.transmittanceSamples[0]!.transmittance).toBeCloseTo(
  onePath.transmittanceSamples[0]!.transmittance ** 2,
  12,
);

expect(observeIndicatorOptics(withConcentration(quantitativeInput, 0))).toMatchObject({
  status: "OPTICAL_MODEL_OK",
  tintStrength: 0,
});
```

`withPathLength` returns a cloned, rehashed fixed-path snapshot in millimetres;
`withConcentration` replaces only the test fixture's committed indicator amount
and liquid volume to produce the stated molarity. Use a clearly labelled
synthetic test-only spectrum (`form-a`: epsilon 10 at
500 nm and 20 at 510 nm) solely to validate arithmetic. It is never registered
as a production profile and its test file must assert `reviewStatus !==
"quantitative"` for production registry entries.

- [ ] **Step 2: Run focused tests and verify RED**

```text
pnpm exec vitest run packages/render/src/observable/optics.test.ts
```

Expected: module/import failures.

- [ ] **Step 3: Implement deterministic transform and coverage gate**

Implement wavelength-by-wavelength `A = pathLengthCm × Σ(epsilon ×
concentration × fraction)` and `T = 10^-A` with a pinned deterministic
negative-power routine local to the Representation Engine. Do not import the
scientific solver and do not call native `Math.pow` in the optical transform.
Use checked-in D65/CIE/sRGB reference tables that name their source and hash;
integrate to XYZ, apply the pinned sRGB conversion, and calculate
`tintStrength = clamp(1 - Ytransmitted / Yblank, 0, 1)`.

Return `DATA_MISSING` for unavailable chemistry, no profile, qualitative-only
profile, missing dose, or missing path. Return `OUT_OF_COVERAGE` for form,
temperature, concentration, path, solvent, ionic-strength/acidity, illuminant,
or observer range mismatch. Return `OK` only after all profile and form checks
pass. Extend the guard to fail if `packages/render` imports `Ka`, pH, activity,
or the legacy palette mapper in the optical path.

- [ ] **Step 4: Run focused tests and verify GREEN**

```text
pnpm exec vitest run packages/render/src/observable/optics.test.ts
pnpm verify:scientific-math
node tools/check_indicator_optics_contract.mjs
```

- [ ] **Step 5: Commit the refusal-first optical engine**

```text
git add packages/render/src/observable/optics.ts packages/render/src/observable/optics.test.ts packages/render/src/observable/optics-reference-vectors.json packages/render/src/observable/index.ts packages/render/src/index.ts tools/check_indicator_optics_contract.mjs
git commit -m "Add deterministic indicator optical observations"
```

### Task 7: Replace palette-derived scene output with tagged optical observation

**Files:**
- Delete: `packages/render/src/observable/color.ts`
- Delete: `packages/render/src/observable/tokens.ts`
- Delete: `packages/render/src/observable/color.test.ts`
- Modify: `packages/render/src/observable/observable.test.ts`
- Modify: `packages/render/src/state/scene.ts`
- Modify: `packages/render/src/state/scene.test.ts`
- Modify: `packages/render/src/index.ts`
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/src/composition.ts`
- Modify: `apps/web/src/composition.test.ts`
- Modify: `tests/m5-indicator-provenance.test.mjs`

**Interfaces:**
- Consumes: `IndicatorOpticalObservation` from Task 6 through the `ScientificFrame` composition boundary.
- Produces: `ObservableIndicator.opticalObservation`; scene nodes either carry a tint with explicit status/provenance or a no-tint refusal state.

- [ ] **Step 1: Write failing observable, scene, and DOM tests**

```ts
expect(composition.observable.indicators[0]!.opticalObservation.status)
  .toBe("OPTICAL_MODEL_DATA_MISSING");
expect(composition.renderState.nodes.find((node) => node.id === "indicator-0")?.data)
  .toMatchObject({ opticalStatus: "OPTICAL_MODEL_DATA_MISSING", tint: undefined });
```

Add Playwright assertions that the production page names the indicator, optical
status, indicator amount/concentration, path length, profile ID when present,
and a limitation message. Assert that the unavailable fixture contains no CSS
`background-color` indicator tint. Add an `OK` synthetic fixture for a
test-only profile and assert its scene node contains an RGB tint plus the
profile hash; do not expose that fixture as production content.
Run `tests/browser/network-boundary.spec.ts` in the same task and assert the
profile, colourimetry, and diagnostic path performs no network request.

- [ ] **Step 2: Run focused tests and verify RED**

```text
pnpm exec vitest run packages/render/src/observable/observable.test.ts packages/render/src/state/scene.test.ts apps/web/src/composition.test.ts
pnpm exec playwright test
```

Expected: current observable maps `protonationRatio` through RGB endpoint
tokens and the page labels the swatch as an empirical colour.

- [ ] **Step 3: Remove the false colour path**

Delete `mapIndicatorRatioToColor`, `IndicatorColour`, and
`INDICATOR_COLOUR_PALETTES` from production exports. `buildObservableModel`
calls `observeIndicatorOptics` using only the frame's committed identity,
committed vessel volume, frozen snapshot profile/path, and Scientific Core
indicator observation. `toRenderState` emits no indicator shape tint for a
refusal. `App.tsx` shows the exact status and diagnostic, and renders a tint
only for `OPTICAL_MODEL_OK`; it no longer calls `rgba(...)` on a palette token.

- [ ] **Step 4: Run focused tests and verify GREEN**

```text
pnpm exec vitest run packages/render/src/observable/observable.test.ts packages/render/src/state/scene.test.ts apps/web/src/composition.test.ts
pnpm exec playwright test
pnpm depcruise
```

- [ ] **Step 5: Commit presentation replacement**

```text
git add packages/render/src/observable packages/render/src/state/scene.ts packages/render/src/state/scene.test.ts packages/render/src/index.ts apps/web/src/App.tsx apps/web/src/composition.ts apps/web/src/composition.test.ts tests/m5-indicator-provenance.test.mjs
git rm packages/render/src/observable/color.ts packages/render/src/observable/color.test.ts packages/render/src/observable/tokens.ts
git commit -m "Present indicators through optical observation status"
```

### Task 8: Admit real numerical spectrum data only through a source-review packet

**Files:**
- Create: `docs/research/indicator-optics/README.md`
- Create: `docs/research/indicator-optics/profile-registry.json`
- Create: `docs/research/indicator-optics/colourimetry-d65-cie-srgb.source.md`
- Create: `docs/research/indicator-optics/colourimetry-d65-cie-srgb.reference.json`
- Create: `docs/research/indicator-optics/phenolphthalein-neutral-lactone.source.md`
- Create: `docs/research/indicator-optics/phenolphthalein-quinoid-base.source.md`
- Create: `docs/research/indicator-optics/phenolphthalein-strong-acid-cation.source.md`
- Create: `docs/research/indicator-optics/methyl-orange-acid.source.md`
- Create: `docs/research/indicator-optics/methyl-orange-base.source.md`
- Create only after its source packet passes review: `docs/research/indicator-optics/phenolphthalein-neutral-lactone.profile.json`, `docs/research/indicator-optics/phenolphthalein-neutral-lactone.review.md`, `docs/research/indicator-optics/phenolphthalein-quinoid-base.profile.json`, `docs/research/indicator-optics/phenolphthalein-quinoid-base.review.md`, `docs/research/indicator-optics/phenolphthalein-strong-acid-cation.profile.json`, `docs/research/indicator-optics/phenolphthalein-strong-acid-cation.review.md`, `docs/research/indicator-optics/methyl-orange-acid.profile.json`, `docs/research/indicator-optics/methyl-orange-acid.review.md`, `docs/research/indicator-optics/methyl-orange-base.profile.json`, and `docs/research/indicator-optics/methyl-orange-base.review.md`
- Create: `tools/check_indicator_optical_profiles.mjs`
- Test: `tests/indicator-optical-profiles.test.mjs`

**Interfaces:**
- Consumes: Task 2 profile schema and sources named in the approved design.
- Produces: a profile registry where every entry is either `qualitative-only` or a hash-verified quantitative artifact; no source record is promoted by a colour word or lone λmax.

- [ ] **Step 1: Write failing source-fidelity tests**

```js
expect(profile.reviewStatus).toBe("quantitative");
expect(profile.source.licenseOrPermission).toMatch(/^(open|permission-recorded)$/);
expect(profile.formSpectra.every((form) => form.samples.length >= 2)).toBe(true);
expect(profile.source.extractionMethod).toMatch(/digitized|machine-readable/);
expect(profile.source.conditions.temperature).toBeDefined();
```

Add negative fixtures for: a reference containing only `lambdaMax`, a source
without a stated concentration/path condition, a source with unknown reuse
rights, copied source digits with invented precision, and a profile whose data
hash differs from its source-review record.

- [ ] **Step 2: Run checks and verify RED**

```text
node tools/check_indicator_optical_profiles.mjs
pnpm exec vitest run tests/indicator-optical-profiles.test.mjs
```

Expected: no profile registry or source-review artifacts exist.

- [ ] **Step 3: Curate only admissible data**

Create one source packet per candidate form. It records full citation, access
date, license/permission basis, solvent/composition, temperature, acidity or
ionic-strength range, concentration range, path length, raw-data location,
extraction method, source precision, digitisation uncertainty, and reviewer
decision. A quantitative artifact contains only values traceable to that packet
and a content hash. A source that does not satisfy every required field remains
`qualitative-only`; it cannot create an `OK` production tint.

Create a separate colourimetry packet for the D65 spectral-power distribution,
CIE 1931 2° colour-matching functions, sRGB transform, wavelength grid, and
normalisation convention. The deterministic transform in Task 6 may consume
only the checked-in reference JSON whose payload hash matches that source
packet; it may not obtain colourimetry constants from a browser, operating
system, display, or network request.

For phenolphthalein, retain the strong-acid orange literature as a
`strong-acid-cation` research packet until the separate chemical-form model in
Task 9 is accepted. Do not convert its reported extreme-acid observation into
an ordinary-acid endpoint profile. For methyl orange, retain acid/base spectra
as separate form candidates; do not reuse phenolphthalein samples.

- [ ] **Step 4: Run source/evidence checks and verify GREEN**

```text
node tools/check_indicator_optical_profiles.mjs
pnpm exec vitest run tests/indicator-optical-profiles.test.mjs
pnpm verify:versions
```

- [ ] **Step 5: Commit reviewed profile data separately**

```text
git add docs/research/indicator-optics tools/check_indicator_optical_profiles.mjs tests/indicator-optical-profiles.test.mjs
git commit -m "Record reviewed indicator optical profile data"
```

### Task 9: Specify and validate a multi-form indicator Scientific Reality extension before enabling real colour

**Files:**
- Create: `docs/superpowers/specs/2026-09-14-indicator-multiform-scientific-model.md`
- Create: `docs/superpowers/plans/2026-09-14-indicator-multiform-scientific-model.md`
- Modify: `docs/specs/SPEC-0001-world-foundation-acid-base-titration.md`
- Modify: `docs/evidence/M4.md`
- Modify after owner approval: `packages/sci/src/acidbase/model.ts`, `solve.ts`, `species.ts`, and matching tests/reference fixtures
- Modify after owner approval: `native/sci-core/src/lib.rs` and `native/sci-core/tests/contract.rs`

**Interfaces:**
- Consumes: Task 8 accepted form-specific spectrum packet.
- Produces: only after a separate M4 scientific acceptance, `CHEMICAL_FORMS_OK` for one explicitly modelled indicator/form system.

- [ ] **Step 1: Write the scientific sub-spec and reference matrix before solver code**

The sub-spec must name every aqueous species/reaction, thermodynamic or
conditional constant, activity convention, water convention, temperature and
ionic-strength domain, indicator-dose approximation, numerical tolerance,
out-of-domain response, provenance record, independent analytical/reference
cases, and native/TypeScript differential cases. It must explicitly state
whether phenolphthalein's strong-acid cation is in scope. If it is not, the
sub-spec must require its output to remain unavailable.

- [ ] **Step 2: Stop for owner acceptance of the scientific sub-spec**

```text
pnpm verify:m4-contracts
pnpm verify:scientific-math
git diff --check
```

Expected: no chemical-form solver implementation proceeds until the owner
accepts the new M4 candidate criteria and source constants.

- [ ] **Step 3: Write failing scientific reference and refusal tests after acceptance**

```ts
expect(result.indicatorObservations[0]).toMatchObject({
  status: "CHEMICAL_FORMS_OK",
  indicatorId: "methyl-orange",
});
expect(sumFractions(result.indicatorObservations[0]!)).toBeCloseTo(1, 12);
expect(v0PhenolphthaleinResult.indicatorObservations[0]).toMatchObject({
  status: "CHEMICAL_FORMS_UNAVAILABLE",
});
```

The reference fixture must be independent of production TypeScript and include
an adversarial extreme-acid request that is refused when outside the accepted
model domain.

- [ ] **Step 4: Implement one accepted model, then verify independently**

Implement only the reaction network accepted by the owner, preserve balance and
charge invariants, serialize form fractions through the TypeScript/native
bridge, and compare against the independent reference matrix. Do not enable
another indicator or form from a copied endpoint palette.

- [ ] **Step 5: Commit only with M4 evidence status that matches reality**

```text
pnpm test
pnpm verify:native-differential
pnpm verify:native-ts-differential
uv run pytest
git add docs/superpowers/specs/2026-09-14-indicator-multiform-scientific-model.md docs/superpowers/plans/2026-09-14-indicator-multiform-scientific-model.md docs/specs/SPEC-0001-world-foundation-acid-base-titration.md docs/evidence/M4.md packages/sci native/sci-core
git commit -m "Add validated multiform indicator chemistry"
```

### Task 10: Enable a reviewed `OPTICAL_MODEL_OK` fixture and prove end-to-end identity

**Files:**
- Modify: `apps/web/src/production-scenario.ts`
- Modify: `apps/web/src/composition.ts`
- Modify: `apps/web/src/composition.test.ts`
- Modify: `apps/web/src/App.tsx`
- Modify: `tests/browser/m5-composition.spec.ts`
- Modify: `docs/evidence/M5.md`
- Modify: `docs/evidence/M4.md`

**Interfaces:**
- Consumes: one Task 8 quantitative profile and one Task 9 validated chemical-form result.
- Produces: a committed world → adapter → frame → optical observation → observable → scene → DOM path with no hand-authored colour.

- [ ] **Step 1: Write failing end-to-end tests**

```ts
const composition = await composeProductionTitration();
const observation = composition.observable.indicators[0]!.opticalObservation;
expect(observation.status).toBe("OPTICAL_MODEL_OK");
if (observation.status === "OPTICAL_MODEL_OK") {
  expect(observation.sourceReplayHash).toBe(composition.frame.sourceStateHash);
  expect(observation.profileHash).toBe(
    composition.state.scenarioSnapshot.indicatorOpticalInputs[0]!.opticalProfile.profileHash,
  );
}
```

Add a transfer test that changes the target liquid volume while conserving dose
and proves the observed concentration/transmittance changes. Add Playwright
assertions for status, profile ID/hash, concentration, fixed path, model
limitation copy, and an optical tint node. Add a tampered-profile test that
replay/composition rejects before it reaches DOM.

- [ ] **Step 2: Run focused tests and verify RED**

```text
pnpm exec vitest run apps/web/src/composition.test.ts
pnpm exec playwright test
```

Expected: the production scenario remains qualitative-only/data-missing until
the accepted scientific form and quantitative profile are deliberately wired.

- [ ] **Step 3: Enable exactly one accepted profile/form pair**

Update the production scenario only with the reviewed artifact and an accepted
scientific model identity. In composition, build the observation from the final
frame's state, inventory, frozen optical profile, and frozen path. Do not pass
a manually authored tint, pH threshold, or palette constant through options.

- [ ] **Step 4: Run end-to-end checks and verify GREEN**

```text
pnpm exec vitest run apps/web/src/composition.test.ts packages/render/src/observable/optics.test.ts
pnpm exec playwright test
pnpm verify:world
pnpm verify:indicator-optics
pnpm verify:indicator-profiles
```

- [ ] **Step 5: Commit end-to-end enablement**

```text
git add apps/web/src/production-scenario.ts apps/web/src/composition.ts apps/web/src/composition.test.ts apps/web/src/App.tsx tests/browser/m5-composition.spec.ts docs/evidence/M4.md docs/evidence/M5.md
git commit -m "Compose reviewed indicator optical observations"
```

### Task 11: Run full verification, generate evidence, and retain correct stage gates

**Files:**
- Modify: `docs/evidence/M4.md`
- Modify: `docs/evidence/M5.md`
- Modify: `docs/plans/PLAN-0001-world-foundation-acid-base-titration.md`

**Interfaces:**
- Consumes: all previous tasks and the committed implementation baseline.
- Produces: an evidence matrix that reports each AC-O criterion and every M4/M5 criterion honestly; it does not authorize M6 or claim an unsupported indicator profile.

- [ ] **Step 1: Run the complete repository verification set**

```text
pnpm generate:versions
pnpm verify:versions
pnpm typecheck
pnpm typecheck:tests
pnpm build
pnpm test
pnpm depcruise
pnpm guards
pnpm lint
pnpm verify:guarantees
pnpm verify:schema-artifacts
pnpm verify:scientific-math
pnpm verify:scientific-quantities
pnpm verify:world
pnpm verify:m4-contracts
pnpm verify:m5-contracts
node tools/check_indicator_optics_contract.mjs
node tools/check_indicator_optical_profiles.mjs
pnpm verify:native-governance
pnpm verify:native-schema
pnpm verify:native-differential
pnpm verify:native-ts-differential
pnpm test:browser
uv run pytest
uv run python tools/check_acceptance_coverage.py
git diff --check
```

- [ ] **Step 2: Record an honest evidence matrix**

For each AC-O1…AC-O8 record the exact command, fixture/profile hash, source
packet, model ID/version, optical artifact version from the manifest, result,
and limitation. If no Task 9 model has owner acceptance or no Task 8 source
packet reaches quantitative status, record `DATA_MISSING` evidence and keep
AC-O2/AC-O4/AC-O8 incomplete; do not relabel the old qualitative palette as
the optical model.

- [ ] **Step 3: Pin the committed baseline only after hosted CI succeeds**

Record the implementation commit and the hosted CI run separately in M4/M5
evidence. A local pass is not a hosted attestation. Preserve M5 as S2 until its
DOM, visual, and owner-review gates actually satisfy the canonical criteria.

- [ ] **Step 4: Commit and push the evidence handoff**

```text
git add docs/evidence/M4.md docs/evidence/M5.md docs/plans/PLAN-0001-world-foundation-acid-base-titration.md
git commit -m "Record indicator optical observation evidence"
git push origin main
```

## Stop/Go Conditions

- **Stop:** No source packet has complete numerical spectrum, source conditions, and reuse basis. Land only schema/refusal work; do not emit `OPTICAL_MODEL_OK`.
- **Stop:** A proposed multi-form chemistry model lacks owner-accepted species/constants/domain/reference evidence. Keep the existing v0 result `CHEMICAL_FORMS_UNAVAILABLE`; do not infer lactone, quinoid, or strong-acid forms from the monoprotic ratio.
- **Stop:** A world/scenario migration would need to invent a historical dose, path, profile, or spectrum. Return `NO_PATH` or replay with explicit optical data-missing status.
- **Stop:** Any active version appears outside `contracts/version-manifest.json`, generated version output drifts, or a transform uses a palette/pH shortcut.
- **Go to quantitative profile enablement:** one profile packet passes Task 8 and one chemical-form model passes Task 9 with independent evidence.
- **Go to M6 visual realization:** only after the canonical AC-O matrix, M5 browser/visual evidence, profile provenance, replay/migration proof, and owner review are complete. This plan itself grants no M6 authorization.
