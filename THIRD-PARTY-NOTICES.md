# Third-Party Notices

ChemRealm is distributed together with external dependencies. Each dependency
retains its own copyright and license; this file does not relicense third-party
material. The repository's source code remains under
[PolyForm Noncommercial 1.0.0](LICENSE).

The versions below are the direct external dependencies locked in the current
workspace. Workspace packages (`@chemrealm/*`) are first-party and are covered
by the repository license.

## Direct JavaScript and TypeScript dependencies

| Package | Locked version | License | Upstream |
|---|---:|---|---|
| `@playwright/test` | 1.63.0 | Apache-2.0 | [playwright.dev](https://playwright.dev) |
| `@types/node` | 22.20.2 | MIT | [DefinitelyTyped](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/node) |
| `@types/react` | 19.3.0 | MIT | [DefinitelyTyped](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/react) |
| `@types/react-dom` | 19.3.0 | MIT | [DefinitelyTyped](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/react-dom) |
| `@vitejs/plugin-react` | 5.2.0 | MIT | [vite-plugin-react](https://github.com/vitejs/vite-plugin-react/tree/main/packages/plugin-react) |
| `dependency-cruiser` | 16.10.4 | MIT | [dependency-cruiser](https://github.com/sverweij/dependency-cruiser) |
| `eslint` | 9.39.5 | MIT | [eslint.org](https://eslint.org) |
| `react` | 19.3.0 | MIT | [react.dev](https://react.dev) |
| `react-dom` | 19.3.0 | MIT | [react.dev](https://react.dev) |
| `typescript` | 5.9.3 | Apache-2.0 | [typescriptlang.org](https://www.typescriptlang.org/) |
| `typescript-eslint` | 8.70.0 | MIT | [typescript-eslint.io](https://typescript-eslint.io/packages/typescript-eslint) |
| `vite` | 7.3.6 | MIT | [vite.dev](https://vite.dev) |
| `vitest` | 3.2.7 | MIT | [Vitest](https://github.com/vitest-dev/vitest) |
| `zod` | 4.6.1 | MIT | [zod.dev](https://zod.dev) |

## Direct Python development dependencies

These packages are used by test-time tooling and are not deployed by the web
application.

| Package | Locked version | License | Upstream |
|---|---:|---|---|
| `jsonschema` | 4.26.0 | MIT | [python-jsonschema](https://github.com/python-jsonschema/jsonschema) |
| `pytest` | 9.1.1 | MIT | [pytest](https://github.com/pytest-dev/pytest) |

## Transitive dependencies and maintenance

The complete transitive JavaScript graph is pinned in
[`pnpm-lock.yaml`](pnpm-lock.yaml); the Python graph is pinned in
[`uv.lock`](uv.lock). Before changing or redistributing a dependency, inspect
the installed package metadata and update this file when the direct dependency
set or the notice policy changes.

```bash
pnpm licenses list
uv sync
```

For bundled releases, preserve the license and notice files shipped by each
dependency in addition to this index. A dependency with a license or notice
that is not compatible with the intended distribution must be isolated,
replaced, or explicitly reviewed before release.
