# Indicator multiform scientific model — candidate specification

> **Status:** Candidate scientific sub-specification — implementation is not
> authorized until owner acceptance.
>
> **Authority:** This document is subordinate to `GOAL.md`, `AGENTS.md`, and
> `SPEC-0001`. It is referenced by `SPEC-0001` revision 28 Candidate and does
> not alter the accepted M4 monoprotic model until the owner accepts the
> candidate and its evidence.

## Context

The current v0 Scientific Reality Core exposes a labelled monoprotic indicator
approximation. That is sufficient for the existing teaching transition but not
for an honest phenolphthalein optical model. Phenolphthalein has multiple
aqueous protonation/structural forms, while a strongly acidic medium can
introduce a separate cationic form associated with orange/yellow observations.
Those cases cannot be reconstructed from one protonation ratio or a renderer
colour token.

Task 8 has established source packets for the neutral lactone, quinoid base,
and strong-acid cation candidates. No quantitative optical profile is admitted
yet. This specification therefore defines the scientific boundary and the
evidence required before any form can produce `CHEMICAL_FORMS_OK` or enable an
optical `OPTICAL_MODEL_OK` result.

## Goal

1. Define a source-backed, multi-form aqueous indicator model whose species,
   balances, activities, validity, and provenance are explicit.
2. Keep the ordinary aqueous phenolphthalein forms separate from the
   strong-acid cation research case; the latter must remain unavailable until
   a separately accepted model and optical profile exist.
3. Make the result suitable for TypeScript and Rust/WASM differential testing
   without changing the accepted M4 solver by implication.
4. Require independent reference and refusal evidence before a production
   adapter may emit form fractions.

## Non-goals

- This candidate does not implement a solver, change the accepted v0 acid-base
  equations, or change the active production indicator result.
- It does not infer spectra, RGB values, or optical coverage from a colour word,
  a single `lambdaMax`, a pH threshold, or an existing palette.
- It does not claim a quantitative profile for any Task 8 candidate; all
  current candidates remain `qualitative-only`.
- It does not model precipitation, aggregation, fluorescence, scattering,
  kinetics, transport, or a camera/display calibration.
- It does not make phenolphthalein's strong-acid cation part of the initial
  ordinary aqueous production model.
- It does not silently reuse the monoprotic `Ka_in` as either `Ka1` or `Ka2`.

## User experience

Before this candidate is accepted, the user sees an explicit unavailable
indicator observation when the active Scientific Core cannot provide the
required forms. In particular, an acidic result must not become orange merely
because a generic pH value is low.

After acceptance, a covered ordinary aqueous result may identify the forms and
their fractions in inspection data. An uncovered strong-acid case must say
that the required cationic form is outside the active model, rather than
showing an answer-shaped colour. Any future optical colour remains labelled as
an empirical Beer–Lambert observation under named conditions.

## Architecture

| Core | Owns | Must not do |
|---|---|---|
| Scientific Reality Core | species, reactions, constants, activities, fractions, validity, scientific provenance | choose RGB, illumination, or teaching copy |
| World Runtime | conserved indicator amount, water mass, temperature and replay identity | infer form fractions or colours |
| Representation Engine | consume accepted fractions and a reviewed optical profile | invent a missing form or constant |
| ACE | explain model coverage and uncertainty | alter chemistry or mark a refused form as present |

The production data flow is:

```text
committed WorldState indicator amount + water mass + temperature
        ↓
candidate multi-form Scientific Core request
        ↓
species/activity solve with explicit model identity
        ↓
IndicatorChemicalObservation (OK or refusal)
        ↓
Representation Engine only if optical data are separately covered
```

The current accepted M4 acid-base adapter remains the legacy/reference path
until a new model identity and differential evidence are accepted. No caller
may select the candidate merely by changing a display option.

## Scientific design

### Initial model scope

The initial candidate is an ordinary aqueous diprotic phenolphthalein model:

| Form ID | Symbol | Charge | Initial scope |
|---|---|---:|---|
| `neutral-lactone` | H₂In | 0 | in scope |
| `intermediate-monoanion` | HIn⁻ | −1 | in scope; colour must not be inferred from name |
| `quinoid-base` | In²⁻ | −2 | in scope; optical colour requires a reviewed profile |
| `strong-acid-cation` | H₃In⁺ (candidate notation) | +1 | **out of scope; refusal required** |
| `strong-base-altered` | model-specific | model-specific | out of scope; refusal required |

The cation notation is deliberately a candidate species label, not an
accepted assertion that a particular protonation stoichiometry or structure is
universal across strong-acid media. A future strong-acid model must establish
its species identity, charge, medium, and constants from an appropriate
primary source before it can replace the refusal.

### Reactions and constants

The ordinary aqueous network must contain, at minimum:

```text
H₂In       ⇌ H⁺ + HIn⁻       Ka_In_1
HIn⁻       ⇌ H⁺ + In²⁻        Ka_In_2
H₂O        ⇌ H⁺ + OH⁻         Kw
```

The `Kw` convention remains the accepted M4 convention:

