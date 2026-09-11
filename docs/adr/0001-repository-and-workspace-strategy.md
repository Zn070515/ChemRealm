# ADR-0001: Repository and workspace strategy

- **Status:** **Accepted baseline; amendment proposed** — M1 R2, owner review
  pending
- **Deferred decisions:** the M1 R2 artifact-location amendment below is pending
  owner review. Any later format decision gets a new ADR or an explicit
  amendment rather than an unresolved question in an accepted record.
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
  pyproject.toml             # THE Python project (root). Environment: .venv
  uv.lock
  .venv/                     # project environment (gitignored)
  packages/schema/           # SINGLE SOURCE OF TRUTH for contracts (TypeScript + zod)
    src/                     # zod schemas, branded quantity types
    json-schema/             # GENERATED + COMMITTED - consumed by Python
  packages/world/            # World Runtime: state, events, reducers, replay, branch
  packages/sci/              # Scientific Reality Core: SolverAdapter + v0 solver
  packages/render/           # Representation Engine: observable model + PixiJS renderer
  packages/ace/              # Adaptive Chemistry Cognition Engine
  apps/web/                  # Composition root. The only place the four cores meet.
  content/                   # Data-driven scenario definitions (GOAL.md §11)
  tests/e2e/                 # Playwright
  tools/                     # Python source: the acceptance-coverage checker
  tools/oracle/              # Oracle SOURCE and tests. TEST-TIME ONLY. Not deployed.
  spikes/                    # Isolated, excluded from acceptance
```

**One Python project, at the root** (added 2026-09-11, round 6). An earlier
sketch put `pyproject.toml` inside `tools/oracle/` while the environment lived
at the root `.venv`, leaving `uv sync`/`uv run` with two candidate resolution
targets. There is now exactly one. Python remains outside the pnpm workspace.

Rules that make this more than a directory listing:

1. **`packages/schema` owns every cross-boundary contract.** No other package
   defines a persisted or wire shape. zod schemas are authored here; a build step
   emits JSON Schema into the committed `packages/schema/json-schema/` directory.
   The Python oracle validates its fixtures against those emitted artifacts — it
   does not hand-mirror types. `pnpm verify:schema-artifacts` is the drift gate.
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
4a. **One Python project, one environment, one command set.** `pyproject.toml`
   and `.venv` both live at the repository root; `tools/` holds source. The
   canonical commands are

   ```
   uv sync                                            # create/refresh .venv
   uv run pytest                                      # oracle tests
   uv run python tools/check_acceptance_coverage.py   # acceptance coverage
   ```

   **These exact strings appear in `README.md`, `PLAN-0001`, CI, and
   `CLAUDE.md`.** They are deliberately platform-neutral: the Windows-only `py`
   launcher does not exist on the GitHub Actions Ubuntu runner, so a command
   containing `py` would fail CI on its first run. Round 6 found the repository
   simultaneously instructing "never use bare `python`" and "run `py tools/…`".
5. **Directories are created when their first real content lands**, not in
   advance. `PLAN-0001` M0 creates only what M0 needs.
6. **A contract that crosses a language boundary is VERSIONED.** (Added
   2026-09-11, M1 contract remediation item 6.) `schemaVersion` is not
   decoration on types that only TypeScript reads; it is required for the ones
   the Python side validates. Every root contract emitted by `json-schema.ts` —
   `world-state`, `domain-event`, `command`, `scenario`, `scientific-state`,
   `solve-result`, `export-bundle` — carries an explicit version, as does every
   event inside an `event-log`. Nested objects inherit their root's version
   rather than repeating it, which is why `species[].schemaVersion` does not
   exist and `scientific-state.schemaVersion` does.

   The reason is cost, not tidiness. `command`, `scientific-state` and
   `solve-result` were unversioned while already being emitted and consumed.
   Adding a version to a format nobody has stored yet costs one line; adding it
   after a worker, a WASM module, the oracle, and a save-file tool have all
   begun exchanging that format costs a migration.

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

## Proposed amendment — M1 R2 (owner review pending)

1. **Candidate decision: JSON Schema artifacts are committed at
   `packages/schema/json-schema/`.** The build/emitter regenerates them, and
   `pnpm verify:schema-artifacts` fails on stale, missing, or orphaned files.
   This keeps the Python oracle runnable without a Node toolchain while retaining
   a deterministic drift check. The old `dist/json-schema/` path and the
   "generate on demand" leaning would be superseded if this amendment is
   accepted.

The implementation, generated artifacts, and evidence packet use this candidate
path so the proposal is testable. They do not turn it into an accepted decision;
M1 S3 owner review is still required.
