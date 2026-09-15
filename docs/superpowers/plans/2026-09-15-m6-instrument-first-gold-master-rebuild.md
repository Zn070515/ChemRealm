# M6 Instrument-First Gold Master Rebuild — Implementation Plan

> Status: S1 candidate. This is an ordered implementation argument, not evidence that M6 is complete.  
> Spec: [M6 Instrument-First Gold Master Rebuild](../specs/2026-09-15-m6-instrument-first-gold-master-rebuild.md)  
> Prerequisite: owner accepts this spec/plan. M6 remains S2 visual NO-GO until `M6-S3` owner review succeeds.

**Goal:** Rebuild M6 Gold Masters around source-backed instrument semantics and manually authored visual masters, then prove contract truth, instrument truth, render geometry, and visual quality independently.

**Architecture:** The Representation Engine owns `InstrumentMarking`, manual master packages, asset compilation, and render evidence. The World Runtime remains owner of frozen `VolumeProfileSnapshot` replay/hash behavior. The Scientific Reality Core and ACE are regression-only consumers; neither gains apparatus-art responsibility.

**Tech stack:** TypeScript, Zod/schema generation, SVG/XML validation, deterministic Node asset tools, Vitest, Playwright, repository-local JSON/Markdown/SVG evidence.

## Global constraints

- Work directly on `main`; do not create a worktree or PR.
- Read `GOAL.md`, `AGENTS.md`, the linked spec, `docs/visual/apparatus-standard.md`, `docs/visual/m6-art-direction.md`, `docs/evidence/M6.md`, and `C:\Users\16275\Desktop\advices\ChatGPT.md` before implementation.
- Do not copy NOBOOK pixels/assets. Use its public catalogue and interaction model only as product research evidence.
- No generic generated silhouette or generic graduation ladder may remain in the Gold Master path.
- No asset, test, or source file may distribute a hard-coded release/schema version. Change the appropriate value only in `contracts/version-manifest.json`, then run `pnpm generate:versions`.
- Keep `VolumeProfileSnapshot` hash revalidation, M5 `ScientificFrame` integrity, no-network browser policy, M4 scientific tests, and schema migration guards green.
- Do not alter accepted M4 scientific constants, chemistry, or world event semantics for visual convenience.
- Path count is diagnostic only. It is forbidden as a visual-quality acceptance gate.
- A missing source condition remains missing; do not manufacture precision, pressure, calibration class, tolerance, or provenance.

## Evidence model

M6 uses four non-substitutable gates:

| Gate | Answers | Cannot prove |
| --- | --- | --- |
| Contract Audit | Does the package/schema/catalog have required identity, hash, layer, and provenance structure? | Instrument correctness or visual quality. |
| Instrument Audit | Are range, direction, calibration, marking surface, and labels correct for the cited instrument family? | Artistic quality. |
| Render Geometry Audit | Does frozen profile truth map consistently to visual geometry/LOD output? | Source validity or visual realism. |
| Art Direction Review | Does the master look like the approved laboratory instrument at required viewports? | Runtime determinism. |

No single green test is allowed to claim all four.

---

## Task 1 — Freeze the replacement contract and version boundary

**Objective:** Replace generic graduation semantics with a schema-owned, instrument-specific contract before touching SVGs.

**Files/packages:**

- `packages/schema/src/**` quantity/provenance and generated contract inputs;
- `packages/render/src/assets/apparatus-contracts.ts`;
- `packages/render/src/assets/apparatus-catalog.ts`;
- `contracts/version-manifest.json` and generated version artifacts;
- schema/catalog public-API tests.

**Interfaces:** Introduce the discriminated `InstrumentMarking` shape in the M6 spec. Remove `ApparatusGraduation` from public production contracts rather than retaining an ambiguous compatibility alias. Make scale positions derive from `valueToPhysicalPosition()` with direction/reference/calibration semantics.

**Implementation detail:**

1. Write failing compile/runtime tests that reject a generic `{ maximumMl, majorEveryMl }` record and accept only complete marking variants.
2. Implement `burette-ex`, `graduated-cylinder-in`, `approximate-contained`, and `volumetric-single-mark` variants.
3. Add source-backed, variant-specific records for first-wave assets. Do not infer a marking from `capacity`.
4. If public schema/catalog representation changes, bump the single relevant version in `contracts/version-manifest.json`, run `pnpm generate:versions`, and verify no hard-coded replacement version occurs elsewhere.

**Tests to add/run:**

```text
pnpm test -- apparatus-contracts
pnpm typecheck
pnpm generate:versions
pnpm verify:generated-versions
```

