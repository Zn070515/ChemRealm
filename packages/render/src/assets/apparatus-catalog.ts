import { VERSION_MANIFEST } from "@chemrealm/schema";
import type {
  ApparatusCatalog,
  ApparatusConnection,
  ApparatusFamilyId,
  ApparatusPart,
  ApparatusPort,
  ApparatusPortDirection,
  ApparatusPortKind,
  ApparatusProvenance,
  ApparatusSourceClass,
  ApparatusSpecification,
  ApparatusStateVariant,
} from "./apparatus-contracts.js";
import { assertInstrumentMarking } from "./instrument-marking.js";
import type { InstrumentMarking } from "./instrument-marking.js";
import {
  assertGoldMasterCatalogSource,
  replaceGoldMasterSpecifications,
} from "./gold-master-source.js";

export type {
  ApparatusCatalog,
  ApparatusConnection,
  ApparatusFamilyId,
  ApparatusMaterial,
  ApparatusPart,
  ApparatusPort,
  ApparatusPortDirection,
  ApparatusPortKind,
  ApparatusProvenance,
  ApparatusSourceClass,
  ApparatusSpecKind,
  ApparatusSpecification,
  ApparatusStateVariant,
} from "./apparatus-contracts.js";
export type { InstrumentMarking } from "./instrument-marking.js";

export const APPARATUS_CATALOG_VERSION = VERSION_MANIFEST.representation.apparatusCatalog;

const source = (
  sourceId: string,
  sourceRef: string,
  sourceClass: ApparatusSourceClass,
  claim: string,
  reportedPrecision: ApparatusProvenance["reportedPrecision"],
): ApparatusProvenance => ({ sourceId, sourceRef, sourceClass, claim, reportedPrecision });

const dimensions = (width: number, height: number, depth: number): readonly [number, number, number] => [
  width,
  height,
  depth,
];

const bounds = (x: number, y: number, width: number, height: number): readonly [number, number, number, number] => [
  x,
  y,
  width,
  height,
];

const port = (
  id: string,
  kind: ApparatusPortKind,
  direction: ApparatusPortDirection,
  positionMm: readonly [number, number],
  nominalDiameterMm: number | undefined,
  detachable = true,
): ApparatusPort => ({ id, kind, direction, positionMm, nominalDiameterMm, detachable });

const part = (
  id: string,
  role: ApparatusPart["role"],
  boundsMm: readonly [number, number, number, number],
  detachable: boolean,
  portIds: readonly string[] = [],
): ApparatusPart => ({ id, role, boundsMm, detachable, portIds });

const stateVariants = (...variants: ApparatusStateVariant[]): readonly ApparatusStateVariant[] => variants;

const approximateContainedMarking = (
  displayRangeMl: { readonly minimum: number; readonly maximum: number },
  majorIntervalMl: number,
  minorIntervalMl: number | undefined,
  readingResolutionMl: number | undefined,
  provenance: ApparatusProvenance,
): InstrumentMarking => ({
  kind: "approximate-contained",
  displayRangeMl,
  valueDirection: "increases-upward",
  reference: "bottom-zero",
  calibration: "approximate",
  markingSurface: "vessel-wall",
  labelPolicy: "selected-major",
  majorIntervalMl,
  minorIntervalMl,
  readingResolutionMl,
  provenance,
});

const approximateBuretteMarking = (
  displayRangeMl: { readonly minimum: number; readonly maximum: number },
  majorIntervalMl: number,
  minorIntervalMl: number,
  readingResolutionMl: number,
  provenance: ApparatusProvenance,
): InstrumentMarking => ({
  kind: "burette-approximate",
  displayRangeMl,
  valueDirection: "increases-downward",
  reference: "top-zero",
  calibration: "approximate",
  markingSurface: "tube-wrap",
  labelPolicy: "selected-major",
  majorIntervalMl,
  minorIntervalMl,
  readingResolutionMl,
  provenance,
});

