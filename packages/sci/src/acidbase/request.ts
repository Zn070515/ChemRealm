import {
  type Kelvin,
  type Kilogram,
  type Litre,
  type Mol,
  type SolveRequest,
  type SolverConfig,
  type ThermodynamicConstant,
} from "@chemrealm/schema";

import {
  ACID_BASE_COMPONENT_CATALOG,
  type AcidBaseComponentCatalogEntry,
} from "./catalog.js";
import { acidBaseConstantsFromSolverConfig } from "./model.js";

/** Plain canonical contents supplied by World Runtime at the Sci boundary. */
export interface AcidBaseSolveRequestInput {
  readonly waterMass: Kilogram;
  readonly liquidVolume: Litre;
  readonly temperature: Kelvin;
  readonly componentAmounts: readonly {
    readonly componentId: string;
    readonly amount: Mol;
  }[];
  readonly indicators: readonly {
    readonly indicatorId: string;
    readonly kaIn: ThermodynamicConstant;
  }[];
  /** The frozen config persisted in WorldCreated; no process default is used. */
  readonly solverConfig: SolverConfig;
}

function catalogEntry(componentId: string): AcidBaseComponentCatalogEntry {
  const entry = ACID_BASE_COMPONENT_CATALOG.get(componentId as never);
  if (entry === undefined) {
    throw new RangeError(`acid-base component is outside the v0 model: ${componentId}`);
  }
  return entry;
}

/**
 * Build the acid-base request from canonical world contents.
 *
 * Component identity, mode, and HOAc's model constant are Scientific Reality
 * Core concerns. The web composition root supplies only resolved quantities
 * and frozen scenario indicator inputs; it does not select chemistry.
 */
export function buildAcidBaseSolveRequest(
  input: AcidBaseSolveRequestInput,
): SolveRequest {
  const constants = acidBaseConstantsFromSolverConfig(input.solverConfig);
  const solutes = input.componentAmounts.map((component) => {
    const entry = catalogEntry(component.componentId);
    if (entry.mode === "monoprotic-equilibrium") {
      return {
        soluteId: component.componentId,
        amount: component.amount,
        mode: entry.mode,
        ka: constants.Ka_HOAc,
      } as const;
    }
    return {
      soluteId: component.componentId,
      amount: component.amount,
      mode: entry.mode,
    } as const;
  });

  return Object.freeze({
    waterMass: input.waterMass,
    liquidVolume: input.liquidVolume,
    temperature: input.temperature,
    solutes: Object.freeze(solutes),
    indicators: Object.freeze(input.indicators.map((indicator) => ({
      indicatorId: indicator.indicatorId,
      kaIn: indicator.kaIn,
    }))),
  });
}
