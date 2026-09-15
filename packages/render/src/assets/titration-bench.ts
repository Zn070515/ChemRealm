import { VERSION_MANIFEST } from "@chemrealm/schema";

export type ApparatusCapability =
  | "contain-liquid"
  | "receive-liquid"
  | "deliver-liquid"
  | "support-apparatus"
  | "read-scale"
  | "inspect-state";

export interface ApparatusAssetPart {
  readonly id: string;
  readonly role: "body" | "neck" | "base" | "stopcock" | "tip" | "clamp" | "support";
  readonly boundsMm: readonly [number, number, number, number];
  readonly capabilities: readonly ApparatusCapability[];
}

export interface ApparatusAssetPort {
  readonly id: string;
  readonly kind: "fluid-inlet" | "fluid-outlet" | "support-contact";
  readonly positionMm: readonly [number, number];
  readonly orientationDeg: number;
}

export interface ApparatusInteractionRegion {
  readonly id: string;
  readonly partId: string;
  readonly boundsMm: readonly [number, number, number, number];
  readonly accessibleLabel: string;
}

export interface ApparatusAssetManifest {
  readonly assetId: string;
  readonly assetVersion: string;
  readonly visualFamily: "chemrealm-lab-v1";
  readonly coordinateUnit: "mm";
  readonly view: "orthographic-side-elevation";
  readonly dimensionsMm: readonly [number, number];
  readonly parts: readonly ApparatusAssetPart[];
  readonly ports: readonly ApparatusAssetPort[];
  readonly interactionRegions: readonly ApparatusInteractionRegion[];
  readonly volumetric: true;
  readonly volumeProfileIds: readonly string[];
  readonly graduation: {
    readonly maximumVolumeL: number;
    readonly majorEveryL: number;
    readonly minorEveryL: number;
  };
  readonly accessibilityLabel: string;
}

function box(x: number, y: number, width: number, height: number): readonly [number, number, number, number] {
  return Object.freeze([x, y, width, height]);
}

function point(x: number, y: number): readonly [number, number] {
  return Object.freeze([x, y]);
}

function caps(...values: ApparatusCapability[]): readonly ApparatusCapability[] {
  return Object.freeze(values);
}

/**
 * Original vector/2.5D master metadata for the first final-quality slice.
 * Runtime version identity comes from the central version manifest; this data
 * describes geometry and interaction semantics, not scientific state.
 */
export const TITRATION_BENCH_ASSET: ApparatusAssetManifest = Object.freeze({
  assetId: "chemrealm.titration-bench",
  assetVersion: VERSION_MANIFEST.representation.apparatusAsset,
  visualFamily: "chemrealm-lab-v1",
  coordinateUnit: "mm",
  view: "orthographic-side-elevation",
  dimensionsMm: Object.freeze([260, 190] as const),
  parts: Object.freeze([
    Object.freeze({
      id: "stand.base",
      role: "base",
      boundsMm: box(0, 170, 62, 20),
      capabilities: caps("support-apparatus"),
    }),
    Object.freeze({
      id: "stand.vertical",
      role: "support",
      boundsMm: box(26, 18, 8, 152),
      capabilities: caps("support-apparatus"),
    }),
    Object.freeze({
      id: "stand.clamp",
      role: "clamp",
      boundsMm: box(28, 38, 52, 16),
      capabilities: caps("support-apparatus"),
    }),
    Object.freeze({
      id: "burette.body",
      role: "body",
      boundsMm: box(74, 20, 14, 126),
      capabilities: caps("contain-liquid", "deliver-liquid", "read-scale", "inspect-state"),
    }),
    Object.freeze({
      id: "burette.stopcock",
      role: "stopcock",
      boundsMm: box(70, 144, 24, 12),
      capabilities: caps("deliver-liquid"),
    }),
    Object.freeze({
      id: "burette.tip",
      role: "tip",
      boundsMm: box(78, 156, 6, 18),
      capabilities: caps("deliver-liquid"),
    }),
    Object.freeze({
      id: "flask.body",
      role: "body",
      boundsMm: box(128, 96, 80, 70),
      capabilities: caps("contain-liquid", "receive-liquid", "inspect-state"),
    }),
    Object.freeze({
      id: "flask.neck",
      role: "neck",
      boundsMm: box(157, 48, 22, 58),
      capabilities: caps("receive-liquid"),
    }),
    Object.freeze({
      id: "flask.base",
      role: "base",
      boundsMm: box(122, 160, 92, 10),
      capabilities: caps("support-apparatus"),
    }),
    Object.freeze({
      id: "beaker.body",
      role: "body",
      boundsMm: box(220, 112, 32, 58),
      capabilities: caps("contain-liquid", "receive-liquid", "inspect-state"),
    }),
  ]),
  ports: Object.freeze([
    Object.freeze({ id: "burette.outlet", kind: "fluid-outlet", positionMm: point(81, 174), orientationDeg: 180 }),
    Object.freeze({ id: "flask.mouth", kind: "fluid-inlet", positionMm: point(168, 48), orientationDeg: 270 }),
    Object.freeze({ id: "stand.base-contact", kind: "support-contact", positionMm: point(31, 180), orientationDeg: 0 }),
  ]),
  interactionRegions: Object.freeze([
    Object.freeze({
      id: "region.burette-body",
      partId: "burette.body",
      boundsMm: box(70, 16, 22, 134),
      accessibleLabel: "Burette body; M7 interaction target reserved",
    }),
    Object.freeze({
      id: "region.flask-body",
      partId: "flask.body",
      boundsMm: box(124, 92, 88, 80),
      accessibleLabel: "Conical flask body; M7 interaction target reserved",
    }),
    Object.freeze({
      id: "region.beaker-body",
      partId: "beaker.body",
      boundsMm: box(216, 108, 40, 64),
      accessibleLabel: "Beaker body; M7 interaction target reserved",
    }),
  ]),
  volumetric: true,
  volumeProfileIds: Object.freeze([
    "m5-burette-100ml-profile",
    "m5-conical-flask-250ml-profile",
  ]),
  graduation: Object.freeze({
    maximumVolumeL: 0.1,
    majorEveryL: 0.01,
    minorEveryL: 0.001,
  }),
  accessibilityLabel: "ChemRealm titration bench with burette, conical flask, stand and beaker",
} as const);

export function validateApparatusAssetManifest(
  manifest: ApparatusAssetManifest = TITRATION_BENCH_ASSET,
): ApparatusAssetManifest {
  if (manifest.coordinateUnit !== "mm") throw new Error("apparatus asset coordinates must be millimetres");
  if (manifest.view !== "orthographic-side-elevation") throw new Error("apparatus asset view must be orthographic");
  if (manifest.parts.length < 4 || manifest.ports.length < 2 || manifest.interactionRegions.length < 3) {
    throw new Error("apparatus asset must declare reusable parts, ports and interaction regions");
  }
  if (!manifest.volumetric || manifest.volumeProfileIds.length === 0) {
    throw new Error("titration apparatus requires frozen volume profile identities");
  }
  if (!(manifest.graduation.maximumVolumeL > 0) || !(manifest.graduation.minorEveryL > 0)) {
    throw new Error("apparatus graduation must have positive scale bounds");
  }
  return manifest;
}