const graduatedCylinderMarking = (
  displayRangeMl: { readonly minimum: number; readonly maximum: number },
  majorIntervalMl: number,
  minorIntervalMl: number,
  readingResolutionMl: number,
  provenance: ApparatusProvenance,
): InstrumentMarking => ({
  kind: "graduated-cylinder-in",
  displayRangeMl,
  valueDirection: "increases-upward",
  reference: "bottom-zero",
  calibration: "In",
  markingSurface: "vessel-wall",
  labelPolicy: "all-major",
  majorIntervalMl,
  minorIntervalMl,
  readingResolutionMl,
  provenance,
});

const empty = (): ApparatusStateVariant => ({
  id: "empty",
  visibleLayers: ["glass", "rim", "scale", "shadow"],
  description: "Empty vessel with glass and calibration layers",
});

const filled = (): ApparatusStateVariant => ({
  id: "filled",
  visibleLayers: ["glass", "rim", "scale", "liquid", "meniscus", "shadow"],
  description: "Vessel with state-derived liquid and meniscus layers",
});

const connectorState = (): ApparatusStateVariant => ({
  id: "disconnected",
  visibleLayers: ["body", "port", "shadow"],
  description: "Detachable connector not attached to another port",
});

const connected = (): ApparatusStateVariant => ({
  id: "connected",
  visibleLayers: ["body", "port", "connection-highlight", "shadow"],
  description: "Detachable connector seated on a compatible port",
});

const standardFamilySource = source(
  "jy-t-0655-2025",
  "https://www.moe.gov.cn/srcsite/A06/s3732/202507/W020250701322477393561.pdf",
  "standard-family",
  "Teaching-equipment family and associated laboratory practice; not a product dimension",
  "not-stated",
);

const volumetricSource = source(
  "duran-volumetric-250ml-class-a",
  "https://www.dwk.com/duran-volumetric-flask-class-a-amber-with-ukas-certificate-250-ml-246743658",
  "manufacturer-anchor",
  "250 mL Class A volumetric flask, approximately 80 mm diameter by 210 mm height",
  "reported",
);

const cylinderSource = source(
  "duran-cylinder-100ml-class-a",
  "https://www.dwk.com/na/duran-measuring-cylinder-with-hexagonal-base-class-a-100-ml-213902402",
  "manufacturer-anchor",
  "100 mL Class A measuring cylinder, 29 mm diameter by 256 mm height and 1 mL interval",
  "reported",
);

const connectorSource = source(
  "jy-t-0427-2011",
  "https://std.samr.gov.cn/hb/search/stdHBDetailed?id=8B1827F2030ABB19E05397BE0A0AB44A",
  "standard-family",
  "Teaching glass connector family includes T, Y and U connection tubes",
  "not-stated",
);

const approximateSource = (claim: string): ApparatusProvenance => source(
  "chemrealm-visual-proportion-anchor",
  "docs/research/m6-zhejiang-apparatus-and-visual-target.md",
  "approximate-visual",
  claim,
  "approximate",
);

function vessel(
  specificationId: string,
  familyId: Exclude<ApparatusFamilyId, "glass-tube" | "rubber-tube" | "connector" | "rubber-stopper">,
  displayName: string,
  dimensionsMm: readonly [number, number, number],
  capacityMl: number,
  provenance: readonly ApparatusProvenance[],
  extra: Partial<Pick<ApparatusSpecification, "marking" | "parts" | "ports" | "stateVariants" | "material">> = {},
): ApparatusSpecification {
  const defaultPort = port("vessel.mouth", "fluid-inlet", "in", [dimensionsMm[0] / 2, 0], undefined, false);
  return {
    specificationId,
    familyId,
    displayName,
    kind: "vessel",
    material: extra.material ?? "borosilicate-glass",
    dimensionsMm,
    capacityMl,
    marking: extra.marking,
    sourceClass: provenance.some((item) => item.sourceClass === "manufacturer-anchor")
      ? "manufacturer-anchor"
      : "standard-family",
    claimScope: "Physical specification and visual proportion anchor; not a chemical model",
    provenance,
    parts: extra.parts ?? [
      part("vessel.body", "body", bounds(0, 20, dimensionsMm[0], dimensionsMm[1] - 20), false),
      part("vessel.rim", "rim", bounds(dimensionsMm[0] * 0.25, 0, dimensionsMm[0] * 0.5, 8), false, [defaultPort.id]),
      part("vessel.base", "base", bounds(0, dimensionsMm[1] - 8, dimensionsMm[0], 8), false),
    ],
    ports: extra.ports ?? [defaultPort],
    detachable: false,
    stateVariants: extra.stateVariants ?? stateVariants(empty(), filled()),
  };
}

