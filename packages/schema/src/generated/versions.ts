/** GENERATED FILE — edit contracts/version-manifest.json instead. */
const deepFreeze = <T>(value: T): T => {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) {
      deepFreeze(child);
    }
  }
  return value;
};

export const VERSION_MANIFEST = deepFreeze({
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "manifestVersion": 1,
  "project": {
    "packageVersion": "0.0.0",
    "nativePackageVersion": "0.1.0",
    "pythonPackageVersion": "0.0.0"
  },
  "toolchains": {
    "node": "22",
    "pnpm": "11.22.0",
    "python": "3.12",
    "rust": "1.97.1"
  },
  "schema": {
    "world": 5,
    "scenario": 5,
    "command": 1,
    "exportFormat": 1,
    "scientific": 6,
    "scientificExpression": 4,
    "nativeBridge": 1
  },
  "spec": {
    "currentRevision": 30,
    "acceptedThroughRevision": 25,
    "m5AmendmentRevisions": [
      21,
      22,
      23,
      24,
      25
    ],
    "acceptedAmendmentRevisions": [
      27,
      28,
      29,
      30
    ],
    "m5ContractRevision": 25
  },
  "representation": {
    "observableModel": 2,
    "volumeProfile": "1.0.0",
    "indicatorOpticalProfile": "2.0.0",
    "opticalPath": "1.0.0",
    "apparatusAsset": "1.0.0"
  },
  "content": {
    "current": 1
  },
  "scientific": {
    "numericPolicyVersion": 1,
    "acidBase": {
      "id": "acidbase-monoprotic-davies",
      "legacyVersion": "1.0.0",
      "nativeVersion": "2.0.0",
      "expressionProducerVersion": "3.0.0"
    },
    "indicatorMultiform": {
      "id": "acidbase-phenolphthalein-diprotic-davies",
      "version": "1.0.0"
    }
  },
  "fixtures": {
    "testSolverVersion": "1.0.0",
    "testModelVersion": "1.0.0"
  },
  "oracle": {
    "phreeqc": "3.8.6-17100",
    "referenceManifest": 2,
    "referenceFixture": 1,
    "crossCheckReport": 2,
    "constantsProvenance": 1,
    "v0Inputs": 2,
    "envelopeReference": 1
  }
} as const);

export const TEST_SOLVER_VERSION = VERSION_MANIFEST.fixtures.testSolverVersion;
export const TEST_MODEL_VERSION = VERSION_MANIFEST.fixtures.testModelVersion;
export const VOLUME_PROFILE_VERSION = VERSION_MANIFEST.representation.volumeProfile;
export const INDICATOR_OPTICAL_PROFILE_VERSION = VERSION_MANIFEST.representation.indicatorOpticalProfile;
export const OPTICAL_PATH_VERSION = VERSION_MANIFEST.representation.opticalPath;
export const SCENARIO_CONTENT_VERSION = VERSION_MANIFEST.content.current;
