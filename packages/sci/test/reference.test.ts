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
  readonly tolerance: { readonly absolute: number; readonly chargeResidual: number };
}

interface ReferenceManifest {
  readonly schemaVersion: 1;
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
}

const referenceUrl = new URL("./reference/", import.meta.url);

function loadJson<T>(name: string): T {
  return JSON.parse(
    readFileSync(new URL(name, referenceUrl), "utf8"),
  ) as T;
}

const manifest = loadJson<ReferenceManifest>("manifest.json");
const fixtures = manifest.fixtures.map((id) => loadJson<ReferenceFixture>(`${id}.json`));

function toSolveRequest(fixture: ReferenceFixture): SolveRequest {
  return {
    waterMass: kilogram(fixture.request.waterMassKg),
    liquidVolume: litre(fixture.request.liquidVolumeL),
    temperature: kelvin(fixture.request.temperatureK),
    solutes: fixture.request.solutes.map((solute) =>
      solute.mode === "fully-dissociated"
        ? { soluteId: solute.soluteId, amount: mol(solute.amountMol), mode: solute.mode }
        : {
            soluteId: solute.soluteId,
            amount: mol(solute.amountMol),
            mode: solute.mode,
            ka: thermodynamicConstant(solute.ka!),
          },
    ),
    indicators: fixture.request.indicators.map((indicator) => ({
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

async function assertFixture(fixture: ReferenceFixture): Promise<void> {
  const request = toSolveRequest(fixture);
  const result = await createAcidBaseAdapter().solve(request);
  expect(result.status, `${fixture.id} status`).toBe("OK");
  if (result.status !== "OK") return;

  const expected = fixture.expected;
  const tolerance = fixture.tolerance.absolute;
  expectNear(result.state.modelPh.value, expected.modelPh, tolerance);
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

describe("independent M4 reference fixtures", () => {
  it("has a complete, independently-derived REF-1…REF-10 manifest", () => {
    expect(manifest.schemaVersion).toBe(1);
    expect(manifest.derivation.notGeneratedBy).toBe("packages/sci");
    expect(manifest.derivation.basis).toBe("molality");
    expect(fixtures).toHaveLength(10);
    expect(new Set(fixtures.map((fixture) => fixture.id)).size).toBe(10);
    expect(fixtures.every((fixture) => fixture.derivation.length > 0)).toBe(true);
  });

  it.each(fixtures)("matches $id without changing the checked-in expected values", async (fixture) => {
    await assertFixture(fixture);
  });

  it("does not regenerate or silently accept a tampered expected value", async () => {
    const fixture = fixtures[0]!;
    const tampered = {
      ...fixture,
      expected: { ...fixture.expected, modelPh: fixture.expected.modelPh + 0.1 },
    };
    await expect(
      (async () => {
        const result = await createAcidBaseAdapter().solve(toSolveRequest(tampered));
        if (result.status !== "OK") throw new Error(`unexpected ${result.status}`);
        expectNear(result.state.modelPh.value, tampered.expected.modelPh, tampered.tolerance.absolute);
      })(),
    ).rejects.toThrow();
  });

  it("records the expected Henderson–Hasselbalch divergence independently", () => {
    const dilute = fixtures.find((fixture) => fixture.id === "REF-5")!;
    expect(dilute.comparison?.divergenceClaim).toBe("approximately 0.65 pH");
    expect(dilute.comparison?.pHDivergence).toBeGreaterThan(0.6);
    expect(dilute.expected.modelPh).not.toBeCloseTo(
      dilute.comparison!.hendersonHasselbalchApproximationPh,
      1,
    );
  });
});