Add negative fixtures for omitted calibration, impossible direction/reference combinations, fabricated precision, and legacy generic graduation use.

**Expected evidence:** Contract Audit records a single canonical marking contract and generated-version provenance.

**Stop/go:** Stop if a marking rule cannot be sourced or honestly labelled approximate. Go only when old generic contract imports have no production references.

---

## Task 2 — Build an instrument-truth dataset and audit it independently

**Objective:** Establish cited, reviewable physical/marking facts before drawing masters.

**Files/packages:**

- `assets/apparatus/<id>/master/source-record.md`;
- `assets/apparatus/<id>/master/measurement-sheet.json`;
- `docs/research/m6-nobook-web-evidence.md`;
- a new `docs/research/m6-instrument-reference-register.md`;
- Instrument Audit tests/tooling.

**Implementation detail:**

1. Record canonical first-wave facts with direct sources: Corning Griffin 250 mL geometry/range, DWK 250 mL Erlenmeyer landmarks, DWK/Class-AS 25 mL burette calibration/interval/direction, and a separately sourced 50 mL alkali-burette family.
2. Classify every datum as `source`, `derived`, `interpolated`, or `pedagogicalApproximation`; store source literal separately from normalized numeric values.
3. Encode the beaker as `25–200 mL`, 25 mL approximate-contained marks increasing upward. Do not add a 0/250 mL false scale merely because capacity is 250 mL.
4. Encode the acid burette as top-zero/downward/Ex/tube-wrap with source-backed minor intervals. Keep acid/alkali asset identities separate even if some glass geometry is shared.
5. Write an instrument audit that validates semantic positions, label values, interval counts, calibration claims, and prohibited claims against the register.

**Tests to add/run:**

```text
pnpm verify:m6-instruments
pnpm test -- instrument-marking
```

Tests must fail for reversed beaker labels, a burette scale laid out as an external ruler, a falsified `AS`/`20 °C` claim, and unsupported flask measurement marks.

**Expected evidence:** A machine-readable/source-readable truth sheet for each master and a separate Instrument Audit report.

**Stop/go:** Stop if evidence supports only an approximate visual record; represent it as such. Go only when every rendered mark/label has an audit classification.

---

## Task 3 — Author the four manual Gold Masters and package anatomy

**Objective:** Make the first four instruments artist-authored, inspectable visual masters rather than generator output.

**Files/packages:**

- `assets/apparatus/beaker-250ml/**`;
- `assets/apparatus/erlenmeyer-250ml/**`;
- `assets/apparatus/acid-burette-25ml/**`;
- `assets/apparatus/alkali-burette-50ml/**`;
- manifests, source records, licences, state sheets, and QA review sheets;
- `docs/visual/m6-art-direction.md` and `docs/visual/apparatus-standard.md` only where their current text conflicts with the new contract.

**Implementation detail:**

1. Draw/reconstruct master SVGs from measurement sheets with named layers: glass, rim, body, scale, labels, vessel-specific fittings, ports, regions, and capability metadata.
2. Preserve physical landmarks: Griffin rim/spout/wall/base proportions; Erlenmeyer shoulder/neck/base transition; burette tube, zero region, scale-on-tube, stopcock, tip, and reading band.
3. Put marks on the physical marking surface. For a tube-wrap scale, tick/label placement must visually attach to tube curvature/edge rather than float as a ruler.
4. Include deterministic state variants only where state semantics exist; do not manufacture colourful chemistry effects.
5. Give non-master family variants explicit `planned`/`reference-only` status. A catalogue row is not a claim of a visually approved asset.

**Tests to add/run:**

```text
pnpm verify:m6-master-packages
pnpm verify:m6-instruments
```

Add XML/layer tests, manifest/source-record completeness tests, and asset-ID/variant uniqueness tests. Capture authoring screenshots for each master at review viewport(s).

**Expected evidence:** Four complete packages, measurement sheets, source records, hashes, and unedited deterministic master screenshots.

**Stop/go:** Stop if a master needs generic fallback geometry. Go only after Contract and Instrument Audits pass for all four.

---

## Task 4 — Replace the generic asset generator with a constrained compiler

**Objective:** Ensure compilation preserves approved master truth instead of generating apparatus art.

**Files/packages:**

- `tools/create_gold_master_assets.mjs` or its replacement;
- `packages/render/src/assets/gold-master-construction.json` and source adapters;
- `packages/render/src/assets/gold-master-source.ts`;
- `tools/check_m6_gold_master_contract.mjs`;
- generator and Gold Master tests.

**Implementation detail:**

