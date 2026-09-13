import { describe, expect, it } from "vitest";
import { speciesRows } from "./species.js";
import { scientificState } from "../../test/fixtures.js";

describe("species observable", () => {
  it("re-presents scientific species without deriving new chemistry", () => {
    const rows = speciesRows(scientificState());
    expect(rows.map((row) => row.symbol)).toEqual(["H+", "Cl-"]);
    expect(rows[0]?.amount).toBe(0.005);
    expect(rows[0]?.molality).toBe(0.01);
    expect(rows[0]?.activity.value).toBe(0.008);
  });

  it("returns a frozen row collection", () => {
    const source = scientificState();
    const rows = speciesRows(source);
    expect(Object.isFrozen(rows)).toBe(true);
    expect(Object.isFrozen(rows[0])).toBe(true);
    expect(Object.isFrozen(rows[0]?.activity)).toBe(true);
    expect(rows[0]?.activity).not.toBe(source.species[0]?.activity);
  });
});
