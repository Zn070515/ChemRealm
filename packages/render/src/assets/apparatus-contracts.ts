import type { InstrumentMarking } from "./instrument-marking.js";
export type { ApparatusProvenance, ApparatusSourceClass } from "./apparatus-provenance.js";
import type { ApparatusProvenance, ApparatusSourceClass } from "./apparatus-provenance.js";

export type ApparatusSpecKind = "vessel" | "support" | "connector" | "closure";
export type ApparatusFamilyId =
  | "burette"
  | "conical-flask"
  | "beaker"
  | "volumetric-flask"
  | "graduated-cylinder"
  | "test-tube"
  | "glass-tube"
  | "rubber-tube"
  | "connector"
  | "rubber-stopper";
export type ApparatusMaterial =
  | "borosilicate-glass"
  | "soda-lime-glass"
  | "natural-rubber"
  | "silicone-rubber"
  | "stainless-steel"
  | "coated-metal"
  | "ceramic";
export type ApparatusPortKind =
  | "fluid-inlet"
  | "fluid-outlet"
  | "gas-inlet"
  | "gas-outlet"
  | "support-contact"
  | "joint";
export type ApparatusPortDirection = "in" | "out" | "bidirectional";

export interface ApparatusPort {
  readonly id: string;
  readonly kind: ApparatusPortKind;
  readonly direction: ApparatusPortDirection;
  readonly positionMm: readonly [number, number];
  readonly nominalDiameterMm: number | undefined;
  readonly detachable: boolean;
}

export interface ApparatusPart {
  readonly id: string;
  readonly role: "body" | "neck" | "rim" | "base" | "scale" | "stopcock" |
    "tip" | "clamp" | "rod" | "knob" | "tube" | "stopper" | "connector" | "spout";
  readonly boundsMm: readonly [number, number, number, number];
  readonly detachable: boolean;
  readonly portIds: readonly string[];
}

export interface ApparatusStateVariant {
  readonly id: "empty" | "filled" | "connected" | "disconnected" | "open" | "closed";
  readonly visibleLayers: readonly string[];
  readonly description: string;
}

export interface ApparatusSpecification {
  readonly specificationId: string;
  readonly familyId: ApparatusFamilyId;
  readonly displayName: string;
  readonly kind: ApparatusSpecKind;
  readonly material: ApparatusMaterial;
  readonly dimensionsMm: readonly [number, number, number];
  readonly capacityMl: number | undefined;
  readonly marking: InstrumentMarking | undefined;
  readonly sourceClass: ApparatusSourceClass;
  readonly claimScope: string;
  readonly provenance: readonly ApparatusProvenance[];
  readonly parts: readonly ApparatusPart[];
  readonly ports: readonly ApparatusPort[];
  readonly detachable: boolean;
  readonly stateVariants: readonly ApparatusStateVariant[];
}

export interface ApparatusConnection {
  readonly fromSpecificationId: string;
  readonly fromPortId: string;
  readonly toPortKind: ApparatusPortKind;
  readonly connectionType: "slip-fit" | "stopper-seat" | "clamp-seat";
  readonly nominalDiameterToleranceMm: number | undefined;
}

export interface ApparatusCatalog {
  readonly version: string;
  readonly visualFamily: "chemrealm-lab-v1";
  readonly coordinateUnit: "mm";
  readonly specifications: readonly ApparatusSpecification[];
  readonly connections: readonly ApparatusConnection[];
}
