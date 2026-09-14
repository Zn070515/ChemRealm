import {
  activity,
  activityCoefficient,
  ionicStrengthMolal,
  mol,
  molPerKilogram,
  ph,
  reducedIonicStrength,
  reducedMolality,
  TEST_MODEL_VERSION,
  type ScientificState,
} from "@chemrealm/schema";

export function scientificState(): ScientificState {
  return {
    species: [
      {
        symbol: "H+",
        reducedMolality: reducedMolality(0.01),
        molality: molPerKilogram(0.01),
        amount: mol(0.005),
        activityCoefficient: activityCoefficient(0.8),
        activity: activity(0.008),
      },
      {
        symbol: "Cl-",
        reducedMolality: reducedMolality(0.01),
        molality: molPerKilogram(0.01),
        amount: mol(0.005),
        activityCoefficient: activityCoefficient(0.8),
        activity: activity(0.008),
      },
    ],
    ionicStrengthMolal: ionicStrengthMolal(0.01),
    ionicStrengthReduced: reducedIonicStrength(0.01),
    modelPh: ph(2.0969),
    indicators: [{ indicatorId: "phenolphthalein", protonationRatio: 0.5 }],
    indicatorObservations: [{
      status: "CHEMICAL_FORMS_UNAVAILABLE",
      indicatorId: "phenolphthalein",
      totalAmount: mol(5e-7),
      reason: "the test model does not resolve indicator chemical forms",
      modelId: "acidbase-monoprotic-davies",
      modelVersion: TEST_MODEL_VERSION,
      sourceReplayHash: "state-hash",
    }],
    validity: {
      inDomain: true,
      withinProposedAccuracyEnvelope: true,
    },
    provenance: {
      modelId: "acidbase-monoprotic-davies",
      modelVersion: TEST_MODEL_VERSION,
      activityModel: "Davies",
      category: "calculated",
      parameters: { Kw: 1e-14 },
    },
  };
}
