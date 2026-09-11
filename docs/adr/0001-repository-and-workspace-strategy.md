# ADR-0001: Repository and workspace strategy

- **Status:** Proposed
- **Date:** 2026-09-11
- **Deciders:** Project owner
- **Related:** `GOAL.md` §19, `CLAUDE.md` §13, `AGENTS.md` §19, `SPEC-0001`
- **Blocks:** `PLAN-0001` M0

## Context

ChemRealm has two language ecosystems with a mandatory boundary between them:

- **TypeScript** for the World Runtime, Representation Engine, ACE, and (per
  owner decision on 2026-09-11) the v0 runtime scientific solver.
- **Python** for the test-time scientific oracle, and later for the PHREEQC
  adapter that the Al(III) and Fe(III)–SCN stress cases will require
  (`GOAL.md` §17).

The repository currently contains three documents and no source. There is no
version control, no package manager configuration, and no schema of any kind.

The hard problem is not "where do files go". It is: **the scientific contract
(world state, event payloads, quantity shapes) must be defined once and enforced
on both sides.** A world event serialized by TypeScript is consumed by a Python
oracle test and later by a Python service adapter. If the two sides drift, replay
silently diverges and the determinism guarantee in `ADR-0007` becomes fiction.

A second constraint: `GOAL.md` §19 prefers adapters over vendor lock-in and
narrow validated slices over broad shallow coverage, and the owner has explicitly
rejected introducing every candidate scientific dependency at once.

## Decision

**A single repository. A pnpm workspace for TypeScript. A separate `uv`-managed
Python tree that is not a workspace member.**

```
ChemRealm/
  docs/                      # ADRs, specs, plans, research, visual standards
  packages/schema/           # SINGLE SOURCE OF TRUTH for contracts (TypeScript + zod)
    src/                     # zod schemas, branded quantity types
    dist/json-schema/        # GENERATED - consumed by Python
  packages/world/            # World Runtime: state, events, reducers, replay, branch
  packages/sci/              # Scientific Reality Core: SolverAdapter + v0 solver
  packages/render/           # Representation Engine: observable model + PixiJS renderer
  packages/ace/              # Adaptive Chemistry Cognition Engine
  apps/web/                  # Composition root. The only place the four cores meet.
  content/                   # Data-driven scenario definitions (GOAL.md §11)
  tests/e2e/                 # Playwright
  tools/oracle/              # Python, uv-managed. TEST-TIME ONLY. Not deployed.
  spikes/                    # Isolated, excluded from acceptance
```

Rules that make this more than a directory listing:

1. **`packages/schema` owns every cross-boundary contract.** No other package
   defines a persisted or wire shape. zod schemas are authored here; a build step
   emits JSON Schema into `dist/json-schema/`. The Python oracle validates its
   fixtures against those emitted artifacts — it does not hand-mirror types.
2. **`apps/web` is the only composition root.** Core packages must not import each
   other except along the declared direction: `world → schema`, `sci → schema`,
   `render → schema`, `ace → schema`. Forbidden, and enforced by the build:
   - `render → sci` (`ADR-0006` — the renderer must not decide chemistry);
   - `render → world`;
   - `ace → sci` (`AGENTS.md` §2 — ACE must not obtain chemistry answers directly);
   - `ace → render`;
   - `sci → world`.

   The `ace → render` rule is the non-obvious one. ACE's "representation switch"
   intervention must not be implemented by ACE reaching into the rendering
   package. **ACE emits a plain-data `InterventionIntent`; `apps/web` maps it to
   a UI action.** Data flows out of ACE; control does not flow in. Without this
   rule the first convenient hint implementation couples the two cores.
3. **`tools/oracle` is test-time only and is never deployed.** It is not a
   service, has no HTTP surface, and is not on any production path. The owner's
   2026-09-11 decision selected a hybrid model: TypeScript solves at runtime,
   Python only produces oracle values for tests.
4. **Python is not a pnpm workspace member.** One workspace per language. A
   cross-language root workspace buys nothing and complicates CI.
5. **Directories are created when their first real content lands**, not in
   advance. `PLAN-0001` M0 creates only what M0 needs.

## Alternatives considered

**Polyrepo (separate `chemrealm-web` and `chemrealm-sci`).** Rejected. The
contract is the hard part and it changes constantly during the first slice.
Cross-repo contract changes require coordinated PRs and version pins, which is
exactly the friction that causes drift. Revisit only if the Python side becomes a
genuinely independent deployed service.

**Schema authored in Python, consumed by TypeScript.** Rejected. The runtime
producer and the primary consumer are TypeScript; authoring the contract in the
non-runtime language inverts the dependency and means every schema change is
gated on a Python toolchain run. The oracle is a *verifier*, not the source.

**JSON Schema (or Protobuf) as the hand-written source of truth, generating both
sides.** Genuinely tempting and closer to neutral. Rejected at v0 because zod
gives runtime validation and TypeScript inference from one definition, whereas
raw JSON Schema needs a codegen step for both languages before either can start.
Recorded as the natural migration if a third consumer language ever appears.

**Hand-maintained duplicate types in TypeScript and Python.** Rejected outright.
This is the drift failure mode described in Context.

**Nx or Turborepo instead of plain pnpm workspaces.** Rejected at v0. There are
no build-order problems yet that would justify the configuration surface. pnpm
workspaces plus a `tsc -b` project-references graph covers it. Revisit when build
times or task caching become an actual measured problem.

## Consequences

### Positive
- One contract definition; the Python oracle cannot silently diverge from the
  runtime because it reads generated artifacts.
- Import direction is machine-enforced, so the core boundaries in `GOAL.md` §6
  survive contact with a growing codebase.
- Two toolchains and no more. A contributor who only touches the renderer never
  needs Python.

### Negative
- A schema change requires running the TypeScript generation step before Python
  tests see it. CI must order these correctly or the oracle tests fail confusingly.
- Two package managers (`pnpm`, `uv`) must be present for a full local test run.
  Documented in M0; not optional.

### Neutral
- Directory layout will look heavier than a three-file repo needs on day one. It
  is sized for the project `GOAL.md` describes, not for the current contents.

## Reversibility

**Moderate.** Splitting into polyrepo later is mechanical *because* the schema
boundary is an explicit generated artifact rather than implicit duplicated types.
Changing the TypeScript package manager is trivial. Changing the schema
source-of-truth language would be a meaningful migration, which is why it is
recorded above as the identified alternative rather than left implicit.

## Open questions

1. Should `packages/schema` emit JSON Schema as a build artifact committed to the
   repository, or generated on demand? Committing makes the Python check
   runnable without a Node toolchain; generating keeps the repo clean but couples
   the oracle to Node. **Leaning: generate on demand, with a CI check that the
   generated artifact is in sync.** Owner confirmation wanted at M0.
