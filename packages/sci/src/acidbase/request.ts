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
  /** Conserved dose currently present in the solved vessel, when declared. */
  readonly indicatorAmounts?: readonly {
    readonly indicatorId: string;
    readonly amount: Mol;
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
  const indicatorAmounts = new Map(
    (input.indicatorAmounts ?? []).map((entry) => [entry.indicatorId, entry.amount] as const),
  );
  if (indicatorAmounts.size !== (input.indicatorAmounts ?? []).length) {
    throw new RangeError("acid-base indicator inventory contains duplicate IDs");
  }
  const declaredIndicatorIds = new Set(
    input.indicators.map((indicator) => indicator.indicatorId),
  );
  const undeclared = [...indicatorAmounts.keys()].find(
    (indicatorId) => !declaredIndicatorIds.has(indicatorId),
  );
  if (undeclared !== undefined) {
    throw new RangeError(
      `acid-base indicator inventory is not declared by the scenario: ${undeclared}`,
    );
  }
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
    indicators: Object.freeze(input.indicators.map((indicator) => {
      const amount = indicatorAmounts.get(indicator.indicatorId);
      return {
        indicatorId: indicator.indicatorId,
        kaIn: indicator.kaIn,
        ...(amount === undefined ? {} : { totalAmount: amount }),
      };
    })),
  });
}
