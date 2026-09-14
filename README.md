<div align="center">

<h1>化境 · ChemRealm</h1>

<p><strong>交互式化学世界平台</strong> · <strong>An interactive platform for chemistry</strong></p>

<p>
  <a href="https://github.com/Zn070515/ChemRealm/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/Zn070515/ChemRealm/ci.yml?branch=main&label=CI" alt="CI status"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/code-PolyForm%20Noncommercial%201.0.0-6f42c1.svg" alt="Code: PolyForm Noncommercial 1.0.0"></a>
  <a href="CONTENT-LICENSE.md"><img src="https://img.shields.io/badge/content-CC%20BY--NC--SA%204.0-0b7285.svg" alt="Content: CC BY-NC-SA 4.0"></a>
  <a href="COMMERCIAL-LICENSING.md"><img src="https://img.shields.io/badge/distribution-source--available-1971c2.svg" alt="Source available"></a>
</p>

<p>
  <img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white" alt="TypeScript 5.9">
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=20232A" alt="React 19">
  <img src="https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white" alt="Vite 7">
  <img src="https://img.shields.io/badge/Python-3.12+-3776AB?logo=python&logoColor=white" alt="Python 3.12 or newer">
  <img src="https://img.shields.io/badge/Cargo-1.97-9D4C00?logo=cargo&logoColor=white" alt="Cargo 1.97">
</p>

<p>
  <a href="#setup">快速开始 · Get started</a> ·
  <a href="#read-these-first">架构文档 · Architecture</a> ·
  <a href="#licensing">许可 · Licensing</a> ·
  <a href="CONTRIBUTING.md">参与贡献 · Contributing</a>
</p>

</div>

ChemRealm / 化境 is building toward a full, browser-based interactive chemistry
platform: a place where virtual apparatus, experiments, scientific models,
teaching workflows, and learner exploration share one verifiable reality layer.

Its first focused product subsystem supports Chinese senior-high and Gaokao
chemistry teaching and learning. Students and teachers should be able to
explore, predict, manipulate, observe, explain, and verify — with the current
platform foundation growing toward that broader platform rather than stopping
at a single exercise or simulation.

ChemRealm is source-available and free for noncommercial educational, research,
and personal use. It is local-first by design and built on defensible scientific
models rather than exam-keyword scripts.

This project intentionally does not describe itself as “Open Source”: the code
license includes a noncommercial restriction. Commercial use not covered by the
applicable public license requires a separate written license; see
[Commercial Licensing](COMMERCIAL-LICENSING.md).

> **Project status:** Milestone stage, acceptance baseline, CI evidence, and
> authorization are maintained in the [milestone plan](docs/plans/PLAN-0001-world-foundation-acid-base-titration.md)
> and the relevant [evidence packets](docs/evidence/). This README intentionally
> does not duplicate exact stage, commit, or CI-run facts.

## Read these first

| Document | What it governs |
|---|---|
| [`GOAL.md`](GOAL.md) | Project constitution. Where the project is allowed to go. |
| [`CLAUDE.md`](CLAUDE.md) | Operating rules for coding agents, including the direct integration workflow. |
| [`AGENTS.md`](AGENTS.md) | Cross-agent execution discipline and the S0–S4 stage gates. |
| [`docs/adr/`](docs/adr/) | Accepted architecture decisions. |
| [`docs/specs/`](docs/specs/) | `SPEC-0001`, including the accepted M1 amendments. |
| [`docs/plans/`](docs/plans/) | `PLAN-0001`, approved milestone order and evidence. |
| [`docs/science/quantity-ontology.md`](docs/science/quantity-ontology.md) | Authoritative definition of every scientific quantity. |

## Product direction

| Layer | Role |
|---|---|
| Interactive chemistry platform | Experiments, apparatus, observable phenomena, scientific exploration, and reusable learning spaces. |
| High-school / Gaokao subsystem | Guided teaching and learning support for the Chinese senior-high chemistry curriculum and exam preparation. |
| Scientific Reality Core | Units, models, solver adapters, validity domains, provenance, and reproducible reference evidence. |
| World Runtime and learning systems | Persistent experiment state, replayable actions, teacher/learner workflows, and local-first evidence. |