function beaker(
  specificationId: string,
  displayName: string,
  dimensionsMm: readonly [number, number, number],
  capacityMl: number,
  marking: InstrumentMarking,
  provenance: readonly ApparatusProvenance[],
): ApparatusSpecification {
  const mouth = port("vessel.mouth", "fluid-inlet", "in", [dimensionsMm[0] / 2, 0], undefined, false);
  const spout = port("vessel.spout", "fluid-outlet", "out", [dimensionsMm[0], 10], undefined, false);
  return vessel(specificationId, "beaker", displayName, dimensionsMm, capacityMl, provenance, {
    marking,
    parts: [
      part("vessel.body", "body", bounds(0, 0, dimensionsMm[0], dimensionsMm[1]), false, [mouth.id]),
      part("vessel.rim", "rim", bounds(0, 0, dimensionsMm[0], 6), false, [mouth.id]),
      part("vessel.spout", "spout", bounds(dimensionsMm[0] - 3, 2, 18, 14), false, [spout.id]),
      part("vessel.base", "base", bounds(3, dimensionsMm[1] - 5, dimensionsMm[0] - 6, 5), false),
    ],
    ports: [mouth, spout],
  });
}

const legacySpecifications: ApparatusSpecification[] = [
  {
    specificationId: "burette-v0-100ml",
    familyId: "burette",
    displayName: "V0 composition burette, 100 mL",
    kind: "vessel",
    material: "borosilicate-glass",
    dimensionsMm: dimensions(42, 980, 42),
    capacityMl: 100,
    marking: approximateBuretteMarking({ minimum: 0, maximum: 100 }, 10, 1, 1, approximateSource("Existing v0 composition burette fixture scale; top-zero direction normalized to the burette family")),
    sourceClass: "approximate-visual",
    claimScope: "Existing M4/M5 world fixture compatibility; approximate visual dimensions",
    provenance: [approximateSource("Existing v0 world uses a 100 mL burette profile")],
    parts: [
      part("burette.body", "body", bounds(0, 0, 42, 900), false, ["burette.top-joint", "burette.bottom-joint"]),
      part("burette.scale", "scale", bounds(42, 0, 28, 900), false),
      part("burette.stopcock", "stopcock", bounds(0, 900, 64, 32), true, ["burette.bottom-joint"]),
      part("burette.tip", "tip", bounds(22, 932, 16, 48), true, ["burette.outlet"]),
    ],
    ports: [
      port("burette.top-joint", "fluid-inlet", "in", [21, 0], 6),
      port("burette.bottom-joint", "joint", "bidirectional", [21, 900], 6),
      port("burette.outlet", "fluid-outlet", "out", [30, 980], 4),
    ],
    detachable: true,
    stateVariants: stateVariants(empty(), filled(), connected()),
  },
  beaker("beaker-100ml", "Beaker, Griffin low form, 100 mL", dimensions(63, 72, 52), 100, approximateContainedMarking({ minimum: 20, maximum: 100 }, 20, 10, 10, approximateSource("100 mL Griffin beaker contained-volume marks; visual approximation")), [standardFamilySource, approximateSource("100 mL Griffin low-form proportions")]),
  beaker("beaker-500ml", "Beaker, Griffin low form, 500 mL", dimensions(106, 125, 88), 500, approximateContainedMarking({ minimum: 50, maximum: 400 }, 100, 50, 50, approximateSource("500 mL Griffin beaker contained-volume marks; visual approximation")), [standardFamilySource, approximateSource("500 mL Griffin low-form proportions")]),
  beaker("beaker-1000ml", "Beaker, Griffin low form, 1000 mL", dimensions(136, 165, 112), 1000, approximateContainedMarking({ minimum: 100, maximum: 800 }, 200, 100, 100, approximateSource("1000 mL Griffin beaker contained-volume marks; visual approximation")), [standardFamilySource, approximateSource("1000 mL Griffin low-form proportions")]),
  vessel("conical-flask-100ml", "conical-flask", "Erlenmeyer flask, 100 mL", dimensions(62, 105, 62), 100, [standardFamilySource, approximateSource("100 mL Erlenmeyer proportions")]),
  vessel("volumetric-flask-50ml", "volumetric-flask", "Volumetric flask, Class B, 50 mL", dimensions(46, 140, 46), 50, [standardFamilySource, approximateSource("50 mL volumetric flask proportions")]),
  vessel("volumetric-flask-100ml", "volumetric-flask", "Volumetric flask, Class B, 100 mL", dimensions(61, 170, 61), 100, [standardFamilySource, approximateSource("100 mL volumetric flask proportions anchored to a manufacturer blank")]),
  vessel("volumetric-flask-250ml", "volumetric-flask", "Volumetric flask, Class A, 250 mL", dimensions(80, 210, 80), 250, [volumetricSource, standardFamilySource]),
  vessel("volumetric-flask-500ml", "volumetric-flask", "Volumetric flask, Class B, 500 mL", dimensions(100, 260, 100), 500, [standardFamilySource, approximateSource("500 mL volumetric flask proportions")]),
  vessel("conical-flask-500ml", "conical-flask", "Erlenmeyer flask, 500 mL", dimensions(102, 186, 102), 500, [standardFamilySource, approximateSource("500 mL Erlenmeyer proportions")]),
  vessel("graduated-cylinder-25ml", "graduated-cylinder", "Measuring cylinder, Class B, 25 mL", dimensions(21, 167, 21), 25, [standardFamilySource, source("duran-cylinder-25ml-class-b", "https://www.dwk.com/duran-measuring-cylinder-with-hexagonal-base-class-b-25-ml-213961403", "manufacturer-anchor", "25 mL cylinder, 21 mm diameter by 167 mm height and 0.5 mL interval", "reported")], { marking: graduatedCylinderMarking({ minimum: 0, maximum: 25 }, 5, 0.5, 0.5, source("duran-cylinder-25ml-class-b", "https://www.dwk.com/duran-measuring-cylinder-with-hexagonal-base-class-b-25-ml-213961403", "manufacturer-anchor", "25 mL cylinder, 21 mm diameter by 167 mm height and 0.5 mL interval", "reported")) }),
  vessel("graduated-cylinder-50ml", "graduated-cylinder", "Measuring cylinder, Class B, 50 mL", dimensions(25, 200, 25), 50, [standardFamilySource, approximateSource("50 mL graduated cylinder proportions")], { marking: graduatedCylinderMarking({ minimum: 0, maximum: 50 }, 10, 1, 1, approximateSource("50 mL graduated cylinder marking approximation")) }),
  vessel("graduated-cylinder-100ml", "graduated-cylinder", "Measuring cylinder, Class A, 100 mL", dimensions(29, 256, 29), 100, [cylinderSource, standardFamilySource], { marking: graduatedCylinderMarking({ minimum: 0, maximum: 100 }, 10, 1, 1, cylinderSource) }),
  vessel("graduated-cylinder-250ml", "graduated-cylinder", "Measuring cylinder, Class B, 250 mL", dimensions(38, 330, 38), 250, [standardFamilySource, approximateSource("250 mL graduated cylinder proportions")], { marking: graduatedCylinderMarking({ minimum: 0, maximum: 250 }, 50, 5, 5, approximateSource("250 mL graduated cylinder marking approximation")) }),
  vessel("test-tube-16x150mm", "test-tube", "Test tube, 16 × 150 mm", dimensions(18, 150, 18), 25, [standardFamilySource, approximateSource("16 × 150 mm teaching test-tube size")], { material: "soda-lime-glass" }),
  vessel("test-tube-18x180mm", "test-tube", "Large test tube, 18 × 180 mm", dimensions(20, 180, 20), 35, [standardFamilySource, approximateSource("18 × 180 mm teaching test-tube size")], { material: "borosilicate-glass" }),
  {
    specificationId: "glass-tube-straight-6mm",
    familyId: "glass-tube",
    displayName: "Straight glass delivery tube, 6 mm",
    kind: "connector",
    material: "borosilicate-glass",
    dimensionsMm: dimensions(6, 200, 6),
    capacityMl: undefined,
    marking: undefined,
    sourceClass: "standard-family",
    claimScope: "Teaching glass connector; nominal diameter is a connection anchor",
    provenance: [connectorSource, approximateSource("200 mm straight tube length")],
    parts: [part("tube.body", "tube", bounds(0, 0, 6, 200), false, ["tube.end-a", "tube.end-b"])],
    ports: [
      port("tube.end-a", "joint", "bidirectional", [3, 0], 6),
      port("tube.end-b", "joint", "bidirectional", [3, 200], 6),
    ],
    detachable: true,
    stateVariants: stateVariants(connectorState(), connected()),
  },
  {
    specificationId: "glass-tube-bent-6mm",
    familyId: "glass-tube",
    displayName: "Bent glass delivery tube, 6 mm",
    kind: "connector",
    material: "borosilicate-glass",
    dimensionsMm: dimensions(70, 150, 6),
    capacityMl: undefined,
    marking: undefined,
    sourceClass: "standard-family",
    claimScope: "Teaching glass connector with a bent path; bend geometry is an approximate visual variant",
    provenance: [connectorSource, approximateSource("Bent tube path and 150 mm overall envelope")],
    parts: [part("tube.body", "tube", bounds(0, 0, 70, 150), false, ["tube.end-a", "tube.end-b"])],
    ports: [
      port("tube.end-a", "joint", "bidirectional", [0, 3], 6),
      port("tube.end-b", "joint", "bidirectional", [70, 147], 6),
    ],
    detachable: true,
    stateVariants: stateVariants(connectorState(), connected()),
  },
  {
    specificationId: "glass-tube-u-6mm",
    familyId: "glass-tube",
    displayName: "U-shaped glass connector, 6 mm",
    kind: "connector",
    material: "borosilicate-glass",
    dimensionsMm: dimensions(70, 110, 6),
    capacityMl: undefined,
    marking: undefined,
    sourceClass: "standard-family",
    claimScope: "JY/T 0427 U connector family; dimensions are an approximate visual envelope",
    provenance: [connectorSource, approximateSource("U connector envelope")],
    parts: [part("connector.body", "connector", bounds(0, 0, 70, 110), false, ["connector.end-a", "connector.end-b"])],
    ports: [
      port("connector.end-a", "joint", "bidirectional", [3, 0], 6),
      port("connector.end-b", "joint", "bidirectional", [67, 0], 6),
    ],
    detachable: true,
    stateVariants: stateVariants(connectorState(), connected()),
  },
  {
    specificationId: "connector-t-6mm",
    familyId: "connector",
    displayName: "T-shaped glass connector, 6 mm",
    kind: "connector",
    material: "borosilicate-glass",
    dimensionsMm: dimensions(70, 70, 6),
    capacityMl: undefined,
    marking: undefined,
    sourceClass: "standard-family",
    claimScope: "JY/T 0427 T connector family; branch geometry is an approximate visual envelope",
    provenance: [connectorSource, approximateSource("T connector envelope")],
    parts: [part("connector.body", "connector", bounds(0, 0, 70, 70), false, ["connector.end-a", "connector.end-b", "connector.branch"])],
    ports: [
      port("connector.end-a", "joint", "bidirectional", [0, 35], 6),
      port("connector.end-b", "joint", "bidirectional", [70, 35], 6),
      port("connector.branch", "joint", "bidirectional", [35, 0], 6),
    ],
    detachable: true,
    stateVariants: stateVariants(connectorState(), connected()),
  },
  {
    specificationId: "connector-y-6mm",
    familyId: "connector",
    displayName: "Y-shaped glass connector, 6 mm",
    kind: "connector",
    material: "borosilicate-glass",
    dimensionsMm: dimensions(80, 80, 6),
    capacityMl: undefined,
    marking: undefined,
    sourceClass: "standard-family",
    claimScope: "JY/T 0427 Y connector family; branch geometry is an approximate visual envelope",
    provenance: [connectorSource, approximateSource("Y connector envelope")],
    parts: [part("connector.body", "connector", bounds(0, 0, 80, 80), false, ["connector.end-a", "connector.end-b", "connector.branch"])],
    ports: [
      port("connector.end-a", "joint", "bidirectional", [0, 65], 6),
      port("connector.end-b", "joint", "bidirectional", [80, 65], 6),
      port("connector.branch", "joint", "bidirectional", [40, 0], 6),
    ],
    detachable: true,
    stateVariants: stateVariants(connectorState(), connected()),
  },
  {
    specificationId: "rubber-tube-6mm",
    familyId: "rubber-tube",
    displayName: "Flexible rubber tube, nominal 6 mm",
    kind: "connector",
    material: "silicone-rubber",
    dimensionsMm: dimensions(8, 300, 8),
    capacityMl: undefined,
    marking: undefined,
    sourceClass: "approximate-visual",
    claimScope: "Flexible connector; nominal diameter and length are visual/connection anchors",
    provenance: [connectorSource, approximateSource("Flexible tube nominal 6 mm connection size")],
    parts: [part("tube.body", "tube", bounds(0, 0, 8, 300), false, ["tube.end-a", "tube.end-b"])],
    ports: [
      port("tube.end-a", "joint", "bidirectional", [4, 0], 6),
      port("tube.end-b", "joint", "bidirectional", [4, 300], 6),
    ],
    detachable: true,
    stateVariants: stateVariants(connectorState(), connected()),
  },
  {
    specificationId: "rubber-stopper-one-hole-18mm",
    familyId: "rubber-stopper",
    displayName: "Tapered rubber stopper, one hole",
    kind: "closure",
    material: "natural-rubber",
    dimensionsMm: dimensions(24, 25, 24),
    capacityMl: undefined,
    marking: undefined,
    sourceClass: "standard-family",
    claimScope: "One-hole teaching stopper; hole and taper are connection semantics, not a seal guarantee",
    provenance: [connectorSource, source("fisher-two-hole-stoppers", "https://www.fishersci.com/shop/products/rubber-stopper-assortment/s67823", "manufacturer-anchor", "Teaching rubber stoppers are tapered and sold in one-/two-hole families", "reported")],
    parts: [part("stopper.body", "stopper", bounds(0, 0, 24, 25), false, ["stopper.hole-a"])],
    ports: [port("stopper.hole-a", "joint", "bidirectional", [12, 0], 6)],
    detachable: true,
    stateVariants: stateVariants(connectorState(), connected()),
  },
  {
    specificationId: "rubber-stopper-two-hole-18mm",
    familyId: "rubber-stopper",
    displayName: "Tapered rubber stopper, two holes",
    kind: "closure",
    material: "natural-rubber",
    dimensionsMm: dimensions(24, 25, 24),
    capacityMl: undefined,
    marking: undefined,
    sourceClass: "standard-family",
    claimScope: "Two-hole teaching stopper; holes and taper are connection semantics, not a seal guarantee",
    provenance: [connectorSource, source("fisher-two-hole-stoppers", "https://www.fishersci.com/shop/products/rubber-stopper-assortment/s67823", "manufacturer-anchor", "Teaching rubber stopper family has a two-hole variant", "reported")],
    parts: [part("stopper.body", "stopper", bounds(0, 0, 24, 25), false, ["stopper.hole-a", "stopper.hole-b"])],
    ports: [
      port("stopper.hole-a", "joint", "bidirectional", [8, 0], 6),
      port("stopper.hole-b", "joint", "bidirectional", [16, 0], 6),
    ],
    detachable: true,
    stateVariants: stateVariants(connectorState(), connected()),
  },
  {
    specificationId: "rubber-stopper-three-hole-18mm",
    familyId: "rubber-stopper",
    displayName: "Tapered rubber stopper, three holes",
    kind: "closure",
    material: "natural-rubber",
    dimensionsMm: dimensions(24, 25, 24),
    capacityMl: undefined,
    marking: undefined,
    sourceClass: "approximate-visual",
    claimScope: "Three-hole teaching closure variant; hole layout is an explicit visual/connection approximation",
    provenance: [connectorSource, approximateSource("Three-hole stopper layout")],
    parts: [part("stopper.body", "stopper", bounds(0, 0, 24, 25), false, ["stopper.hole-a", "stopper.hole-b", "stopper.hole-c"])],
    ports: [
      port("stopper.hole-a", "joint", "bidirectional", [6, 0], 6),
      port("stopper.hole-b", "joint", "bidirectional", [12, 0], 6),
      port("stopper.hole-c", "joint", "bidirectional", [18, 0], 6),
    ],
    detachable: true,
    stateVariants: stateVariants(connectorState(), connected()),
  },
];

