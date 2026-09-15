import { CURRENT_SCHEMA_VERSION } from "@chemrealm/schema";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App.js";
import "./app.css";

const container = document.getElementById("root");
if (container === null) {
  throw new Error("apps/web: #root is missing from index.html");
}

// The app still receives the schema version through the workspace boundary;
// the production composition itself is loaded by App and remains outside the
// React DOM adapter's chemistry responsibilities.
createRoot(container).render(
  <StrictMode>
    <App schemaVersion={CURRENT_SCHEMA_VERSION} />
  </StrictMode>,
);
