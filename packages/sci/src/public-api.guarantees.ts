import type { SolveResult } from "./result.js";

export function noBareScientificShortcut(result: SolveResult): void {
  if (result.status === "OK") {
    // @ts-expect-error — scientific results expose state, never a bare pH field.
    const barePh: number = result.ph;
    void barePh;
  }
}
