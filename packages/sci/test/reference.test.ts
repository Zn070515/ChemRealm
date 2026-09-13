import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  kelvin,
  kilogram,
  litre,
  mol,
  thermodynamicConstant,
  type SolveRequest,
} from "@chemrealm/schema";
import {
  createAcidBaseAdapter,
  projectScientificState,
} from "../src/index.js";
import type { ScientificState } from "@chemrealm/schema";

interface ReferenceSolute {
  readonly soluteId: string;
  readonly amountMol: number;
  readonly mode: "fully-dissociated" | "monoprotic-equilibrium";
  readonly ka?: number;
}

interface ReferenceFixture {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly kind: "single";
  readonly description: string;
  readonly derivation: string;
  readonly request: {
    readonly waterMassKg: number;
    readonly liquidVolumeL: number;
    readonly temperatureK: number;
    readonly solutes: readonly ReferenceSolute[];
    readonly indicators: readonly { readonly indicatorId: string; readonly kaIn: number }[];
  };
  readonly expected: {
    readonly modelPh: number;
    readonly ionicStrengthMolal: number;
    readonly speciesMolality: Readonly<Record<string, number>>;
    readonly projection: {
      readonly hydrogenIonMolarity: number;
      readonly taughtHydrogenIonExponent: number;
    };
    readonly indicatorRatios: Readonly<Record<string, number>>;
  };
  readonly comparison?: {
    readonly hendersonHasselbalchApproximationPh: number;
    readonly pHDivergence: number;
    readonly divergenceClaim: string;
  };
  readonly publishedAnchor?: {
    readonly modelPh?: number;
    readonly taughtHydrogenIonExponent?: number;
    readonly tolerance: number;
    readonly source: string;
  };
  readonly tolerance: { readonly absolute: number; readonly chargeResidual: number };
}

interface ReferenceCase {
  readonly caseId: string;
  readonly request: ReferenceFixture["request"];
}

interface AcidExcessCase extends ReferenceCase {
  readonly excessMolality: number;
}

interface BaseExcessCase extends ReferenceCase {
  readonly excessMolality: number;
}

interface HalfEquivalenceCase extends ReferenceCase {
  readonly pKa: number;
}

interface AnalyticReferenceFixture {
  readonly schemaVersion: 1;
  readonly id: "REF-3" | "REF-4" | "REF-8";
  readonly kind: "analytic-acid-excess" | "analytic-base-excess" | "analytic-half-equivalence";
  readonly description: string;
  readonly derivation: string;
  readonly cases: readonly AcidExcessCase[] | readonly BaseExcessCase[] | readonly HalfEquivalenceCase[];
  readonly tolerance: { readonly relation: number; readonly chargeResidual: number };
}

interface ChargeConservationFixture {
  readonly schemaVersion: 1;
  readonly id: "REF-9";
  readonly kind: "charge-conservation-sweep";
  readonly description: string;
  readonly derivation: string;
  readonly cases: readonly ReferenceCase[];
  readonly expectedMaxResidual: number;
  readonly tolerance: { readonly chargeResidual: number };
}

interface ScaleComparisonCase {
  readonly caseId: string;
  readonly inputMolarityMolPerL: number;
  readonly trueRequest: ReferenceFixture["request"];
  readonly molarityAsMolalityRequest: ReferenceFixture["request"];
}

interface ScaleComparisonFixture {
  readonly schemaVersion: 1;
  readonly id: "REF-10";
  readonly kind: "molality-molarity-bound";
  readonly description: string;
  readonly derivation: string;
  readonly cases: readonly ScaleComparisonCase[];
  readonly expectedMaxDifference: number;
  readonly tolerance: { readonly modelPhDifference: number };
}

type ReferenceRecord =
  | ReferenceFixture
  | AnalyticReferenceFixture
  | ChargeConservationFixture
  | ScaleComparisonFixture;

interface ReferenceManifest {
  readonly schemaVersion: 2;
  readonly model: { readonly id: string; readonly version: string };
  readonly derivation: {
    readonly method: string;
    readonly script: string;
    readonly notGeneratedBy: string;
    readonly constants: string;
    readonly basis: "molality";
    readonly waterActivityConvention: "unit";
  };
  readonly fixtures: readonly string[];
  readonly oracleFixtures: readonly string[];
  readonly adversarialFixtures: readonly string[];
}

const referenceUrl = new URL("./reference/", import.meta.url);

function loadJson<T>(name: string): T {
  return JSON.parse(
    readFileSync(new URL(name, referenceUrl), "utf8"),
  ) as T;
}

const manifest = loadJson<ReferenceManifest>("manifest.json");
const fixtures = manifest.fixtures.map((id) => loadJson<ReferenceRecord>(`${id}.json`));