1. Delete/retire generic `graduation`, `beakerGeometry`, `flaskGeometry`, and `buretteGeometry` construction paths from the Gold Master pipeline.
2. Make compilation consume named master layers and validated `InstrumentMarking` records. It may produce approved LOD simplifications but must preserve marking values/direction and documented silhouette landmarks.
3. Add a source-level prohibition test for generic silhouette/scale generation and legacy graduation fields in production paths.
4. Update contract tooling to point at this plan/spec; keep its output labelled Contract Audit only.
5. Record path count/size as diagnostics without threshold-based accept/reject assertions.

**Tests to add/run:**

```text
pnpm test -- gold-master
pnpm verify:m6-gold-master-contract
pnpm verify:m6-instruments
```

Negative fixtures: a compiler-created reversed scale, an SVG missing scale layer, and a generic geometry helper in the production asset tool must each fail.

**Expected evidence:** Reproducible output mapping each derived LOD to master hash/layers; no generic apparatus drawing code.

**Stop/go:** Stop if an LOD would alter metrological markings or profile landmarks. Go only after contract tests prove the tool is compilation-only.

---

## Task 5 — Preserve replayed geometry and render it from frozen truth

**Objective:** Integrate masters without re-opening the M2–M5 identity seams.

**Files/packages:**

- `packages/world/src/**` only if representation schema/migration is genuinely required;
- `packages/render/src/**` observable/asset adapters;
- profile/frame/catalog integration tests;
- `docs/evidence/M6.md`.

**Implementation detail:**

1. Keep `VolumeProfileSnapshot -> parse/hash validate -> executable V(h)/h(V)` as the sole executable geometry path.
2. Bind rendered asset variant/profile identity to the frozen frame/world truth. Do not accept caller-supplied function profiles or self-reported hashes.
3. Test that a historical frozen profile renders identically after mutable content changes, and that stale/tampered hashes reject before rendering.
4. If a persisted schema changes, define an explicit migration and regenerate content hashes only at the correct runtime boundary. Do not resolve missing historical geometry from current content.

**Tests to add/run:**

```text
pnpm verify:world
pnpm test -- volume-profile scientific-frame observable
pnpm verify:m6-render-geometry
```

Required adversarial cases: profile payload mutation with old hash, wrong asset/profile association, exact-vs-replay hash distinction, and full world replay with the approved profile.

**Expected evidence:** Render Geometry Audit reports state/profile/master identity and round-trip bounds separately from visual review.

**Stop/go:** Stop if M4/M5 regression changes behavior. Go only if frozen replay remains source of geometry truth.

---

## Task 6 — Prove catalogue breadth without pretending breadth is completed art

**Objective:** Carry the NOBOOK-level equipment-family lesson into contracts while keeping visual claims honest.

**Files/packages:**

- `packages/render/src/assets/apparatus-catalog.ts`;
- `assets/apparatus/**/manifest.json`;
- catalog/source tests;
- `docs/visual/apparatus-standard.md`.

**Implementation detail:**

1. Add/validate records for common laboratory capacities: beaker 100/250/1000 mL, Erlenmeyer 100/250 mL, cylinders 10/50/100 mL, volumetric flasks 50/100/250 mL, and distinct acid/alkali burettes.
2. Separate `assetStatus: master-approved | candidate | planned` from semantic apparatus identity.
3. Define future detachable parts as manifest `part`, `port`, `region`, and `capability` metadata only. Do not implement interaction here.

**Tests to add/run:**

```text
pnpm test -- apparatus-catalog
pnpm verify:m6-master-packages
```

Tests must reject a duplicate semantic identity, a planned variant marked master-approved, and acid/alkali aliases sharing one identity.

**Expected evidence:** Catalogue breadth table with visual-status truthfulness.

**Stop/go:** Stop if a catalogue entry is used to imply an absent Gold Master. Go when identity and completion status are independent.

---

## Task 7 — Update canonical documentation, ADRs, and acceptance ownership

**Objective:** Make the written contract match implementation authority without specification laundering.

**Files/packages:**

- `docs/visual/apparatus-standard.md`;
- `docs/visual/m6-art-direction.md`;
- `docs/evidence/M6.md`;
- `docs/research/m6-gold-master-self-audit.md`;
- `docs/research/m6-instrument-reference-register.md`;
- new ADR (next unused ADR number) for instrument-first asset/marking semantics;
- `SPEC-0001`/PLAN only if canonical acceptance wording or ownership truly changes.

**Implementation detail:**

