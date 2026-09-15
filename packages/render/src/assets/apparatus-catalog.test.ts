import { describe, expect, it } from "vitest";

import {
  APPARATUS_CATALOG,
  APPARATUS_CATALOG_VERSION,
  validateApparatusCatalog,
} from "./apparatus-catalog.js";
import { VERSION_MANIFEST } from "@chemrealm/schema";

describe("M6 apparatus catalog contract", () => {
  it("keeps multiple physical specifications inside each common vessel family", () => {
    const catalog = validateApparatusCatalog();
    const count = (familyId: string) => catalog.specifications.filter(
      (specification) => specification.familyId === familyId,
    ).length;

    expect(count("burette")).toBeGreaterThanOrEqual(3);
    expect(count("conical-flask")).toBeGreaterThanOrEqual(3);
    expect(count("beaker")).toBeGreaterThanOrEqual(4);
    expect(count("volumetric-flask")).toBeGreaterThanOrEqual(4);
    expect(count("graduated-cylinder")).toBeGreaterThanOrEqual(4);
  });

  it("declares detachable tubing, stoppers and compatible connection ports", () => {
    const catalog = validateApparatusCatalog();
    const detachable = catalog.specifications.filter(
      (specification) => specification.detachable,
    );
    const detachableIds = new Set(detachable.map((specification) => specification.specificationId));
    expect([...detachableIds]).toEqual(expect.arrayContaining([
      "glass-tube-straight-6mm",
      "glass-tube-bent-6mm",
      "glass-tube-u-6mm",
      "connector-t-6mm",
      "connector-y-6mm",
      "rubber-tube-6mm",
      "rubber-stopper-one-hole-18mm",
      "rubber-stopper-two-hole-18mm",
      "rubber-stopper-three-hole-18mm",
    ]));
    expect(catalog.connections.some((connection) =>
      connection.fromSpecificationId === "rubber-tube-6mm" &&
      connection.toPortKind === "fluid-inlet",
    )).toBe(true);
  });

  it("freezes the catalog and derives its active version from the central manifest", () => {
    expect(APPARATUS_CATALOG_VERSION).toBe(VERSION_MANIFEST.representation.apparatusCatalog);
    expect(APPARATUS_CATALOG.version).toBe(APPARATUS_CATALOG_VERSION);
    expect(Object.isFrozen(APPARATUS_CATALOG)).toBe(true);
    expect(Object.isFrozen(APPARATUS_CATALOG.specifications)).toBe(true);
    expect(Object.isFrozen(APPARATUS_CATALOG.connections)).toBe(true);
  });

  it("rejects duplicated specs and unresolved or incompatible connection declarations", () => {
    expect(() => validateApparatusCatalog({
      ...APPARATUS_CATALOG,
      specifications: [
        ...APPARATUS_CATALOG.specifications,
        APPARATUS_CATALOG.specifications[0]!,
      ],
    })).toThrow(/duplicate specification/i);

    expect(() => validateApparatusCatalog({
      ...APPARATUS_CATALOG,
      connections: [{
        fromSpecificationId: "missing",
        fromPortId: "missing",
        toPortKind: "support-contact",
        connectionType: "slip-fit",
        nominalDiameterToleranceMm: 0,
      }],
    })).toThrow(/unknown connection source/i);

    expect(() => validateApparatusCatalog({
      ...APPARATUS_CATALOG,
      connections: [{
        fromSpecificationId: "rubber-tube-6mm",
        fromPortId: "tube.end-a",
        toPortKind: "support-contact",
        connectionType: "slip-fit",
        nominalDiameterToleranceMm: 0.5,
      }],
    })).toThrow(/incompatible connection/i);
  });

  it("models beaker pouring geometry as a first-class outlet", () => {
    const beakers = APPARATUS_CATALOG.specifications.filter((specification) => specification.familyId === "beaker");
    expect(beakers.length).toBeGreaterThanOrEqual(4);
    for (const beaker of beakers) {
      expect(beaker.parts).toEqual(expect.arrayContaining([
        expect.objectContaining({ id: "vessel.spout", role: "spout", detachable: false }),
      ]));
      expect(beaker.ports).toEqual(expect.arrayContaining([
        expect.objectContaining({ id: "vessel.spout", kind: "fluid-outlet", direction: "out" }),
      ]));
    }
  });
});
