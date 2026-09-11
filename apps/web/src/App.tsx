import type { ReactElement } from "react";

/**
 * M0 placeholder. Renders the project name and the schema version it read from
 * `@chemrealm/schema`, which is the whole of what this milestone needs the app to
 * do: prove the two toolchains and the workspace link are real.
 *
 * `PLAN-0001` M6 and M7 own anything that looks like a product.
 *
 * The return type is imported explicitly rather than written `React.JSX.Element`
 * — the latter compiles only because `@types/react` happens to publish an
 * ambient `React` namespace, which is the sort of thing that breaks on a
 * dependency bump.
 */
export function App({ schemaVersion }: { schemaVersion: number }): ReactElement {
  return (
    <main>
      <h1>ChemRealm</h1>
      <p>
        Repository foundation only. Schema version <code>{schemaVersion}</code>.
      </p>
    </main>
  );
}