```text
Kw = a(H⁺) · a(OH⁻)
```

It must not acquire a hidden water-activity multiplier. `Ka_In_1` and
`Ka_In_2` are distinct thermodynamic or explicitly conditional constants; they
must not be copied from the existing monoprotic `Ka_in`.

For each charged species, the implementation must state the activity
coefficient model and source. For the neutral lactone, `γ_H2In` must be an
explicit model parameter or declared approximation with a source/uncertainty;
it may not be silently borrowed from the acetic-acid neutral coefficient.

Every active constant record must include:

- canonical value and unit;
- thermodynamic versus conditional status;
- source citation, source condition, and source precision/uncertainty;
- temperature and medium/basis;
- derivation, if converted from a logarithmic or tabulated source;
- content identity used by the solver configuration.

No numerical value is admitted by this candidate merely because it appears in
an indicator table or a teaching reference.

### Equilibrium, balances, and activities

The solver must solve all active forms self-consistently with the bulk
solution. At minimum it must enforce:

```text
m_In,total = m_H2In + m_HIn + m_In2 + m_H3In (when that form is in scope)

charge balance includes every charged active form

I_m = 1/2 · Σ(z_j² · m_j)

a_j = γ_j · (m_j / m°)
```

The first candidate model excludes `H3In+` and therefore must not place it in
the balance with a zero or guessed fraction. The model either solves the
ordinary three-form network or returns a refusal for a requested regime it
does not cover.

Fractions are derived from solved species amounts:

```text
f_form = m_form / m_In,total
Σ f_form = 1 within the declared tolerance
```

Fractions are not renderer inputs derived from pH. Indicator charge is included
in the coupled charge/ionic-strength solve; a trace-dose decoupling shortcut
is not permitted unless a later accepted revision supplies a quantitative
error bound and a separate coupled reference check.

### Validity and numerical policy

The initial candidate domain is deliberately narrow:

- solvent: the source-declared aqueous medium only;
- temperature: canonical `298.15 K` unless a source-backed temperature law is
  later accepted;
- ionic strength: no wider than the accepted Davies `I_m ≤ 0.5 mol/kg` domain;
- indicator total: a source/model-declared finite range, not an invented
  default;
- chemical forms: ordinary aqueous three-form network only.

Strong-acid cation and strong-base-altered requests return an explicit
`CHEMICAL_FORMS_UNAVAILABLE` result with a reason code such as
`FORM_OUT_OF_DOMAIN` or `FORM_DATA_MISSING`. They must not return a partial
three-form result that silently omits a chemically required form.

The implementation must use the existing deterministic math policy and must
record numerical diagnostics for invalid input, out-of-domain, and
non-convergence separately. Required numerical invariants are:

- every fraction finite and non-negative;
- fraction-sum absolute error ≤ `1e-12`;
- component/indicator balance within the accepted solver tolerance;
- charge residual and ionic-strength fixed point satisfy the model's declared
  unquantized tolerances;
- no result is marked `OK` if any active form or constant is missing.

### Optical boundary

Scientific form coverage and optical coverage remain separate. A chemical
result can be valid while its optical observation is `DATA_MISSING` because no
reviewed form spectrum is admitted. Conversely, a spectrum cannot authorize a
chemical form that the Scientific Core did not solve.

The strong-acid cation research packet from Task 8 remains qualitative-only.
The observed orange/yellow possibility is recorded as a reason to model and
validate that form, not as permission to render orange now.

## World/event design

No new world event is introduced by this candidate. The existing conserved
indicator amount remains the authoritative inventory and is converted to the
scientific basis using the committed water mass. The candidate request must
carry the persisted model identity and the exact indicator input provenance.

If a future accepted model changes the required indicator representation or
solver configuration, it requires a new central-manifest version and an
explicit world migration/re-solve policy. A migration may not invent historic
indicator amount, form fractions, constants, or optical data.

Replay of an old world continues to use its persisted accepted solver identity.
Selecting the multi-form candidate creates a new model identity for new worlds;
there is no silent fallback between the old and new models.

## Representation design

The Scientific Core emits `IndicatorChemicalObservation` with form IDs,
fractions, model identity, and source replay identity. The Representation
Engine may combine it with an admitted profile only after checking every form,
concentration, path, temperature, solvent, illuminant, and observer condition.

No RGB literal, palette endpoint, pH threshold, or `lambdaMax` is part of this
scientific model. A refusal remains visible and has no tint.

## Learning design

ACE may explain the distinction between “the active model does not cover this
chemical form” and “the optical profile is unavailable”. It may expose the
ordinary aqueous forms as inspection evidence after acceptance. It must not
teach the learner that a strong acid automatically produces an orange
phenolphthalein observation, and it must not turn a refusal into a scored
chemistry answer.

## Privacy/compliance

This candidate changes no data-flow boundary. Scientific constants, reference
fixtures, and profiles are checked-in local artifacts; no account, telemetry,
remote source fetch, or learner identity is required. Browser execution must
remain local-first and must not retrieve spectra at runtime.

## API/schema changes

