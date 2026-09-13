import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  kelvin,
  kilogram,
  litre,
  mol,
  thermodynamicConstant,
  VERSION_MANIFEST,
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
  readonly schemaVersion: typeof VERSION_MANIFEST.oracle.referenceFixture;
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
  readonly schemaVersion: typeof VERSION_MANIFEST.oracle.referenceFixture;
  readonly id: "REF-3" | "REF-4" | "REF-8";
  readonly kind: "analytic-acid-excess" | "analytic-base-excess" | "analytic-half-equivalence";
  readonly description: string;
  readonly derivation: string;
  readonly cases: readonly AcidExcessCase[] | readonly BaseExcessCase[] | readonly HalfEquivalenceCase[];
  readonly tolerance: { readonly relation: number; readonly chargeResidual: number };
}

interface ChargeConservationFixture {
  readonly schemaVersion: typeof VERSION_MANIFEST.oracle.referenceFixture;
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
  readonly schemaVersion: typeof VERSION_MANIFEST.oracle.referenceFixture;
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
  readonly schemaVersion: typeof VERSION_MANIFEST.oracle.referenceManifest;
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

function requestSignature(request: ReferenceFixture["request"]): unknown {
  return {
    waterMassKg: request.waterMassKg,
    liquidVolumeL: request.liquidVolumeL,
    temperatureK: request.temperatureK,
    solutes: [...request.solutes]
      .sort((left, right) => left.soluteId.localeCompare(right.soluteId))
      .map((solute) => ({
        soluteId: solute.soluteId,
        amountMol: solute.amountMol,
        mode: solute.mode,
        ...(solute.ka === undefined ? {} : { ka: solute.ka }),
      })),
    indicators: [...request.indicators]
      .sort((left, right) => left.indicatorId.localeCompare(right.indicatorId)),
  };
}

function componentAmounts(request: ReferenceFixture["request"]): Readonly<Record<string, number>> {
  return Object.fromEntries(
    [...request.solutes]
      .sort((left, right) => left.soluteId.localeCompare(right.soluteId))
      .map((solute) => [solute.soluteId, solute.amountMol]),
  );
}

function fixtureById(id: string): ReferenceRecord {
  const fixture = fixtures.find((candidate) => candidate.id === id);
  if (fixture === undefined) throw new Error(`missing canonical fixture ${id}`);
  return fixture;
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
      sourceStateHash: `reference-${fixture.id}`,
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
    expect(manifest.schemaVersion).toBe(VERSION_MANIFEST.oracle.referenceManifest);
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
    expect(manifest.oracleFixtures.every((id) => id.startsWith("ORACLE-"))).toBe(true);
    expect(manifest.fixtures.filter((id) => manifest.oracleFixtures.includes(id))).toEqual([]);
    const fixtureFiles = readdirSync(fileURLToPath(referenceUrl))
      .filter((name) => name.endsWith(".json") && name !== "manifest.json")
      .map((name) => name.slice(0, -5))
      .sort();
    expect(fixtureFiles).toEqual(
      [...manifest.fixtures, ...manifest.oracleFixtures, ...manifest.adversarialFixtures].sort(),
    );
  });

  it("binds canonical REF identifiers to the accepted SPEC semantics", () => {
    const ref1 = fixtureById("REF-1");
    const ref2 = fixtureById("REF-2");
    expect(ref1.kind).toBe("single");
    expect(ref2.kind).toBe("single");
    expect(requestSignature((ref1 as ReferenceFixture).request)).toEqual({
      waterMassKg: 1,
      liquidVolumeL: 1,
      temperatureK: 298.15,
      solutes: [
        { soluteId: "HOAc", amountMol: 0.1, mode: "monoprotic-equilibrium", ka: 1.7539e-5 },
        { soluteId: "NaOAc", amountMol: 0.1, mode: "fully-dissociated" },
      ],
      indicators: [],
    });
    expect(requestSignature((ref2 as ReferenceFixture).request)).toEqual({
      waterMassKg: 1,
      liquidVolumeL: 1,
      temperatureK: 298.15,
      solutes: [
        { soluteId: "HOAc", amountMol: 0.01, mode: "monoprotic-equilibrium", ka: 1.7539e-5 },
        { soluteId: "NaOAc", amountMol: 0.01, mode: "fully-dissociated" },
      ],
      indicators: [],
    });
    expect((ref1 as ReferenceFixture).publishedAnchor?.modelPh).toBe(4.644);
    expect((ref2 as ReferenceFixture).publishedAnchor?.modelPh).toBe(4.713);

    const ref3 = fixtureById("REF-3") as AnalyticReferenceFixture;
    expect(ref3.kind).toBe("analytic-acid-excess");
    expect(ref3.cases.map((referenceCase) => [
      referenceCase.caseId,
      (referenceCase as AcidExcessCase).excessMolality,
      componentAmounts(referenceCase.request),
    ])).toEqual([
      ["REF-3-f0.0", 0.1, { HCl: 0.1, NaOH: 0 }],
      ["REF-3-f0.5", 0.05, { HCl: 0.1, NaOH: 0.05 }],
      ["REF-3-f0.9", 0.01, { HCl: 0.1, NaOH: 0.09 }],
    ]);

    const ref4 = fixtureById("REF-4") as AnalyticReferenceFixture;
    expect(ref4.kind).toBe("analytic-base-excess");
    expect(ref4.cases.map((referenceCase) => [
      referenceCase.caseId,
      (referenceCase as BaseExcessCase).excessMolality,
      componentAmounts(referenceCase.request),
    ])).toEqual([
      ["REF-4-f1.1", 0.01, { HCl: 0.1, NaOH: 0.11 }],
      ["REF-4-f1.5", 0.05, { HCl: 0.1, NaOH: 0.15 }],
    ]);

    const ref5 = fixtureById("REF-5") as ReferenceFixture;
    const ref6 = fixtureById("REF-6") as ReferenceFixture;
    expect(requestSignature(ref5.request)).toEqual(requestSignature(ref6.request));
    expect(componentAmounts(ref5.request)).toEqual({ HCl: 0.1 });
    expect(ref5.publishedAnchor?.taughtHydrogenIonExponent).toBe(1);
    expect(ref6.publishedAnchor?.modelPh).toBe(1.1064);

    const ref7 = fixtureById("REF-7") as ReferenceFixture;
    expect(componentAmounts(ref7.request)).toEqual({ HCl: 1e-8 });
    expect(ref7.publishedAnchor?.modelPh).toBe(6.978);

    const ref8 = fixtureById("REF-8") as AnalyticReferenceFixture;
    expect(ref8.kind).toBe("analytic-half-equivalence");
    expect(ref8.cases.map((referenceCase) => [
      referenceCase.caseId,
      (referenceCase as HalfEquivalenceCase).pKa,
      componentAmounts(referenceCase.request),
    ])).toEqual([
      ["REF-8-half-equivalence", 4.756, { HOAc: 0.1, NaOH: 0.05 }],
    ]);

    const ref9 = fixtureById("REF-9") as ChargeConservationFixture;
    expect(ref9.kind).toBe("charge-conservation-sweep");
    expect(ref9.cases.map((referenceCase) => referenceCase.caseId)).toEqual([
      "REF-9-strong-acid",
      "REF-9-acid-half-neutralized",
      "REF-9-acid-near-equivalence",
      "REF-9-base-near-equivalence",
      "REF-9-strong-base",
      "REF-9-weak-acid",
      "REF-9-buffer",
      "REF-9-equivalence",
      "REF-9-post-equivalence",
      "REF-9-sodium-acetate",
    ]);
    expect(componentAmounts(ref9.cases.find((referenceCase) => referenceCase.caseId === "REF-9-post-equivalence")!.request)).toEqual({
      HOAc: 0.1,
      NaOH: 0.14,
    });
    expect(componentAmounts(ref9.cases.find((referenceCase) => referenceCase.caseId === "REF-9-strong-base")!.request)).toEqual({
      NaOH: 0.15,
    });

    const ref10 = fixtureById("REF-10") as ScaleComparisonFixture;
    expect(ref10.kind).toBe("molality-molarity-bound");
    expect(ref10.cases.map((referenceCase) => referenceCase.inputMolarityMolPerL)).toEqual([
      0.001,
      0.01,
      0.05,
      0.1,
      0.12,
    ]);
    expect(ref10.expectedMaxDifference).toBe(0.001);
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
