import {
  activityCoefficient,
  type ActivityCoefficient,
  type ReducedIonicStrength,
} from "@chemrealm/schema";
import { detExp10 } from "../deterministic-math.js";
import type { AcidBaseConstants } from "./model.js";

export interface DaviesActivities {
  readonly hydrogen: ActivityCoefficient;
  readonly hydroxide: ActivityCoefficient;
  readonly monovalentAnion: ActivityCoefficient;
  readonly neutralAcid: ActivityCoefficient;
}

function requireFiniteNonNegative(value: number, name: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name}: expected a finite non-negative value`);
  }
}

/** Return the v0 Davies coefficients at a reduced ionic strength. */
export function daviesActivities(
  ionicStrength: ReducedIonicStrength,
  constants: AcidBaseConstants,
): DaviesActivities {
  requireFiniteNonNegative(ionicStrength.value, "reduced ionic strength");
  requireFiniteNonNegative(constants.daviesA, "Davies A");
  requireFiniteNonNegative(constants.daviesB, "Davies b");
  if (!(constants.standardMolality > 0) || !Number.isFinite(constants.standardMolality)) {
    throw new RangeError("standard molality must be finite and positive");
  }

  const squareRootIonicStrength = Math.sqrt(ionicStrength.value);
  const daviesTerm =
    squareRootIonicStrength / (1 + squareRootIonicStrength) -
    constants.daviesB * ionicStrength.value;
  const log10Gamma = -constants.daviesA * daviesTerm;
  const monovalent = activityCoefficient(detExp10(log10Gamma));
  const neutralAcid = activityCoefficient(
    constants.neutralAcidActivityCoefficient.value,
  );

  return Object.freeze({
    hydrogen: monovalent,
    hydroxide: monovalent,
    monovalentAnion: monovalent,
    neutralAcid,
  });
}