function toSolveRequest(request: ReferenceFixture["request"]): SolveRequest {
  return {
    waterMass: kilogram(request.waterMassKg),
    liquidVolume: litre(request.liquidVolumeL),
    temperature: kelvin(request.temperatureK),
    solutes: request.solutes.map((solute) =>
      solute.mode === "fully-dissociated"
        ? { soluteId: solute.soluteId, amount: mol(solute.amountMol), mode: solute.mode }
        : {
            soluteId: solute.soluteId,
            amount: mol(solute.amountMol),
            mode: solute.mode,
            ka: thermodynamicConstant(solute.ka!),
          },
    ),
    indicators: request.indicators.map((indicator) => ({
      indicatorId: indicator.indicatorId,
      kaIn: thermodynamicConstant(indicator.kaIn),
    })),
  };
}

function speciesBySymbol(state: ScientificState): Readonly<Record<string, number>> {
  return Object.fromEntries(
    state.species.map((species) => [species.symbol, species.molality]),
  );
}

function expectNear(actual: number, expected: number, tolerance: number): void {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance);
}

async function solveSingleCase(
  caseId: string,
  requestData: ReferenceFixture["request"],
): Promise<{ result: Extract<Awaited<ReturnType<ReturnType<typeof createAcidBaseAdapter>["solve"]>>, { status: "OK" }>; request: SolveRequest }> {
  const request = toSolveRequest(requestData);
  const result = await createAcidBaseAdapter().solve(request);
  expect(result.status, `${caseId} status`).toBe("OK");
  if (result.status !== "OK") {
    throw new Error(`${caseId} returned ${result.status}`);
  }
  return { result, request };
}

async function assertSingleFixture(fixture: ReferenceFixture): Promise<void> {
  const { result, request } = await solveSingleCase(fixture.id, fixture.request);

  const expected = fixture.expected;
  const tolerance = fixture.tolerance.absolute;
  expectNear(result.state.modelPh.value, expected.modelPh, tolerance);
  if (fixture.publishedAnchor?.modelPh !== undefined) {
    expectNear(
      result.state.modelPh.value,
      fixture.publishedAnchor.modelPh,
      fixture.publishedAnchor.tolerance,
    );
  }
  expectNear(
    result.state.ionicStrengthMolal.value,
    expected.ionicStrengthMolal,
    tolerance,
  );

  const species = speciesBySymbol(result.state);
  for (const [symbol, expectedValue] of Object.entries(expected.speciesMolality)) {
    expectNear(species[symbol]!, expectedValue, tolerance);
  }

  const projection = projectScientificState(result.state, {
    waterMass: request.waterMass,
    liquidVolume: request.liquidVolume,
  });
  if (fixture.publishedAnchor?.taughtHydrogenIonExponent !== undefined) {
    expectNear(
      projection.taughtHydrogenIonExponent.value,
      fixture.publishedAnchor.taughtHydrogenIonExponent,
      fixture.publishedAnchor.tolerance,
    );
  }
  expectNear(
    projection.hydrogenIonMolarity,
    expected.projection.hydrogenIonMolarity,
    tolerance,
  );
  expectNear(
    projection.taughtHydrogenIonExponent.value,
    expected.projection.taughtHydrogenIonExponent,
    tolerance,
  );

  const ratios = Object.fromEntries(
    result.state.indicators.map((indicator) => [
      indicator.indicatorId,
      indicator.protonationRatio,
    ]),
  );
  expect(Object.keys(ratios)).toHaveLength(Object.keys(expected.indicatorRatios).length);
  for (const [indicatorId, expectedRatio] of Object.entries(expected.indicatorRatios)) {
    expectNear(ratios[indicatorId]!, expectedRatio, tolerance);
  }

  const chargeResidual =
    species["H+"]! + species["Na+"]! -
    species["OH-"]! - species["OAc-"]! - species["Cl-"]!;
  expect(Math.abs(chargeResidual)).toBeLessThan(fixture.tolerance.chargeResidual);
}

async function assertAnalyticFixture(fixture: AnalyticReferenceFixture): Promise<void> {
  for (const referenceCase of fixture.cases) {
    const { result } = await solveSingleCase(referenceCase.caseId, referenceCase.request);
    const hydrogen = result.state.species.find((species) => species.symbol === "H+")!;
    const hydroxide = result.state.species.find((species) => species.symbol === "OH-")!;
    const acetate = result.state.species.find((species) => species.symbol === "OAc-")!;
    if (fixture.kind === "analytic-acid-excess") {
      const excessMolality = (referenceCase as AcidExcessCase).excessMolality;
      expect(result.state.modelPh.value).toBeCloseTo(
        -Math.log10(excessMolality) - Math.log10(hydrogen.activityCoefficient.value),
        9,
      );
    } else if (fixture.kind === "analytic-base-excess") {
      const excessMolality = (referenceCase as BaseExcessCase).excessMolality;
      expect(result.state.modelPh.value).toBeCloseTo(
        14 + Math.log10(excessMolality) + Math.log10(hydroxide.activityCoefficient.value),
        9,
      );
    } else {
      expect(result.state.modelPh.value).toBeCloseTo(
        (referenceCase as HalfEquivalenceCase).pKa +
          Math.log10(acetate.activityCoefficient.value),
        3,
      );
    }
    expect(Math.abs(
      hydrogen.molality +
        result.state.species.find((species) => species.symbol === "Na+")!.molality -
        hydroxide.molality -
        acetate.molality -
        result.state.species.find((species) => species.symbol === "Cl-")!.molality,
    )).toBeLessThan(fixture.tolerance.chargeResidual);
  }
}

