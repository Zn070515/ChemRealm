import { describe, expect, it } from "vitest";
import { apparatusSpecification, APPARATUS_SPECIFICATION_IDS } from "../assets/apparatus-catalog.js";
import { buildBeakerGraduationMarks, buildBeakerLiquidGeometry } from "./beaker-geometry.js";

describe("beaker scene liquid geometry", () => {
  it("builds a vessel-aware body and perspective surface instead of a rectangle", () => {
    const geometry = buildBeakerLiquidGeometry(0.5);

    expect(geometry.measurementUse).toBe("forbidden");
    expect(geometry.body.length).toBeGreaterThanOrEqual(6);
    expect(geometry.surface.kind).toBe("perspective-ellipse");
    expect(geometry.surface.depth).toBeGreaterThan(0);
    expect(geometry.surface.left).toBeLessThan(geometry.surface.right);
    expect(geometry.body[0]?.[1]).toBe(geometry.surface.y);
    expect(geometry.body[1]?.[1]).toBe(geometry.surface.y);
    expect(geometry.body[0]?.[0]).toBeLessThan(geometry.body.at(-1)?.[0] ?? 0);
    expect(geometry.body[1]?.[0]).toBeGreaterThan(geometry.body.at(-2)?.[0] ?? Number.MAX_SAFE_INTEGER);
  });

  it("clamps visual fill to the authored cavity and keeps the base curve", () => {
    const empty = buildBeakerLiquidGeometry(-1);
    const full = buildBeakerLiquidGeometry(2);

    expect(empty.surface.y).toBeGreaterThan(full.surface.y);
    expect(empty.body.at(-1)?.[1]).toBe(full.body.at(-1)?.[1]);
    expect(empty.body.at(-2)?.[1]).toBe(full.body.at(-2)?.[1]);
  });

  it("projects the declared 250 mL marking range instead of hard-coded tick offsets", () => {
    const marking = apparatusSpecification(APPARATUS_SPECIFICATION_IDS.beaker).marking;
    expect(marking).toBeDefined();
    const marks = buildBeakerGraduationMarks(marking!, { start: 100, end: 220 });

    expect(marks.map((mark) => mark.valueMl)).toEqual([
      25, 50, 75, 100, 125, 150, 175, 200,
    ]);
    expect(marks[0]?.y).toBe(220);
    expect(marks.at(-1)?.y).toBe(100);
    expect(marks.every((mark) => mark.showLabel)).toBe(true);
  });
});
