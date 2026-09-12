import {
  activity,
  ionicStrengthMolal,
  mol,
  molPerKilogram,
  ph,
  reducedIonicStrength,
  type Activity,
  type ActivityCoefficient,
  type ModelDescriptor,
  type Mol,
  type MolPerKilogram,
  type ReducedMolality,
  type SolveRequest,
  type SolveResult,
  type ScientificState,
  type SolverConfig,
} from "@chemrealm/schema";

import { assertSolveResultIdentity, freezeSolverAdapter } from "../identity.js";
import { validateSolveRequest } from "../request.js";
import type { SolverAdapter } from "../adapter.js";
import { detLog10 } from "../deterministic-math.js";
import { protonationRatio } from "./indicator.js";
import { aggregateComponents, type AcidBaseComponentTotals } from "./catalog.js";
import {
  ACID_BASE_MODEL_ID,
  ACID_BASE_MODEL_VERSION,
  DEFAULT_ACID_BASE_CONSTANTS,
  buildAcidBaseModelDescriptor,
  buildAcidBaseSolverConfig,
} from "./model.js";
import { solveReduced, type ReducedSolveSuccess } from "./solve.js";
import type { ReducedSpeciesMolalities } from "./species.js";
import { daviesActivities } from "./activity.js";

/** The proposed validation envelope is narrower than the Davies compute domain. */
export const PROPOSED_ACCURACY_ENVELOPE_IONIC_STRENGTH = 0.12;

const SPECIES_FIELDS = [
  ["H+", "hydrogen"],
  ["OH-", "hydroxide"],
  ["HOAc", "neutralAcid"],
  ["OAc-", "conjugateBase"],
  ["Na+", "sodium"],
  ["Cl-", "chloride"],
] as const satisfies readonly (readonly [string, keyof ReducedSpeciesMolalities])[];

function outOfDomain(
  descriptor: ModelDescriptor,
  reason: string,
): SolveResult {
  return {
    status: "MODEL_OUT_OF_DOMAIN",
    reason,
    nearestSupported: descriptor,
  };
}

function domainReason(
  request: SolveRequest,
  descriptor: ModelDescriptor,
): string | undefined {
  if (request.temperature < descriptor.validity.temperature.min) {
    return "temperature is below the acid-base model's 25 °C domain";
  }
  if (request.temperature > descriptor.validity.temperature.max) {
    return "temperature is above the acid-base model's 25 °C domain";
  }

  const unsupported = request.solutes.find(
    (solute) => !descriptor.validity.species.includes(solute.soluteId),
  );
  if (unsupported !== undefined) {
    return `solute ${unsupported.soluteId} is outside the v0 acid-base model`;
  }
  return undefined;
}

function physicalMolality(
  reduced: ReducedMolality,
  standardMolality: MolPerKilogram,
): MolPerKilogram {
  return molPerKilogram(reduced.value * standardMolality);
}

function speciesState(
  symbol: string,
  reduced: ReducedMolality,
  gamma: ActivityCoefficient,
  request: SolveRequest,
): ScientificState["species"][number] {
  const molality = physicalMolality(
    reduced,
    DEFAULT_ACID_BASE_CONSTANTS.standardMolality,
  );
  const amount: Mol = mol(molality * request.waterMass);
  const speciesActivity: Activity = activity(gamma.value * reduced.value);
  return {
    symbol,
    reducedMolality: reduced,
    molality,
    amount,
    activityCoefficient: gamma,
    activity: speciesActivity,
  };
}

function activityCoefficientForField(
  field: keyof ReducedSpeciesMolalities,
  activities: ReturnType<typeof daviesActivities>,
): ActivityCoefficient {
  switch (field) {
    case "neutralAcid":
      return activities.neutralAcid;
    case "hydrogen":
      return activities.hydrogen;
    case "hydroxide":
      return activities.hydroxide;
    case "conjugateBase":
      return activities.monovalentAnion;
    case "sodium":
    case "chloride":
      return activities.hydrogen;
  }
}

function buildScientificState(
  request: SolveRequest,
  solved: ReducedSolveSuccess,
  model: ModelDescriptor,
  solverConfig: SolverConfig,
): ScientificState {
  const activities = daviesActivities(
    solved.ionicStrength,
    DEFAULT_ACID_BASE_CONSTANTS,
  );
  const species = SPECIES_FIELDS.map(([symbol, field]) =>
    speciesState(
      symbol,
      solved.species[field],
      activityCoefficientForField(field, activities),
      request,
    ),
  );
  const hydrogen = species[0]!;
  const modelPh = ph(-detLog10(hydrogen.activity.value));

  return {
    species,
    ionicStrengthMolal: ionicStrengthMolal(
      solved.ionicStrength.value * DEFAULT_ACID_BASE_CONSTANTS.standardMolality,
    ),
    ionicStrengthReduced: reducedIonicStrength(solved.ionicStrength.value),
    modelPh,
    indicators: request.indicators.map((indicator) => ({
      indicatorId: indicator.indicatorId,
      protonationRatio: protonationRatio(
        indicator,
        hydrogen.activity,
        activities.monovalentAnion,
      ),
    })),
    validity: {
      inDomain: true,
      withinProposedAccuracyEnvelope:
        solved.ionicStrength.value <= PROPOSED_ACCURACY_ENVELOPE_IONIC_STRENGTH,
    },
    provenance: {
      modelId: model.id,
      modelVersion: model.version,
      activityModel: "Davies",
      category: "calculated",
      parameters: { ...solverConfig.parameters },
    },
  };
}

function solveRequest(
  request: SolveRequest,
  model: ModelDescriptor,
  solverConfig: SolverConfig,
): SolveResult {
  const violations = validateSolveRequest(request);
  if (violations.length > 0) {
    return { status: "INVALID_INPUT", violations };
  }

  const reason = domainReason(request, model);
  if (reason !== undefined) return outOfDomain(model, reason);

  let totals: AcidBaseComponentTotals;
  try {
    totals = aggregateComponents(request);
  } catch (error) {
    if (error instanceof RangeError) {
      return outOfDomain(model, error.message);
    }
    throw error;
  }

  const reducedResult = solveReduced({
    totals,
    constants: DEFAULT_ACID_BASE_CONSTANTS,
  });
  if ("kind" in reducedResult) {
    if (reducedResult.kind === "NOT_CONVERGED") {
      return {
        status: "NOT_CONVERGED",
        residual: reducedResult.residual,
        iterations: reducedResult.iterations,
      };
    }
    return outOfDomain(
      model,
      "the converged ionic strength or deterministic math path is outside the v0 model domain",
    );
  }

  const state = buildScientificState(request, reducedResult, model, solverConfig);
  return assertSolveResultIdentity({ status: "OK", state }, model, solverConfig);
}

/** Create the fixed v0 acid-base adapter; constants cannot be overridden. */
export function createAcidBaseAdapter(): SolverAdapter {
  const model = buildAcidBaseModelDescriptor();
  const solverConfig = buildAcidBaseSolverConfig();
  return freezeSolverAdapter({
    id: ACID_BASE_MODEL_ID,
    version: ACID_BASE_MODEL_VERSION,
    model,
    solverConfig,
    solve: async (request) => solveRequest(request, model, solverConfig),
  });
}