const connections: ApparatusConnection[] = [
  { fromSpecificationId: "rubber-tube-6mm", fromPortId: "tube.end-a", toPortKind: "fluid-inlet", connectionType: "slip-fit", nominalDiameterToleranceMm: 0.5 },
  { fromSpecificationId: "rubber-tube-6mm", fromPortId: "tube.end-b", toPortKind: "fluid-outlet", connectionType: "slip-fit", nominalDiameterToleranceMm: 0.5 },
  { fromSpecificationId: "glass-tube-straight-6mm", fromPortId: "tube.end-a", toPortKind: "joint", connectionType: "slip-fit", nominalDiameterToleranceMm: 0.2 },
  { fromSpecificationId: "glass-tube-bent-6mm", fromPortId: "tube.end-a", toPortKind: "joint", connectionType: "slip-fit", nominalDiameterToleranceMm: 0.2 },
  { fromSpecificationId: "glass-tube-u-6mm", fromPortId: "connector.end-a", toPortKind: "joint", connectionType: "slip-fit", nominalDiameterToleranceMm: 0.2 },
  { fromSpecificationId: "connector-t-6mm", fromPortId: "connector.end-a", toPortKind: "joint", connectionType: "slip-fit", nominalDiameterToleranceMm: 0.2 },
  { fromSpecificationId: "connector-y-6mm", fromPortId: "connector.end-a", toPortKind: "joint", connectionType: "slip-fit", nominalDiameterToleranceMm: 0.2 },
  { fromSpecificationId: "rubber-stopper-one-hole-18mm", fromPortId: "stopper.hole-a", toPortKind: "joint", connectionType: "stopper-seat", nominalDiameterToleranceMm: 0.5 },
  { fromSpecificationId: "rubber-stopper-two-hole-18mm", fromPortId: "stopper.hole-a", toPortKind: "joint", connectionType: "stopper-seat", nominalDiameterToleranceMm: 0.5 },
  { fromSpecificationId: "rubber-stopper-three-hole-18mm", fromPortId: "stopper.hole-a", toPortKind: "joint", connectionType: "stopper-seat", nominalDiameterToleranceMm: 0.5 },
];

