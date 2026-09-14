import { beforeAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  kelvin,
  kilogram,
  litre,
  mol,
  thermodynamicConstant,
  VERSION_MANIFEST,
  type ScientificState,
  type SolveRequest,
} from "@chemrealm/schema";
import {
  createNativeJsonAdapter,
  loadNativeWasmExecutor,
  type NativeExpressionSolverAdapter,
} from "./native-backend.js";
import { projectScientificState } from "./projection.js";

interface ReferenceSolute {
  readonly soluteId: string;
  readonly amountMol: number;
  readonly mode: "fully-dissociated" | "monoprotic-equilibrium";
  readonly ka?: number;
}

interface ReferenceRequest {
  readonly waterMassKg: number;
  readonly liquidVolumeL: number;
  readonly temperatureK: number;
  readonly solutes: readonly ReferenceSolute[];
  readonly indicators: readonly { readonly indicatorId: string; readonly kaIn: number }[];
}

interface SingleFixture {
  readonly id: string;
  readonly kind: "single";
  readonly request: ReferenceRequest;
  readonly expected: {
    readonly modelPh: number;
    readonly ionicStrengthMolal: number;
    readonly speciesMolality: Readonly<Record<string, number>>;
    readonly projection: {
      readonly hydrogenIonMolarity: number;
      readonly taughtHydrogenIonExponent: number;
    };
  };
  readonly publishedAnchor?: {
    readonly modelPh?: number;
    readonly taughtHydrogenIonExponent?: number;
    readonly tolerance: number;
  };
  readonly tolerance: { readonly absolute: number; readonly chargeResidual: number };
}

interface ChildCase {
  readonly caseId: string;
  readonly request: ReferenceRequest;
}

interface AnalyticFixture {
  readonly id: "REF-3" | "REF-4" | "REF-8";
  readonly kind: "analytic-acid-excess" | "analytic-base-excess" | "analytic-half-equivalence";
  readonly cases: readonly (ChildCase & { readonly excessMolality?: number; readonly pKa?: number })[];
  readonly tolerance: { readonly relation: number; readonly chargeResidual: number };
}

interface ChargeFixture {
  readonly id: "REF-9";
  readonly kind: "charge-conservation-sweep";
  readonly cases: readonly ChildCase[];
  readonly expectedMaxResidual: number;
}

interface ScaleFixture {
  readonly id: "REF-10";
  readonly kind: "molality-molarity-bound";
  readonly cases: readonly (ChildCase & {
    readonly trueRequest: ReferenceRequest;
    readonly molarityAsMolalityRequest: ReferenceRequest;
  })[];
  readonly expectedMaxDifference: number;
}

type Fixture = SingleFixture | AnalyticFixture | ChargeFixture | ScaleFixture;

const referenceUrl = new URL("../test/reference/", import.meta.url);

function loadFixture<T extends Fixture>(id: string): T {
  return JSON.parse(
    readFileSync(new URL(`${id}.json`, referenceUrl), "utf8"),
  ) as T;
}

