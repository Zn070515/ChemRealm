import {
  activity,
  activityCoefficient,
  ionicStrengthMolal,
  mol,
  molPerKilogram,
  ph,
  reducedIonicStrength,
  reducedMolality,
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
    validity: {
      inDomain: true,
      withinProposedAccuracyEnvelope: true,
    },
    provenance: {
      modelId: "acidbase-monoprotic-davies",
      modelVersion: "1.0.0",
      activityModel: "Davies",
      category: "calculated",
      parameters: { Kw: 1e-14 },
    },
  };
}