1. State that old generator/source-contract success did not prove instrument truth; remove broad claims such as “no unresolved P0/P1” where only structural scope was audited.
2. Record the four audit gates and require separate evidence rows.
3. Cite NOBOOK/product research as independent interaction/catalogue evidence, never as a visual asset source to copy.
4. Make the future strong-acid phenolphthalein orange behavior a labelled optical-observation follow-up, not an unimplemented visual promise.
5. If accepted canonical criteria change, make a new SPEC candidate revision before a child plan claims it; otherwise cite canonical text verbatim.

**Tests to add/run:**

```text
pnpm verify:m6-contracts
pnpm verify:acceptance-coverage
```

Add stale-wording fixtures that fail when a contract audit calls itself a visual acceptance, or a candidate/planned asset is called approved.

**Expected evidence:** Updated acceptance matrix, ADR rationale, and source register with no competing authority.

**Stop/go:** Stop if a document weakens accepted criteria without canonical revision. Go only when code, plan, evidence, and ADR say the same thing.

---

## Task 8 — Perform two independent pre-S3 self-audits and owner visual review

**Objective:** Detect the “consistent but wrong instrument” failure mode before any stage claim.

**Files/packages:**

- `docs/research/m6-gold-master-self-audit.md`;
- `docs/evidence/M6.md`;
- deterministic screenshot directory and review sheets.

**Implementation detail:**

1. Audit A follows source -> marking contract -> master labels/positions -> compiler output -> screenshots for each first-wave asset.
2. Audit B begins from each screenshot and works backwards to source/semantic records, looking specifically for upside-down scales, external-ruler burettes, fabricated calibration claims, profile/asset identity drift, prototype labels, and version copies.
3. Record every finding with P0–P3 severity, command/artifact, disposition, and whether it blocks S3.
4. Submit deterministic viewport screenshots, measurement sheets, and all four audit packets for owner review.

**Tests to add/run:**

```text
pnpm test
pnpm verify:m6-contracts
pnpm verify:m6-instruments
pnpm verify:m6-render-geometry
pnpm playwright:test
```

**Expected evidence:** Two dated audit records and owner review material. M6 remains S2 until owner approves `M6-S3`.

**Stop/go:** Any unresolved P0/P1 or missing owner visual review is a hard NO-GO for M6 S3 and M7 authorization.

---

## Task 9 — Final verification, handoff, and direct integration

**Objective:** Produce reproducible S2/S3 evidence without overclaiming.

**Files/packages:** all touched packages and documentation; CI evidence references only after hosted run completes.

**Implementation detail:**

1. Run targeted tests after each task and the complete required suite after Task 8.
2. Inspect `git diff --check`, generated-artifact drift, version distribution, and working-tree status.
3. Commit/push only after required local verification. Record the exact implementation baseline and hosted CI run after it has completed; do not pre-fill an unknown CI result.
4. Handoff with M6 gate, evidence matrix, commands, visual artifact paths, known limitations, and outstanding findings.

**Tests to add/run:**

```text
pnpm typecheck
pnpm test
pnpm verify:scientific-math
pnpm verify:scientific-quantities
pnpm verify:world
pnpm verify:m6-contracts
pnpm verify:m6-instruments
pnpm verify:m6-render-geometry
pnpm playwright:test
pnpm lint
pnpm verify:acceptance-coverage
git diff --check
```

Run Python/PHREEQC checks only as existing repository CI requires; M6 must not weaken M4 S3 evidence.

**Expected evidence:** Reproducible local log plus hosted CI attestation, not a claim based solely on a green subset.

**Stop/go:** Stop on any unresolved P0/P1, missing visual evidence, failed migration/replay test, or unreviewed S3 decision. Otherwise hand the owner the decision package; do not self-accept M6.

## Plan self-review

| Check | Result | Rationale |
| --- | --- | --- |
| Scope and owning cores named | PASS | Representation Engine owns masters/markings; World Runtime retains frozen geometry truth. |
| Audit findings addressed | PASS | Generic graduation/silhouette, beaker direction/range, burette surface, family breadth, and false visual proof each have a task and binary gate. |
| Earlier M2–M5 protections preserved | PASS | Task 5 explicitly regresses frozen profile hashes, `ScientificFrame`, replay, and version/migration boundaries. |
| Version distributed from one source | PASS | Every version change routes through `contracts/version-manifest.json` and generated artifacts. |
| Source fidelity protected | PASS | Task 2 forbids fabricated conditions/precision and distinguishes approximation. |
| Visual acceptance cannot be faked by contract tests | PASS | Four non-substitutable audits plus owner review are required. |
| No hidden M7/M8 expansion | PASS | Interaction/persistence changes are explicit non-goals. |
| Preconditions for implementation | PASS | Owner acceptance is required; this plan stops at a documented S1 candidate. |