function freezeDeep<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) freezeDeep(child);
  }
  return value;
}

export const APPARATUS_CATALOG: ApparatusCatalog = freezeDeep({
  version: APPARATUS_CATALOG_VERSION,
  visualFamily: "chemrealm-lab-v1",
  coordinateUnit: "mm",
  specifications: replaceGoldMasterSpecifications(legacySpecifications),
  connections,
});

assertGoldMasterCatalogSource(APPARATUS_CATALOG);

export const APPARATUS_SPECIFICATION_IDS = Object.freeze({
  burette: "burette-v0-100ml",
  conicalFlask: "conical-flask-250ml",
  beaker: "beaker-250ml",
} as const);

export function apparatusSpecification(
  specificationId: string,
): ApparatusSpecification {
  const specification = APPARATUS_CATALOG.specifications.find(
    (candidate) => candidate.specificationId === specificationId,
  );
  if (specification === undefined) {
    throw new Error(`unknown apparatus specification: ${specificationId}`);
  }
  return specification;
}

function requiredPositive(value: number | undefined, name: string): void {
  if (value !== undefined && (!Number.isFinite(value) || value <= 0)) {
    throw new RangeError(`${name} must be positive and finite`);
  }
}

function connectionKindsCompatible(
  fromKind: ApparatusPortKind,
  toKind: ApparatusPortKind,
): boolean {
  if (fromKind === "support-contact") return toKind === "support-contact";
  if (fromKind === "joint") {
    return toKind === "joint" || toKind === "fluid-inlet" || toKind === "fluid-outlet";
  }
  if (fromKind === "fluid-inlet") return toKind === "fluid-outlet" || toKind === "joint";
  if (fromKind === "fluid-outlet") return toKind === "fluid-inlet" || toKind === "joint";
  if (fromKind === "gas-inlet") return toKind === "gas-outlet" || toKind === "joint";
  if (fromKind === "gas-outlet") return toKind === "gas-inlet" || toKind === "joint";
  return false;
}

