import {
  molPerKilogram,
  reduceMolality,
  reducedMolality,
  type ReducedMolality,
  type SolveRequest,
} from "@chemrealm/schema";
import {
  ACID_BASE_COMPONENT_IDS,
  DEFAULT_ACID_BASE_CONSTANTS,
  type AcidBaseConstants,
  type AcidBaseComponentId,
} from "./model.js";

export interface AcidBaseComponentCatalogEntry {
  readonly id: AcidBaseComponentId;
  readonly mode: "fully-dissociated" | "monoprotic-equilibrium";
  readonly contributes: readonly (
    | "strongAcidChloride"
    | "strongBaseSodium"
    | "acidFamily"
  )[];
}

type Contribution = AcidBaseComponentCatalogEntry["contributes"][number];

function catalogEntry(
  id: AcidBaseComponentId,
  mode: AcidBaseComponentCatalogEntry["mode"],
  contributes: readonly Contribution[],
): AcidBaseComponentCatalogEntry {
  return Object.freeze({
    id,
    mode,
    contributes: Object.freeze([...contributes]),
  });
}

const catalogEntries = new Map<
  AcidBaseComponentId,
  AcidBaseComponentCatalogEntry
>([
  ["HCl", catalogEntry("HCl", "fully-dissociated", ["strongAcidChloride"])],
  ["NaOH", catalogEntry("NaOH", "fully-dissociated", ["strongBaseSodium"])],
  ["HOAc", catalogEntry("HOAc", "monoprotic-equilibrium", ["acidFamily"])],
  [
    "NaOAc",
    catalogEntry("NaOAc", "fully-dissociated", ["strongBaseSodium", "acidFamily"]),
  ],
]);

/** A frozen read-only view; Object.freeze(new Map()) does not block Map.set(). */
export const ACID_BASE_COMPONENT_CATALOG: ReadonlyMap<
  AcidBaseComponentId,
  AcidBaseComponentCatalogEntry
> = Object.freeze({
  get(key: AcidBaseComponentId) {
    return catalogEntries.get(key);
  },
  has(key: AcidBaseComponentId) {
    return catalogEntries.has(key);
  },
  get size() {
    return catalogEntries.size;
  },
  entries() {
    return catalogEntries.entries();
  },
  keys() {
    return catalogEntries.keys();
  },
  values() {
    return catalogEntries.values();
  },
  forEach(
    callback: (
      value: AcidBaseComponentCatalogEntry,
      key: AcidBaseComponentId,
      map: ReadonlyMap<AcidBaseComponentId, AcidBaseComponentCatalogEntry>,
    ) => void,
  ) {
    catalogEntries.forEach((value, key) => callback(value, key, this));
  },
  [Symbol.iterator]() {
    return catalogEntries[Symbol.iterator]();
  },
}) as ReadonlyMap<AcidBaseComponentId, AcidBaseComponentCatalogEntry>;

export interface AcidBaseComponentTotals {
  readonly strongAcidChlorideMolality: ReducedMolality;
  readonly strongBaseSodiumMolality: ReducedMolality;
  readonly totalAcidFamilyMolality: ReducedMolality;
}

function isSupportedComponent(value: string): value is AcidBaseComponentId {
  return (ACID_BASE_COMPONENT_IDS as readonly string[]).includes(value);
}

function add(a: ReducedMolality, b: ReducedMolality): ReducedMolality {
  return reducedMolality(a.value + b.value);
}

function reducedAmount(
  amount: number,
  waterMass: number,
): ReducedMolality {
  return reduceMolality(molPerKilogram(amount / waterMass));
}

function unsupported(message: string): never {
  throw new RangeError(`acid-base component is outside the v0 model: ${message}`);
}

/** Aggregate model-owned component stoichiometry into reduced analytical totals. */
export function aggregateComponents(
  request: SolveRequest,
  constants: AcidBaseConstants = DEFAULT_ACID_BASE_CONSTANTS,
): AcidBaseComponentTotals {
  if (!(request.waterMass > 0) || !Number.isFinite(request.waterMass)) {
    throw new RangeError("acid-base water mass must be finite and positive");
  }

  let strongAcidChlorideMolality = reducedMolality(0);
  let strongBaseSodiumMolality = reducedMolality(0);
  let totalAcidFamilyMolality = reducedMolality(0);
  const seen = new Map<
    AcidBaseComponentId,
    { mode: SolveRequest["solutes"][number]["mode"]; ka?: number }
  >();

  for (const solute of request.solutes) {
    if (!isSupportedComponent(solute.soluteId)) {
      unsupported(solute.soluteId);
    }
    const entry = ACID_BASE_COMPONENT_CATALOG.get(solute.soluteId);
    if (entry === undefined) unsupported(solute.soluteId);
    const ka = solute.mode === "monoprotic-equilibrium" ? solute.ka.value : undefined;
    const previous = seen.get(solute.soluteId);
    if (
      previous !== undefined &&
      (previous.mode !== solute.mode ||
        (previous.ka !== undefined && !Object.is(previous.ka, ka)))
    ) {
      unsupported(`conflicting duplicate ${solute.soluteId}`);
    }
    seen.set(solute.soluteId, { mode: solute.mode, ka });

    if (solute.mode !== entry.mode) {
      unsupported(`${solute.soluteId} requires ${entry.mode} mode`);
    }
    if (
      solute.soluteId === "HOAc" &&
      !Object.is(ka, constants.Ka_HOAc.value)
    ) {
      unsupported("HOAc Ka does not match the frozen model constant");
    }

    const contribution = reducedAmount(solute.amount, request.waterMass);
    for (const role of entry.contributes) {
      switch (role) {
        case "strongAcidChloride":
          strongAcidChlorideMolality = add(
            strongAcidChlorideMolality,
            contribution,
          );
          break;
        case "strongBaseSodium":
          strongBaseSodiumMolality = add(
            strongBaseSodiumMolality,
            contribution,
          );
          break;
        case "acidFamily":
          totalAcidFamilyMolality = add(
            totalAcidFamilyMolality,
            contribution,
          );
          break;
      }
    }
  }

  return Object.freeze({
    strongAcidChlorideMolality,
    strongBaseSodiumMolality,
    totalAcidFamilyMolality,
  });
}

export { buildAcidBaseModelDescriptor, buildAcidBaseSolverConfig } from "./model.js";
export {
  ACID_BASE_MODEL_ID,
  ACID_BASE_MODEL_VERSION,
  ACID_BASE_MAX_TOTAL_SOLUTE_MOLALITY,
  ACID_BASE_MIN_TOTAL_SOLUTE_MOLALITY,
  DEFAULT_ACID_BASE_CONSTANTS,
} from "./model.js";
