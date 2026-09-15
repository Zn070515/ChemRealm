import rawSource from "./gold-master-construction.json";
import type {
  ApparatusCatalog,
  ApparatusPart,
  ApparatusPort,
  ApparatusProvenance,
  ApparatusSpecification,
  ApparatusStateVariant,
} from "./apparatus-contracts.js";

export interface GoldMasterConstructionRecord {
  readonly specificationId: string;
  readonly familyId: "burette" | "beaker" | "conical-flask";
  readonly displayName: string;
  readonly material: ApparatusSpecification["material"];
  readonly materialProfile: string;
  readonly capacityMl: number;
  readonly bodyEnvelopeMm: readonly [number, number, number];
  readonly physicalEnvelopeMm: readonly [number, number, number];
  readonly landmarksMm: Readonly<Record<string, number>>;
  readonly geometry: Readonly<Record<string, string | number>>;
  readonly graduation?: ApparatusSpecification["graduation"];
  readonly anatomy: readonly string[];
  readonly identityLayers: readonly string[];
  readonly parts: readonly {
    readonly id: string;
    readonly role: ApparatusPart["role"];
    readonly boundsMm: readonly [number, number, number, number];
    readonly detachable: boolean;
    readonly portIds: readonly string[];
  }[];
  readonly ports: readonly {
    readonly id: string;
    readonly kind: ApparatusPort["kind"];
    readonly direction: ApparatusPort["direction"];
    readonly positionMm: readonly [number, number];
    readonly nominalDiameterMm: number | null;
    readonly detachable: boolean;
  }[];
  readonly provenance: readonly ApparatusProvenance[];
  readonly lodVisibility: Readonly<Record<"master" | "scene" | "preview" | "thumbnail", readonly string[]>>;
}

export interface GoldMasterConstructionSource {
  readonly schemaVersion: number;
  readonly visualFamily: "chemrealm-lab-v1";
  readonly coordinateUnit: "mm";
  readonly specifications: readonly GoldMasterConstructionRecord[];
}

const freezeDeep = <T>(value: T): T => {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) freezeDeep(child);
  }
  return value;
};

export const GOLD_MASTER_CONSTRUCTION_SOURCE = freezeDeep(
  rawSource as unknown as GoldMasterConstructionSource,
);
export const GOLD_MASTER_SPECIFICATION_IDS = Object.freeze(
  GOLD_MASTER_CONSTRUCTION_SOURCE.specifications.map((record) => record.specificationId),
);

const state = (id: ApparatusStateVariant["id"], visibleLayers: readonly string[], description: string): ApparatusStateVariant => ({
  id,
  visibleLayers,
  description,
});

const toSpecification = (record: GoldMasterConstructionRecord): ApparatusSpecification => {
  const parts: ApparatusPart[] = record.parts.map((item) => ({
    id: item.id,
    role: item.role,
    boundsMm: item.boundsMm,
    detachable: item.detachable,
    portIds: item.portIds,
  }));
  const ports: ApparatusPort[] = record.ports.map((item) => ({
    id: item.id,
    kind: item.kind,
    direction: item.direction,
    positionMm: item.positionMm,
    nominalDiameterMm: item.nominalDiameterMm ?? undefined,
    detachable: item.detachable,
  }));
  return {
    specificationId: record.specificationId,
    familyId: record.familyId,
    displayName: record.displayName,
    kind: "vessel",
    material: record.material,
    dimensionsMm: record.physicalEnvelopeMm,
    capacityMl: record.capacityMl,
    graduation: record.graduation,
    sourceClass: record.provenance.some((item) => item.sourceClass === "manufacturer-anchor")
      ? "manufacturer-anchor"
      : record.provenance.some((item) => item.sourceClass === "standard-family")
        ? "standard-family"
        : "approximate-visual",
    claimScope: "Source-backed physical envelope and explicit visual construction profile; not certified metrology",
    provenance: record.provenance,
    parts,
    ports,
    detachable: record.familyId === "burette",
    stateVariants: record.familyId === "burette"
      ? [
          state("empty", ["glass", "rim", "scale"], "Empty graduated burette"),
          state("filled", ["glass", "rim", "scale", "liquid", "meniscus"], "State-derived liquid burette"),
          state("connected", ["glass", "rim", "scale", "port", "connection-highlight"], "Burette with detachable actuator connection"),
        ]
      : [
          state("empty", ["glass", "rim"], "Empty vessel"),
          state("filled", ["glass", "rim", "liquid", "meniscus"], "State-derived liquid vessel"),
        ],
  };
};

export const GOLD_MASTER_SPECIFICATIONS: readonly ApparatusSpecification[] = freezeDeep(
  GOLD_MASTER_CONSTRUCTION_SOURCE.specifications.map(toSpecification),
);

export function goldMasterSpecification(specificationId: string): GoldMasterConstructionRecord {
  const record = GOLD_MASTER_CONSTRUCTION_SOURCE.specifications.find(
    (candidate) => candidate.specificationId === specificationId,
  );
  if (record === undefined) throw new Error(`unknown Gold Master construction record: ${specificationId}`);
  return record;
}

export function replaceGoldMasterSpecifications(
  specifications: readonly ApparatusSpecification[],
): readonly ApparatusSpecification[] {
  const firstWaveIds = new Set(GOLD_MASTER_SPECIFICATION_IDS);
  return [...GOLD_MASTER_SPECIFICATIONS, ...specifications.filter((item) => !firstWaveIds.has(item.specificationId))];
}

export function assertGoldMasterCatalogSource(catalog: ApparatusCatalog): void {
  for (const record of GOLD_MASTER_CONSTRUCTION_SOURCE.specifications) {
    const specification = catalog.specifications.find((item) => item.specificationId === record.specificationId);
    if (specification === undefined) throw new Error(`catalog missing Gold Master specification: ${record.specificationId}`);
    if (JSON.stringify(specification.dimensionsMm) !== JSON.stringify(record.physicalEnvelopeMm)) {
      throw new Error(`catalog/source dimensions diverge: ${record.specificationId}`);
    }
    if (specification.graduation?.minorEveryMl !== record.graduation?.minorEveryMl) {
      throw new Error(`catalog/source graduation diverges: ${record.specificationId}`);
    }
  }
}
