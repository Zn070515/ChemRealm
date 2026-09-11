# ChemRealm

A free, non-commercial, local-first interactive chemistry platform for Chinese
high-school chemistry, built on one defensible Scientific Reality layer rather
than on exam-keyword scripts.

> **Status: M2 — Event Runtime and Replay (S2 implementation candidate).** The
> repository builds, its architectural rules are enforced, and the deterministic
> World Runtime is implemented pending owner S3 verification. See
> `docs/specs/SPEC-0001-...md` for what the first vertical slice will be and
> `docs/plans/PLAN-0001-...md` for the milestone order.

## Read these first

| Document | What it governs |
|---|---|
| [`GOAL.md`](GOAL.md) | Project constitution. Where the project is allowed to go. |
| [`CLAUDE.md`](CLAUDE.md) | Operating rules for coding agents, including the version-control workflow (§21). |
| [`AGENTS.md`](AGENTS.md) | Cross-agent execution discipline; the S0–S4 stage gates. |
| [`docs/adr/`](docs/adr/) | Accepted architecture decisions. |
| [`docs/specs/`](docs/specs/) | `SPEC-0001`, including the accepted revision 8–9 M1 amendments. |
| [`docs/plans/`](docs/plans/) | `PLAN-0001`, approved to execute. |
| [`docs/science/quantity-ontology.md`](docs/science/quantity-ontology.md) | Authoritative definition of every scientific quantity. |

## Setup

Two toolchains. Both are required for a full local verification.

**Prerequisites:** Node ≥ 22, pnpm 11, [`uv`](https://docs.astral.sh/uv/).

### TypeScript

```bash
pnpm install --frozen-lockfile
```

### Python

The project environment is `.venv` at this root. It is **gitignored**, so a
fresh clone does not have it — create it rather than assuming it exists:

```bash
uv venv --seed --python 3.12 .venv      # only if .venv is absent
uv sync                                 # create/refresh from pyproject.toml
```

Never use a global Python interpreter for this project. See `CLAUDE.md` §21.5.

## Verify

These exact commands appear in `CLAUDE.md`, `PLAN-0001`, and CI. They are
platform-neutral deliberately: the Windows-only `py` launcher does not exist on
the GitHub Actions Ubuntu runner.

```bash
# TypeScript
pnpm typecheck          # tsc -b across project references
pnpm build              # schema, world, then web
pnpm test               # vitest
pnpm depcruise          # architectural import rules
pnpm guards             # proves those rules actually fail on a violation
pnpm verify:world       # World Runtime determinism/browser contract guard
pnpm artifacts          # no third-party origin (AC-P5), no API route (AC-P1)
pnpm lint

# Python
uv sync
uv run pytest
uv run python tools/check_acceptance_coverage.py
```

`pnpm guards` is worth knowing about: `depcruise` passing on a clean tree only
shows nothing violates the rules *today*. The guard builds a violating tree in a
scratch directory and asserts depcruise **fails** on it. A rule nobody has seen
fire is not evidence that the rule works.

## Layout

```
apps/web/            Composition root. The only place the four cores meet.
packages/schema/     SINGLE SOURCE OF TRUTH for cross-boundary contracts.
packages/world/      World Runtime: typed state, events, replay, snapshots, branches.
tools/               Python: the acceptance-coverage checker, the node guards.
tools/oracle/        Test-time scientific oracle (M4). Never deployed.
docs/                ADRs, specs, plans, research, the visual standard.
content/             Data-driven scenario definitions (M7).
spikes/              Isolated experiments. Excluded from acceptance.
```

`packages/sci`, `packages/world`, `packages/render`, and `packages/ace` arrive
with the milestones that give them content — not before (`ADR-0001` rule 5).
The import rules that govern them are already in `.dependency-cruiser.cjs`.

## Privacy

No accounts, no telemetry, no server. In v0 the browser is the only place data
is written, and the only network traffic is fetching the application itself.
`pnpm artifacts` fails the build if a third-party origin or an API route reaches
the shipped output.
