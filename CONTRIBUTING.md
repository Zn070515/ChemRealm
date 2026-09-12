# Contributing to ChemRealm / 化境

Thank you for helping build a chemistry environment that is scientifically
defensible, locally useful, and reproducible. Read [`GOAL.md`](GOAL.md),
[`AGENTS.md`](AGENTS.md), and the relevant architecture decision records before
making a cross-cutting change.

## License boundaries

| Contribution or asset | Governing terms |
|---|---|
| Source code and code-adjacent implementation | [PolyForm Noncommercial 1.0.0](LICENSE) |
| Teaching content and original learning resources | [CC BY-NC-SA 4.0](CONTENT-LICENSE.md) |
| ChemRealm / 化境 name, logo, and visual brand | [Reserved](TRADEMARKS.md) |
| Third-party code and data | [Third-party notices](THIRD-PARTY-NOTICES.md) and each upstream license |

By contributing, you must accept [`CLA.md`](CLA.md). The CLA preserves the
project owner's ability to distribute contributions under the current
licenses, create a future dual-license, or offer a separate commercial
license. A contribution is not a commercial license grant to anyone.

## Before opening a change

- Identify the owning core: Scientific Reality, World Runtime, Representation,
  or ACE.
- Read the current schema, ADR, spec, and plan before changing a contract.
- Keep chemistry in the Scientific Reality Core and keep rendering/pedagogy
  from inventing scientific truth.
- Add acceptance evidence for scientific, runtime, visual, learning, or
  privacy-sensitive changes as required by [`AGENTS.md`](AGENTS.md).
- Record new consequential dependencies and their licenses in
  [`THIRD-PARTY-NOTICES.md`](THIRD-PARTY-NOTICES.md).

## Local verification

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm build
pnpm test
pnpm lint
uv sync
uv run pytest
uv run python tools/check_acceptance_coverage.py
```

Do not weaken a test, bypass a guard, or hide an unresolved scientific or
privacy problem to obtain a green result. Include the exact commands and any
known limitation in the change description.
