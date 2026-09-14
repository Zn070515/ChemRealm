#!/usr/bin/env node
/** Run canonical fixture requests through the real release WASM adapter. */

import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createNativeJsonAdapter,
  loadNativeWasmExecutor,
  projectScientificState,
} from "../../../packages/sci/dist/index.js";
import {
  kelvin,
  kilogram,
  litre,
  mol,
  thermodynamicConstant,
} from "../../../packages/schema/dist/index.js";

const fixturesDirectory = resolve(
  process.argv[2] ?? "packages/sci/test/reference",
);
const fixturePrefix = process.argv[3] ?? "ORACLE";
const fixturePattern = new RegExp(`^${fixturePrefix}-\\d+\\.json$`);
const repositoryRoot = resolve(fileURLToPath(new URL("../../../", import.meta.url)));
const wasmPath = resolve(repositoryRoot, "packages/sci/dist/wasm/chemrealm_sci_core.wasm");

function loadFixtures() {
  return readdirSync(fixturesDirectory)
    .filter((name) => fixturePattern.test(name))
    .sort((left, right) => {
      const leftNumber = Number(left.match(/\d+/)?.[0]);
      const rightNumber = Number(right.match(/\d+/)?.[0]);
      return leftNumber - rightNumber;
    })
    .map((name) => JSON.parse(readFileSync(resolve(fixturesDirectory, name), "utf8")));
}

function requestFromFixture(fixture) {
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
            ka: thermodynamicConstant(solute.ka),
          },
    ),
    indicators: fixture.request.indicators.map((indicator) => ({
      indicatorId: indicator.indicatorId,
      kaIn: thermodynamicConstant(indicator.kaIn),
    })),
  };
}

const wasmBytes = readFileSync(wasmPath);
const wasmArrayBuffer = wasmBytes.buffer.slice(
  wasmBytes.byteOffset,
  wasmBytes.byteOffset + wasmBytes.byteLength,
);
const adapter = createNativeJsonAdapter(
  await loadNativeWasmExecutor(wasmArrayBuffer),
);
const outputs = [];
for (const fixture of loadFixtures()) {
  const request = requestFromFixture(fixture);
  const result = await adapter.solve(request);
  if (result.status !== "OK") {
    outputs.push({
      id: fixture.id,
      status: result.status,
      ...(result.status === "MODEL_OUT_OF_DOMAIN"
        ? { reason: result.reason }
        : { reason: result.reason, code: result.code }),
    });
    continue;
  }

  const projection = projectScientificState(result.state, {
    sourceStateHash: `native-reference-${fixture.id}`,
    liquidVolume: request.liquidVolume,
  });
  outputs.push({
    id: fixture.id,
    status: "OK",
    modelPh: result.state.modelPh.value,
    ionicStrengthMolal: result.state.ionicStrengthMolal.value,
    hydrogenIonMolarity: projection.hydrogenIonMolarity,
    taughtHydrogenIonExponent: projection.taughtHydrogenIonExponent.value,
    speciesMolality: Object.fromEntries(
      result.state.species.map((species) => [species.symbol, species.molality]),
    ),
    indicatorRatios: Object.fromEntries(
      result.state.indicators.map((indicator) => [
        indicator.indicatorId,
        indicator.protonationRatio,
      ]),
    ),
    model: {
      id: result.state.provenance.modelId,
      version: result.state.provenance.modelVersion,
    },
    hasHydrogenSpecies: result.state.species.some((species) => species.symbol === "H+"),
  });
}

process.stdout.write(`${JSON.stringify(outputs)}\n`);