export function validateApparatusCatalog(
  catalog: ApparatusCatalog = APPARATUS_CATALOG,
): ApparatusCatalog {
  if (catalog.coordinateUnit !== "mm") throw new Error("apparatus catalog coordinates must be millimetres");
  if (catalog.visualFamily !== "chemrealm-lab-v1") throw new Error("apparatus catalog visual family is unsupported");
  const specificationsById = new Map<string, ApparatusSpecification>();
  for (const specification of catalog.specifications) {
    if (specificationsById.has(specification.specificationId)) {
      throw new Error(`duplicate specification: ${specification.specificationId}`);
    }
    specificationsById.set(specification.specificationId, specification);
    if (specification.dimensionsMm.some((value) => !Number.isFinite(value) || value <= 0)) {
      throw new RangeError(`specification dimensions must be positive: ${specification.specificationId}`);
    }
    requiredPositive(specification.capacityMl, `${specification.specificationId} capacity`);
    if (specification.marking !== undefined) {
      const marking = specification.marking;
      requiredPositive(marking.displayRangeMl.maximum, `${specification.specificationId} marking maximum`);
      if (marking.displayRangeMl.minimum >= marking.displayRangeMl.maximum) {
        throw new RangeError(`marking range is not increasing: ${specification.specificationId}`);
      }
      assertInstrumentMarking(marking);
      if (specification.capacityMl !== undefined && marking.displayRangeMl.maximum > specification.capacityMl) {
        throw new RangeError(`marking exceeds capacity: ${specification.specificationId}`);
      }
    }
    const portIds = new Set<string>();
    for (const apparatusPort of specification.ports) {
      if (portIds.has(apparatusPort.id)) throw new Error(`duplicate port: ${specification.specificationId}/${apparatusPort.id}`);
      portIds.add(apparatusPort.id);
      requiredPositive(apparatusPort.nominalDiameterMm, `${specification.specificationId}/${apparatusPort.id} diameter`);
    }
    const partIds = new Set<string>();
    for (const apparatusPart of specification.parts) {
      if (partIds.has(apparatusPart.id)) throw new Error(`duplicate part: ${specification.specificationId}/${apparatusPart.id}`);
      partIds.add(apparatusPart.id);
      for (const portId of apparatusPart.portIds) {
        if (!portIds.has(portId)) throw new Error(`part references unknown port: ${specification.specificationId}/${portId}`);
      }
    }
    if (specification.provenance.length === 0) throw new Error(`specification has no provenance: ${specification.specificationId}`);
    for (const provenance of specification.provenance) {
      if (provenance.sourceRef.trim().length === 0 || provenance.claim.trim().length === 0) {
        throw new Error(`incomplete provenance: ${specification.specificationId}`);
      }
    }
  }
  for (const connection of catalog.connections) {
    const from = specificationsById.get(connection.fromSpecificationId);
    if (from === undefined) throw new Error(`unknown connection source: ${connection.fromSpecificationId}`);
    const fromPort = from.ports.find((apparatusPort) => apparatusPort.id === connection.fromPortId);
    if (fromPort === undefined) {
      throw new Error(`unknown connection source port: ${connection.fromSpecificationId}/${connection.fromPortId}`);
    }
    if (!connectionKindsCompatible(fromPort.kind, connection.toPortKind)) {
      throw new Error(`incompatible connection: ${connection.fromSpecificationId}/${connection.fromPortId} cannot connect to ${connection.toPortKind}`);
    }
    if (connection.nominalDiameterToleranceMm !== undefined && connection.nominalDiameterToleranceMm < 0) {
      throw new RangeError(`connection tolerance cannot be negative: ${connection.fromSpecificationId}`);
    }
  }
  return catalog;
}
