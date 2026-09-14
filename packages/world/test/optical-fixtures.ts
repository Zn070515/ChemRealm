import {
  INDICATOR_OPTICAL_PROFILE_VERSION,
  OPTICAL_PATH_VERSION,
  opticalPathHash,
  opticalProfileHash,
  type ScenarioSnapshot as SerializedScenarioSnapshot,
} from "@chemrealm/schema";

import {
  scenarioSnapshotHash,
  type SerializedWorldCreated,
} from "../src/state.js";
import { WORLD_CREATED } from "./fixtures.js";

function qualitativeOpticalProfile(indicatorId: string) {
  const payload = {
    profileId: `${indicatorId}-qualitative-profile`,
    profileVersion: INDICATOR_OPTICAL_PROFILE_VERSION,
    indicatorId,
    representation: "spectral-molar-absorptivity" as const,
    formSpectra: [],
    conditions: {
      solvent: "water",
      temperature: {
        min: { value: 298.15, unit: "K" as const },
        max: { value: 298.15, unit: "K" as const },
      },
      concentration: {
        min: { value: 0, unit: "mol/L" as const },
        max: { value: 1e-3, unit: "mol/L" as const },
      },
      pathLength: {
        min: { value: 1, unit: "mm" as const },
        max: { value: 10, unit: "mm" as const },
      },
      ionicStrengthMolal: {
        min: { value: 0, unit: "mol/kg" as const },
        max: { value: 0.5, unit: "mol/kg" as const },
      },
    },
    illuminant: "D65" as const,
    observer: "CIE-1931-2deg" as const,
    transform: "qualitative-reference" as const,
    provenance: {
      source: "World runtime optical fixture",
      reference: "https://example.com/chemrealm/optical-fixture",
      category: "pedagogicalApproximation" as const,
    },
    source: {
      citation: "World runtime optical fixture",
      sourceUrl: "https://example.com/chemrealm/optical-fixture",
      accessedOn: "2026-09-14",
      licenseOrPermission: "permission-recorded" as const,
      extractionMethod: "digitized" as const,
      rawDataLocation: "fixture/qualitative",
      reportedPrecision: "qualitative only",
      conditions: {
        solvent: "water",
        temperature: "298.15 K",
        concentration: "qualitative",
        pathLength: "1 mm",
        acidityOrIonicStrength: "not stated",
      },
    },
    reviewStatus: "qualitative-only" as const,
  };
  return { ...payload, profileHash: opticalProfileHash(payload) };
}

function opticalPath(maxVolume = 0.25) {
  const payload = {
    pathRuleId: "flask-fixed-path",
    pathRuleVersion: OPTICAL_PATH_VERSION,
    representation: "fixed-path" as const,
    pathLength: { value: 10, unit: "mm" as const },
    minLiquidVolume: { value: 0, unit: "L" as const },
    maxLiquidVolume: { value: maxVolume, unit: "L" as const },
    provenance: {
      source: "World runtime optical path fixture",
      reference: "https://example.com/chemrealm/optical-path",
      category: "pedagogicalApproximation" as const,
    },
  };
  return { ...payload, pathRuleHash: opticalPathHash(payload) };
}

export function opticalWorldCreated(totalAmount = 5e-7): SerializedWorldCreated {
  const event = structuredClone(WORLD_CREATED) as unknown as Record<string, unknown>;
  const payload = event.payload as Record<string, unknown>;
  const snapshot = payload.scenarioSnapshot as Record<string, unknown>;
  const vessels = snapshot.vessels as Array<Record<string, unknown>>;
  snapshot.indicatorOpticalInputs = [{
    indicatorId: "phenolphthalein",
    initialVesselId: "flask",
    totalAmount: { value: totalAmount, unit: "mol" },
    opticalProfile: qualitativeOpticalProfile("phenolphthalein"),
    provenance: {
      source: "World runtime indicator dose fixture",
      reference: "https://example.com/chemrealm/indicator-dose",
      category: "pedagogicalApproximation",
    },
  }];
  vessels[0]!.opticalPath = opticalPath();
  payload.contentHash = scenarioSnapshotHash(
    snapshot as unknown as SerializedScenarioSnapshot,
  );
  return event as unknown as SerializedWorldCreated;
}
