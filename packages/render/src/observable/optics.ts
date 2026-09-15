import {
  parseFrozenOpticalPathSnapshot,
  parseOpticalProfileSnapshot,
  type FrozenOpticalPathSnapshot,
  type IndicatorChemicalObservation,
  type IndicatorOpticalObservation,
  type IonicStrengthMolal,
  type Kelvin,
  type Litre,
  type OpticalProfileSnapshot,
  type Ph,
} from "@chemrealm/schema";
import referenceData from "./colourimetry-cie-d65-1931-2deg-5nm.json" with { type: "json" };

export interface IndicatorOpticalObservationInput {
  readonly chemical: IndicatorChemicalObservation;
  readonly opticalProfile: OpticalProfileSnapshot | undefined;
  readonly opticalPath: FrozenOpticalPathSnapshot | undefined;
  readonly liquidVolume: Litre;
  readonly temperature: Kelvin;
  readonly ionicStrengthMolal: IonicStrengthMolal;
  readonly modelPh: Ph;
  readonly solvent: string;
  readonly sourceReplayHash: string;
}

interface ColourimetryReference {
  readonly wavelengths: readonly number[];
  readonly d65RelativePower: readonly number[];
  readonly xBar: readonly number[];
  readonly yBar: readonly number[];
  readonly zBar: readonly number[];
  readonly sRgbD65WhitePoint: readonly [number, number, number];
}

const COLOURIMETRY_REFERENCE: ColourimetryReference = Object.freeze({
  wavelengths: Object.freeze([...referenceData.wavelengthNanometres]),
  d65RelativePower: Object.freeze([...referenceData.d65RelativePower]),
  xBar: Object.freeze([...referenceData.cie1931XBar]),
  yBar: Object.freeze([...referenceData.cie1931YBar]),
  zBar: Object.freeze([...referenceData.cie1931ZBar]),
  sRgbD65WhitePoint: Object.freeze([...referenceData.transform.sRgbD65WhitePoint]) as unknown as [
    number,
    number,
    number,
  ],
});

const LN_2 = 0.6931471805599453;
const LN_10 = 2.302585092994046;

function deterministicLn(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError("deterministic logarithm requires a positive finite value");
  }
  let mantissa = value;
  let exponent = 0;
  while (mantissa >= 2) {
    mantissa /= 2;
    exponent += 1;
  }
  while (mantissa < 1) {
    mantissa *= 2;
    exponent -= 1;
  }
  const z = (mantissa - 1) / (mantissa + 1);
  let power = z;
  let sum = z;
  for (let denominator = 3; denominator <= 23; denominator += 2) {
    power *= z * z;
    sum += power / denominator;
  }
  return 2 * sum + exponent * LN_2;
}

function deterministicExp(value: number): number {
  if (!Number.isFinite(value) || value > 709 || value < -745) {
    if (value < -745) return 0;
    throw new RangeError("deterministic exponential argument is outside the optical range");
  }
  const exponent = Math.round(value / LN_2);
  const reduced = value - exponent * LN_2;
  let term = 1;
  let sum = 1;
  for (let index = 1; index <= 24; index += 1) {
    term *= reduced / index;
    sum += term;
  }
  let scale = sum;
  if (exponent >= 0) {
    for (let index = 0; index < exponent; index += 1) scale *= 2;
  } else {
    for (let index = 0; index > exponent; index -= 1) scale /= 2;
  }
  return scale;
}

