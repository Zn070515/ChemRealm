import { SCHEMA_VERSION } from "@chemrealm/schema";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App.js";

const container = document.getElementById("root");
if (container === null) {
  throw new Error("apps/web: #root is missing from index.html");
}

// The import above is the point of M0: it proves the pnpm workspace link from
// apps/web to packages/schema resolves through the built declaration output,
// and it gives dependency-cruiser a real edge to analyse.
createRoot(container).render(
  <StrictMode>
    <App schemaVersion={SCHEMA_VERSION} />
  </StrictMode>,
);