The first subsystem is deliberately focused; the platform foundation is not.

## What ChemRealm protects

- Scientific calculations stay in the Scientific Reality Core and carry units,
  provenance, validity domains, and reproducible evidence.
- World Runtime owns meaningful events, deterministic replay, snapshots, and
  branches; it does not invent chemistry or pedagogy.
- Rendering derives visuals from approved observable state instead of deciding
  equilibrium or hiding solver failures.
- Learning support is local-first and evidence-aware; it does not turn one
  correct answer into a permanent learner label.

## Setup

Three toolchains with explicit boundaries. Full native verification uses
TypeScript/pnpm, Python/uv, and Rust/Cargo; renderer-only changes need not invoke
all three.

**Prerequisites:** Node ≥ 22, pnpm 11, [`uv`](https://docs.astral.sh/uv/), and
the pinned Rust toolchain from [`rust-toolchain.toml`](rust-toolchain.toml).

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

These commands are the reproducible verification surface used by CI. They are
platform-neutral deliberately: the Windows-only `py` launcher does not exist
on the GitHub Actions Ubuntu runner.

```bash
# TypeScript
pnpm typecheck          # tsc -b across project references
pnpm build              # schema, world, then web
pnpm test               # vitest
pnpm depcruise          # architectural import rules
pnpm guards             # proves those rules actually fail on a violation
pnpm verify:world       # World Runtime determinism/browser contract guard
pnpm verify:versions    # central version manifest and generated metadata drift
pnpm verify:native-schema
pnpm verify:native-ts-differential
pnpm native:test         # Rust host contract tests
pnpm native:check-wasm   # Rust/WASM compilation boundary
pnpm artifacts          # no third-party origin (AC-P5), no API route (AC-P1)
pnpm lint

# Python
uv sync
uv run pytest
uv run python tools/check_acceptance_coverage.py
```

The native differential command compares the accepted TypeScript adapter with
the release WASM adapter across the complete REF, ORACLE, and adversarial
request matrix. It is evidence for compatibility, not a claim that the two
backend identities are the same or that the native supersession gate has
passed.

`pnpm guards` is worth knowing about: `depcruise` passing on a clean tree only
shows nothing violates the rules *today*. The guard builds a violating tree in
a scratch directory and asserts depcruise **fails** on it. A rule nobody has
seen fire is not evidence that the rule works.

## Layout

```
apps/web/            Composition root. The only place the four cores meet.
packages/schema/     SINGLE SOURCE OF TRUTH for cross-boundary contracts.
packages/sci/        Scientific Reality Core: units, adapters, and solver boundary.
packages/world/      World Runtime: typed state, events, replay, snapshots, branches.
tools/               Python: acceptance-coverage checker and node guards.
tools/oracle/        Test-time scientific oracle (M4). Never deployed.
docs/                ADRs, specs, plans, research, and the visual standard.
content/             Data-driven scenario definitions (M7).
spikes/              Isolated experiments. Excluded from acceptance.
```

`packages/render` and `packages/ace` arrive with the milestones that give them
content — not before (`ADR-0001` rule 5). The import rules that govern the four
cores are already in `.dependency-cruiser.cjs`.

## Licensing

| Scope | Terms |
|---|---|
| Source code | [PolyForm Noncommercial 1.0.0](LICENSE) |
| Teaching content and original learning resources | [CC BY-NC-SA 4.0](CONTENT-LICENSE.md) |
| Commercial use | [Separate written license required](COMMERCIAL-LICENSING.md) |
| ChemRealm / 化境 name, logo, and visual identity | [Reserved](TRADEMARKS.md) |
| Contributions | [CLA required](CLA.md) · [contribution guide](CONTRIBUTING.md) |
| Third-party dependencies | [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md) and each upstream license |

The code and content grants are separate. A license for one scope does not
grant rights to the other scopes, and neither grants trademark rights.

## Privacy

No accounts, no telemetry, no server. In v0 the browser is the only place data
is written, and the only network traffic is fetching the application itself.
`pnpm artifacts` fails the build if a third-party origin or an API route reaches
the shipped output.