function deterministicPow(value: number, exponent: number): number {
  if (value === 0) return 0;
  return deterministicExp(exponent * deterministicLn(value));
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function missing(
  indicatorId: string,
  sourceReplayHash: string,
  reason: string,
): IndicatorOpticalObservation {
  return {
    status: "OPTICAL_MODEL_DATA_MISSING",
    indicatorId,
    reason,
    sourceReplayHash,
    missingOrOutOfRange: [reason],
  };
}

function outOfCoverage(
  indicatorId: string,
  sourceReplayHash: string,
  reason: string,
  missingOrOutOfRange: readonly string[] = [reason],
): IndicatorOpticalObservation {
  return {
    status: "OPTICAL_MODEL_OUT_OF_COVERAGE",
    indicatorId,
    reason,
    sourceReplayHash,
    missingOrOutOfRange: [...missingOrOutOfRange],
  };
}

function inRange(value: number, range: { readonly min: number; readonly max: number }): boolean {
  return value >= range.min && value <= range.max;
}

function checkReferenceGrid(profile: OpticalProfileSnapshot): boolean {
  const samples = profile.formSpectra[0]?.samples;
  return samples !== undefined && samples.every(
    (sample, index) => sample.wavelengthNanometres === COLOURIMETRY_REFERENCE.wavelengths[index],
  ) && samples.length === COLOURIMETRY_REFERENCE.wavelengths.length;
}

function interpolateEpsilon(
  samples: readonly { readonly wavelengthNanometres: number; readonly epsilon: number }[],
  wavelengthNanometres: number,
): number {
  const sample = samples.find((entry) => entry.wavelengthNanometres === wavelengthNanometres);
  if (sample === undefined) {
    throw new RangeError("optical profile wavelength grid is outside the checked-in reference grid");
  }
  return sample.epsilon;
}

function linearSrgb(value: number): number {
  const bounded = clamp(value, 0, 1);
  if (bounded <= 0.0031308) return 12.92 * bounded;
  return 1.055 * deterministicPow(bounded, 1 / 2.4) - 0.055;
}

function xyzToSrgb(
  x: number,
  y: number,
  z: number,
): readonly [number, number, number] {
  return [
    clamp(linearSrgb(3.2406 * x - 1.5372 * y - 0.4986 * z), 0, 1),
    clamp(linearSrgb(-0.9689 * x + 1.8758 * y + 0.0415 * z), 0, 1),
    clamp(linearSrgb(0.0557 * x - 0.2040 * y + 1.0570 * z), 0, 1),
  ] as const;
}

function integrate(
  transmittance: readonly number[],
  component: readonly number[],
): number {
  let total = 0;
  for (let index = 0; index < transmittance.length - 1; index += 1) {
    const wavelengthSpan =
      COLOURIMETRY_REFERENCE.wavelengths[index + 1]! -
      COLOURIMETRY_REFERENCE.wavelengths[index]!;
    const first = transmittance[index]! * COLOURIMETRY_REFERENCE.d65RelativePower[index]! * component[index]!;
    const second = transmittance[index + 1]! * COLOURIMETRY_REFERENCE.d65RelativePower[index + 1]! * component[index + 1]!;
    total += ((first + second) / 2) * wavelengthSpan;
  }
  return total;
}

function validateInput(
  input: IndicatorOpticalObservationInput,
  profile: OpticalProfileSnapshot,
  path: FrozenOpticalPathSnapshot,
): IndicatorOpticalObservation | undefined {
  const { chemical, sourceReplayHash } = input;
  if (chemical.sourceReplayHash !== sourceReplayHash) {
    throw new RangeError("chemical and optical observation source identities differ");
  }
  if (chemical.status !== "CHEMICAL_FORMS_OK") {
    return missing(chemical.indicatorId, sourceReplayHash, chemical.reason);
  }
  if (chemical.totalAmount < 0 || input.liquidVolume <= 0) {
    return missing(chemical.indicatorId, sourceReplayHash, "indicator dose or liquid volume is unavailable");
  }
  if (profile.indicatorId !== chemical.indicatorId) {
    return outOfCoverage(chemical.indicatorId, sourceReplayHash, "optical profile indicator identity differs");
  }
  if (profile.reviewStatus !== "quantitative" || profile.formSpectra.length === 0) {
    return missing(chemical.indicatorId, sourceReplayHash, "reviewed quantitative optical profile is unavailable");
  }
  if (input.solvent !== profile.conditions.solvent) {
    return outOfCoverage(chemical.indicatorId, sourceReplayHash, "solvent is outside optical profile coverage");
  }
  if (!inRange(input.temperature, {
    min: profile.conditions.temperature.min.value,
    max: profile.conditions.temperature.max.value,
  })) {
    return outOfCoverage(chemical.indicatorId, sourceReplayHash, "temperature is outside optical profile coverage");
  }
  if (!inRange(input.ionicStrengthMolal.value, {
    min: profile.conditions.ionicStrengthMolal.min.value,
    max: profile.conditions.ionicStrengthMolal.max.value,
  })) {
    return outOfCoverage(chemical.indicatorId, sourceReplayHash, "ionic strength is outside optical profile coverage");
  }
  if (profile.conditions.ph !== undefined && !inRange(input.modelPh.value, profile.conditions.ph)) {
    return outOfCoverage(chemical.indicatorId, sourceReplayHash, "acidity is outside optical profile coverage");
  }
  if (!inRange(input.liquidVolume, {
    min: path.minLiquidVolume.value,
    max: path.maxLiquidVolume.value,
  })) {
    return outOfCoverage(chemical.indicatorId, sourceReplayHash, "liquid volume is outside optical path coverage");
  }
  if (!inRange(path.pathLength.value, {
    min: profile.conditions.pathLength.min.value,
    max: profile.conditions.pathLength.max.value,
  })) {
    return outOfCoverage(chemical.indicatorId, sourceReplayHash, "optical path length is outside profile coverage");
  }
  const concentration = chemical.totalAmount / input.liquidVolume;
  if (!inRange(concentration, {
    min: profile.conditions.concentration.min.value,
    max: profile.conditions.concentration.max.value,
  })) {
    return outOfCoverage(chemical.indicatorId, sourceReplayHash, "indicator concentration is outside optical profile coverage");
  }
  if (!checkReferenceGrid(profile)) {
    return outOfCoverage(chemical.indicatorId, sourceReplayHash, "optical wavelength grid is outside the checked-in colourimetry reference");
  }
  const spectrumByForm = new Map(profile.formSpectra.map((spectrum) => [spectrum.formId, spectrum] as const));
  const absentForm = chemical.forms.find((form) => !spectrumByForm.has(form.formId));
  if (absentForm !== undefined) {
    return outOfCoverage(
      chemical.indicatorId,
      sourceReplayHash,
      `chemical form ${absentForm.formId} is outside optical profile coverage`,
      chemical.forms.filter((form) => !spectrumByForm.has(form.formId)).map((form) => form.formId),
    );
  }
  return undefined;
}

/**
 * Calculate a deterministic, refusal-first optical observation.
 *
 * The input is deliberately wider than a colour mapper: every value that can
 * affect the result is checked against frozen profile/path coverage before a
 * wavelength calculation begins.
 */
export function observeIndicatorOptics(
  input: IndicatorOpticalObservationInput,
): IndicatorOpticalObservation {
  if (input.sourceReplayHash.trim().length === 0) {
    throw new RangeError("optical observation source replay hash cannot be empty");
  }
  const indicatorId = input.chemical.indicatorId;
  if (input.opticalProfile === undefined) {
    return missing(indicatorId, input.sourceReplayHash, "optical profile is unavailable");
  }
  if (input.opticalPath === undefined) {
    return missing(indicatorId, input.sourceReplayHash, "declared optical path is unavailable");
  }
  const profile = parseOpticalProfileSnapshot(input.opticalProfile);
  const path = parseFrozenOpticalPathSnapshot(input.opticalPath);
  const refusal = validateInput(input, profile, path);
  if (refusal !== undefined) return refusal;
  const chemical = input.chemical;
  if (chemical.status !== "CHEMICAL_FORMS_OK") {
    return missing(indicatorId, input.sourceReplayHash, chemical.reason);
  }

  const concentration = chemical.totalAmount / input.liquidVolume;
  const pathLengthCm = path.pathLength.value / 10;
  const transmittance = COLOURIMETRY_REFERENCE.wavelengths.map((wavelength) => {
    const napierianAttenuation = chemical.forms.reduce((total, form) => {
      const spectrum = profile.formSpectra.find((candidate) => candidate.formId === form.formId)!;
      const epsilon = interpolateEpsilon(spectrum.samples, wavelength);
      const napierianEpsilon = spectrum.epsilonConvention === "napierian"
        ? epsilon
        : epsilon * LN_10;
      return total + napierianEpsilon * concentration * form.fraction;
    }, 0) * pathLengthCm;
    return deterministicExp(-napierianAttenuation);
  });
  const blank = COLOURIMETRY_REFERENCE.wavelengths.map(() => 1);
  const blankX = integrate(blank, COLOURIMETRY_REFERENCE.xBar);
  const blankY = integrate(blank, COLOURIMETRY_REFERENCE.yBar);
  const blankZ = integrate(blank, COLOURIMETRY_REFERENCE.zBar);
  const x = integrate(transmittance, COLOURIMETRY_REFERENCE.xBar) / blankX * COLOURIMETRY_REFERENCE.sRgbD65WhitePoint[0];
  const y = integrate(transmittance, COLOURIMETRY_REFERENCE.yBar) / blankY * COLOURIMETRY_REFERENCE.sRgbD65WhitePoint[1];
  const z = integrate(transmittance, COLOURIMETRY_REFERENCE.zBar) / blankZ * COLOURIMETRY_REFERENCE.sRgbD65WhitePoint[2];

  return {
    status: "OPTICAL_MODEL_OK",
    indicatorId,
    tintSrgb: [...xyzToSrgb(x, y, z)] as [number, number, number],
    tintStrength: clamp(1 - y, 0, 1),
    transmittanceSamples: transmittance.map((value, index) => ({
      wavelengthNanometres: COLOURIMETRY_REFERENCE.wavelengths[index]!,
      transmittance: value,
    })),
    profileId: profile.profileId,
    profileHash: profile.profileHash,
    sourceReplayHash: input.sourceReplayHash,
    conditions: {
      solvent: profile.conditions.solvent,
      temperatureKelvin: input.temperature,
      concentrationMolPerLitre: concentration,
      pathLengthMillimetres: path.pathLength.value,
      ionicStrengthMolal: input.ionicStrengthMolal.value,
      modelPh: input.modelPh.value,
      illuminant: profile.illuminant,
      observer: profile.observer,
    },
  };
}