The candidate result is a strict discriminated union. The exact wire version is
selected from `contracts/version-manifest.json` when implementation is
authorized; no version literal may be distributed by hand.

```ts
type MultiformIndicatorObservation =
  | {
      readonly status: "CHEMICAL_FORMS_OK";
      readonly indicatorId: "phenolphthalein";
      readonly totalAmount: Mol;
      readonly forms: readonly [
        { readonly formId: "neutral-lactone"; readonly fraction: number },
        { readonly formId: "intermediate-monoanion"; readonly fraction: number },
        { readonly formId: "quinoid-base"; readonly fraction: number },
      ];
      readonly modelId: string;
      readonly modelVersion: string;
      readonly sourceReplayHash: string;
    }
  | {
      readonly status: "CHEMICAL_FORMS_UNAVAILABLE";
      readonly indicatorId: "phenolphthalein";
      readonly reasonCode:
        | "FORM_OUT_OF_DOMAIN"
        | "FORM_DATA_MISSING"
        | "NUMERICAL_FAILURE";
      readonly reason: string;
      readonly modelId: string;
      readonly modelVersion: string;
      readonly sourceReplayHash: string;
    };
```

The tuple above is the initial ordinary-aqueous form set, not a licence to
omit a non-zero form. If a future model adds the strong-acid cation, its form
set and identity must be versioned together; it must not be appended to this
union without a new accepted amendment.

## Failure modes

| Failure | Required result |
|---|---|
| missing `Ka_In_1`, `Ka_In_2`, or `γ_H2In` provenance | `FORM_DATA_MISSING`, no fractions |
| strong-acid cation required but not modelled | `FORM_OUT_OF_DOMAIN`, no orange output |
| unsupported solvent/temperature/ionic strength | `FORM_OUT_OF_DOMAIN`, no partial result |
| non-finite dose or request | `INVALID_INPUT`, no solve |
| fraction negative or sum outside tolerance | `NUMERICAL_FAILURE`, diagnostic retained |
| charge/balance/root failure | `NUMERICAL_FAILURE`, residual only when meaningful |
| chemical result valid but no optical profile | downstream `OPTICAL_MODEL_DATA_MISSING` |
| mismatched model/config/source identity | adapter contract error before presentation |

No failure may be converted into a plausible endpoint colour.

## Test plan

Tests must be independent by layer and must not use the renderer to validate
chemistry:

1. **Schema:** strict form IDs, duplicate/missing-form rejection, finite
   fractions, sum tolerance, refusal reason codes, and provenance identity.
2. **Scientific reference:** independently authored ordinary-acid,
   transition, and alkaline-limit cases; indicator balance, charge balance,
   ionic-strength, and fraction-sum invariants.
3. **Adversarial:** strong-acid request that would need `strong-acid-cation`
   is refused; missing constants/source data are refused; a partial form set
   cannot be labelled `OK`; no old monoprotic `Ka_in` is reused.
4. **Differential:** TypeScript and Rust/WASM serialize identical accepted or
   refused outcomes, identities, diagnostics, and fractions within the
   declared deterministic policy.
5. **Replay/world:** the request is built from committed world inputs; changing
   model identity or one input bit refuses or creates a new explicitly labelled
   model result; replay never consults mutable content.
6. **Optical boundary:** the ordinary forms may still produce
   `OPTICAL_MODEL_DATA_MISSING` while no quantitative profile is admitted; the
   strong-acid refusal cannot produce a tint.

## Acceptance criteria

This candidate is accepted only when every row is binary and independently
evidenced:

| Criterion | Required evidence |
|---|---|
| Species/reaction set is explicit | schema/model contract and source packet review |
| Constants are source-backed and versioned | machine-readable provenance and central-version check |
| Ordinary three-form balance is conserved | independent reference matrix and invariant tests |
| Activities and ionic strength are self-consistent | unquantized residual/fixed-point evidence |
| Fractions are complete and normalized | strict schema plus adversarial partial-set tests |
| Strong-acid cation is not silently omitted | explicit refusal fixture and result inspection |
| Domain and numerical failures are distinct | tagged failure matrix with diagnostics |
| TypeScript/WASM agree | native differential report on the same matrix |
| Replay identity is preserved | world/request/replay test with mutable content removed |
| Optical enablement remains separate | no `OPTICAL_MODEL_OK` without Task 8 quantitative profile review |

## Rollout/migration

No existing world is migrated by this candidate. The owner must first accept
this sub-spec and its constants/reference plan. Implementation then introduces
a new model/config identity from the central version manifest and uses an
explicit new-world or re-solve policy. Existing worlds retain their accepted
monoprotic solver identity.

If persisted scientific observation schema changes, it must use a new schema
version and a loud migration path. A migration may add an explicit refusal, but
may not invent form fractions or optical data.

## Open questions

There are no implementation questions hidden here. The owner acceptance gate
must decide whether this exact ordinary-aqueous three-form scope, the explicit
strong-acid refusal, and the full coupled indicator charge treatment are the
candidate to implement. Until that decision, all implementation steps after
the specification/reference packet remain stopped.