function toRequest(request: ReferenceRequest): SolveRequest {
  return {
    waterMass: kilogram(request.waterMassKg),
    liquidVolume: litre(request.liquidVolumeL),
    temperature: kelvin(request.temperatureK),
    solutes: request.solutes.map((solute) => solute.mode === "fully-dissociated"
      ? {
          soluteId: solute.soluteId,
          amount: mol(solute.amountMol),
          mode: solute.mode,
        }
      : {
          soluteId: solute.soluteId,
          amount: mol(solute.amountMol),
          mode: solute.mode,
          ka: thermodynamicConstant(solute.ka!),
        }),
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

async function solveOk(
  adapter: NativeExpressionSolverAdapter,
  caseId: string,
  requestData: ReferenceRequest,
): Promise<{ readonly request: SolveRequest; readonly state: ScientificState }> {
  const request = toRequest(requestData);
  const result = await adapter.solve(request);
  expect(result.status, `${caseId} status`).toBe("OK");
  if (result.status !== "OK") throw new Error(`${caseId} returned ${result.status}`);
  return { request, state: result.state };
}

function assertCharge(state: ScientificState, tolerance: number): void {
  const species = speciesBySymbol(state);
  const residual = species["H+"]! + species["Na+"]! -
    species["OH-"]! - species["OAc-"]! - species["Cl-"]!;
  expect(Math.abs(residual)).toBeLessThanOrEqual(tolerance);
}

describe("native WASM canonical reference matrix", () => {
  let adapter: NativeExpressionSolverAdapter;

  beforeAll(async () => {
    const bytes = await readFileSync(
      new URL("../dist/wasm/chemrealm_sci_core.wasm", import.meta.url),
    );
    const arrayBuffer = bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength,
    ) as ArrayBuffer;
    adapter = createNativeJsonAdapter(await loadNativeWasmExecutor(arrayBuffer));
  });

  it.each(["REF-1", "REF-2", "REF-5", "REF-6", "REF-7"])(
    "%s matches its independent expected state",
    async (id) => {
      const fixture = loadFixture<SingleFixture>(id);
      const { request, state } = await solveOk(adapter, id, fixture.request);
      expectNear(state.modelPh.value, fixture.expected.modelPh, fixture.tolerance.absolute);
      expectNear(
        state.ionicStrengthMolal.value,
        fixture.expected.ionicStrengthMolal,
        fixture.tolerance.absolute,
      );
      const species = speciesBySymbol(state);
      for (const [symbol, expected] of Object.entries(fixture.expected.speciesMolality)) {
        expectNear(species[symbol]!, expected, fixture.tolerance.absolute);
      }
      const projection = projectScientificState(state, {
        sourceStateHash: `native-reference-${id}`,
        liquidVolume: request.liquidVolume,
      });
      expectNear(
        projection.hydrogenIonMolarity,
        fixture.expected.projection.hydrogenIonMolarity,
        fixture.tolerance.absolute,
      );
      expectNear(
        projection.taughtHydrogenIonExponent.value,
        fixture.expected.projection.taughtHydrogenIonExponent,
        fixture.tolerance.absolute,
      );
      if (fixture.publishedAnchor?.modelPh !== undefined) {
        expectNear(state.modelPh.value, fixture.publishedAnchor.modelPh, fixture.publishedAnchor.tolerance);
      }
      if (fixture.publishedAnchor?.taughtHydrogenIonExponent !== undefined) {
        expectNear(
          projection.taughtHydrogenIonExponent.value,
          fixture.publishedAnchor.taughtHydrogenIonExponent,
          fixture.publishedAnchor.tolerance,
        );
      }
      assertCharge(state, fixture.tolerance.chargeResidual);
    },
  );

  it("matches the REF-3, REF-4, and REF-8 analytic identities", async () => {
    const fixtures = [
      loadFixture<AnalyticFixture>("REF-3"),
      loadFixture<AnalyticFixture>("REF-4"),
      loadFixture<AnalyticFixture>("REF-8"),
    ];
    for (const fixture of fixtures) {
      for (const referenceCase of fixture.cases) {
        const { state } = await solveOk(adapter, referenceCase.caseId, referenceCase.request);
        const hydrogen = state.species.find((species) => species.symbol === "H+")!;
        const hydroxide = state.species.find((species) => species.symbol === "OH-")!;
        const acetate = state.species.find((species) => species.symbol === "OAc-")!;
        if (fixture.kind === "analytic-acid-excess") {
          expect(state.modelPh.value).toBeCloseTo(
            -(Math.log10(referenceCase.excessMolality!) +
              Math.log10(hydrogen.activityCoefficient.value)),
            9,
          );
        } else if (fixture.kind === "analytic-base-excess") {
          expect(state.modelPh.value).toBeCloseTo(
            14 + Math.log10(referenceCase.excessMolality!) +
              Math.log10(hydroxide.activityCoefficient.value),
            9,
          );
        } else {
          expect(state.modelPh.value).toBeCloseTo(
            referenceCase.pKa! + Math.log10(acetate.activityCoefficient.value),
            3,
          );
        }
        assertCharge(state, fixture.tolerance.chargeResidual);
      }
    }
  });

  it("preserves the REF-9 charge invariant across every regime", async () => {
    const fixture = loadFixture<ChargeFixture>("REF-9");
    let maximum = 0;
    for (const referenceCase of fixture.cases) {
      const { state } = await solveOk(adapter, referenceCase.caseId, referenceCase.request);
      const species = speciesBySymbol(state);
      const residual = species["H+"]! + species["Na+"]! -
        species["OH-"]! - species["OAc-"]! - species["Cl-"]!;
      maximum = Math.max(maximum, Math.abs(residual));
    }
    expect(maximum).toBeLessThanOrEqual(fixture.expectedMaxResidual);
  });

  it("preserves the REF-10 molality-versus-molarity bound", async () => {
    const fixture = loadFixture<ScaleFixture>("REF-10");
    let maximum = 0;
    for (const referenceCase of fixture.cases) {
      const trueResult = await solveOk(adapter, `${referenceCase.caseId}:true`, referenceCase.trueRequest);
      const wrongResult = await solveOk(adapter, `${referenceCase.caseId}:molarity-as-molality`, referenceCase.molarityAsMolalityRequest);
      maximum = Math.max(
        maximum,
        Math.abs(trueResult.state.modelPh.value - wrongResult.state.modelPh.value),
      );
    }
    expect(maximum).toBeLessThanOrEqual(fixture.expectedMaxDifference);
  });

  it("emits the complete Scientific Core equation set for every solved canonical REF input", async () => {
    const manifest = JSON.parse(
      readFileSync(new URL("manifest.json", referenceUrl), "utf8"),
    ) as { readonly fixtures: readonly string[] };
    const requests: { readonly id: string; readonly request: ReferenceRequest }[] = [];
    for (const id of manifest.fixtures) {
      const fixture = loadFixture<Fixture>(id);
      if (fixture.kind === "single") {
        requests.push({ id, request: fixture.request });
      } else if (fixture.kind === "molality-molarity-bound") {
        for (const referenceCase of fixture.cases) {
          requests.push({ id: `${referenceCase.caseId}:true`, request: referenceCase.trueRequest });
          requests.push({ id: `${referenceCase.caseId}:molarity-as-molality`, request: referenceCase.molarityAsMolalityRequest });
        }
      } else {
        for (const referenceCase of fixture.cases) {
          requests.push({ id: referenceCase.caseId, request: referenceCase.request });
        }
      }
    }
    const required: readonly string[] = [
      "charge-balance",
      "water-autoprotolysis",
      "ionic-strength-fixed-point",
      "davies-activity-coefficient",
      "activity-definition",
    ];
    for (const referenceCase of requests) {
      const request = toRequest(referenceCase.request);
      const execution = await adapter.solveWithScientificArtifacts(request, {
        sourceStateHash: `native-reference-${referenceCase.id}`,
      });
      expect(execution.result.status, `${referenceCase.id} status`).toBe("OK");
      const equationIds = new Set<string>(execution.expressions.map((expression) => expression.equationId));
      expect([...required].every((equationId) => equationIds.has(equationId))).toBe(true);
      expect(execution.expressions.every((expression) =>
        expression.producerId === "scientific-core" &&
        expression.modelId === VERSION_MANIFEST.scientific.acidBase.id &&
        expression.modelVersion === VERSION_MANIFEST.scientific.acidBase.nativeVersion &&
        expression.sourceStateHash === `native-reference-${referenceCase.id}`
      )).toBe(true);
    }
  });
});
