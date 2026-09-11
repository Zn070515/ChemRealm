import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/**
 * Deliberately plain.
 *
 * No `base` override, no CDN, no external asset host: every runtime resource
 * is bundled or self-hosted. `SPEC-0001` AC-P5 forbids third-party origins
 * because they leak the user's IP and referrer on every load and are
 * unreachable from mainland China. `tools/check_build_artifacts.mjs` scans the
 * emitted output and fails the build if one appears.
 *
 * There is no dev-server proxy and no `/api` route, because there is no
 * backend at all (AC-P1). That is a product property, not a temporary state.
 */
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    // Keep the output inspectable: the artifact check reads these files.
    sourcemap: false,
  },
});