async function assertChargeConservationFixture(fixture: ChargeConservationFixture): Promise<void> {
  let maximum = 0;
  for (const referenceCase of fixture.cases) {
    const { result } = await solveSingleCase(referenceCase.caseId, referenceCase.request);
    const species = speciesBySymbol(result.state);
    const residual = species["H+"]! + species["Na+"]! -
      species["OH-"]! - species["OAc-"]! - species["Cl-"]!;
    maximum = Math.max(maximum, Math.abs(residual));
  }
  expect(maximum).toBeLessThanOrEqual(fixture.expectedMaxResidual);
}

async function assertScaleComparisonFixture(fixture: ScaleComparisonFixture): Promise<void> {
  let maximum = 0;
  for (const referenceCase of fixture.cases) {
    const trueResult = await solveSingleCase(`${referenceCase.caseId}:true`, referenceCase.trueRequest);
    const wrongResult = await solveSingleCase(`${referenceCase.caseId}:molarity-as-molality`, referenceCase.molarityAsMolalityRequest);
    maximum = Math.max(
      maximum,
      Math.abs(trueResult.result.state.modelPh.value - wrongResult.result.state.modelPh.value),
    );
  }
  expect(maximum).toBeLessThanOrEqual(fixture.expectedMaxDifference);
  expect(fixture.cases.every((referenceCase) => referenceCase.inputMolarityMolPerL > 0)).toBe(true);
}

describe("independent M4 reference fixtures", () => {
  it("has a complete, independently-derived REF-1…REF-10 manifest", () => {
    expect(manifest.schemaVersion).toBe(2);
    expect(manifest.derivation.notGeneratedBy).toBe("packages/sci");
    expect(manifest.derivation.basis).toBe("molality");
    expect(fixtures).toHaveLength(10);
    expect(new Set(fixtures.map((fixture) => fixture.id)).size).toBe(10);
    expect(fixtures.every((fixture) => fixture.derivation.length > 0)).toBe(true);
    expect(manifest.oracleFixtures).toEqual(
      Array.from({ length: 10 }, (_, index) => `ORACLE-${index + 1}`),
    );
    expect(manifest.adversarialFixtures).toContain("ADVERSARIAL-HOAC-DILUTE");
    expect(fixtures.every((fixture) => fixture.id.startsWith("REF-"))).toBe(true);
  });

  it.each(fixtures)("matches $id without changing the checked-in expected values", async (fixture) => {
    if (fixture.kind === "single") await assertSingleFixture(fixture);
    else if (fixture.kind === "charge-conservation-sweep") await assertChargeConservationFixture(fixture);
    else if (fixture.kind === "molality-molarity-bound") await assertScaleComparisonFixture(fixture);
    else await assertAnalyticFixture(fixture);
  });

  it("does not regenerate or silently accept a tampered expected value", async () => {
    const fixture = fixtures.find((candidate): candidate is ReferenceFixture => candidate.kind === "single" && candidate.id === "REF-1")!;
    const tampered = {
      ...fixture,
      expected: { ...fixture.expected, modelPh: fixture.expected.modelPh + 0.1 },
    };
    await expect(
      (async () => {
        const result = await createAcidBaseAdapter().solve(toSolveRequest(tampered.request));
        if (result.status !== "OK") throw new Error(`unexpected ${result.status}`);
        expectNear(result.state.modelPh.value, tampered.expected.modelPh, tampered.tolerance.absolute);
      })(),
    ).rejects.toThrow();
  });

  it("records and reproduces the dilute weak-acid Henderson–Hasselbalch divergence independently", async () => {
    const dilute = loadJson<ReferenceFixture>("ADVERSARIAL-HOAC-DILUTE.json");
    await assertSingleFixture(dilute);
    expect(dilute.comparison?.divergenceClaim).toBe("approximately 0.65 pH");
    expect(dilute.comparison?.pHDivergence).toBeGreaterThan(0.6);
    expect(dilute.expected.modelPh).not.toBeCloseTo(
      dilute.comparison!.hendersonHasselbalchApproximationPh,
      1,
    );
  });
});
