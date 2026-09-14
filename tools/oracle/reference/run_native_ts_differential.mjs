#!/usr/bin/env node
/**
 * Compare the accepted TypeScript adapter with the release native WASM
 * adapter over every canonical REF, ORACLE, and adversarial request.
 *
 * This is a differential check, not an equivalence claim: the two backends
 * have distinct model identities. It catches status, species, projection, and
 * indicator regressions before a native supersession decision.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  createAcidBaseAdapter,
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

const ROOT = resolve(fileURLToPath(new URL("../../../", import.meta.url)));
const REFERENCE_DIR = resolve(ROOT, "packages/sci/test/reference");
const WASM_PATH = resolve(ROOT, "packages/sci/dist/wasm/chemrealm_sci_core.wasm");
const MANIFEST_PATH = resolve(REFERENCE_DIR, "manifest.json");
const ABSOLUTE_TOLERANCE = 1e-10;

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function requestFromFixture(request) {
  return {
    waterMass: kilogram(request.waterMassKg),
    liquidVolume: litre(request.liquidVolumeL),
    temperature: kelvin(request.temperatureK),
    solutes: request.solutes.map((solute) => solute.mode === "fully-dissociated"
      ? { soluteId: solute.soluteId, amount: mol(solute.amountMol), mode: solute.mode }
      : {
          soluteId: solute.soluteId,
          amount: mol(solute.amountMol),
          mode: solute.mode,
          ka: thermodynamicConstant(solute.ka),
        }),
    indicators: request.indicators.map((indicator) => ({
      indicatorId: indicator.indicatorId,
      kaIn: thermodynamicConstant(indicator.kaIn),
    })),
  };
}

function fixtureRequests(fixture) {
  if (fixture.request !== undefined) return [{ id: fixture.id, request: fixture.request }];
  if (fixture.kind === "molality-molarity-bound") {
    return fixture.cases.flatMap((referenceCase) => [
      { id: `${referenceCase.caseId}:true`, request: referenceCase.trueRequest },
      { id: `${referenceCase.caseId}:molarity-as-molality`, request: referenceCase.molarityAsMolalityRequest },
    ]);
  }
  return fixture.cases.map((referenceCase) => ({
    id: referenceCase.caseId,
    request: referenceCase.request,
  }));
}

function allRequests() {
  const manifest = readJson(MANIFEST_PATH);
  const ids = [
    ...(manifest.fixtures ?? []),
    ...(manifest.oracleFixtures ?? []),
    ...(manifest.adversarialFixtures ?? []),
  ];
  return ids.flatMap((id) => fixtureRequests(readJson(resolve(REFERENCE_DIR, `${id}.json`))));
}

function compareNumber(rows, field, left, right) {
  const difference = Math.abs(left - right);
  rows.push({ field, difference });
  if (!Number.isFinite(difference) || difference > ABSOLUTE_TOLERANCE) {
    throw new Error(`${field} differs by ${difference}, tolerance ${ABSOLUTE_TOLERANCE}`);
  }
}

function compareSuccessfulResults(id, legacy, native, request) {
  const differences = [];
  compareNumber(differences, "modelPh", legacy.state.modelPh.value, native.state.modelPh.value);
  compareNumber(
    differences,
    "ionicStrengthMolal",
    legacy.state.ionicStrengthMolal.value,
    native.state.ionicStrengthMolal.value,
  );
  const legacyProjection = projectScientificState(legacy.state, {
    sourceStateHash: `ts-native-differential-${id}`,
    liquidVolume: request.liquidVolume,
  });
  const nativeProjection = projectScientificState(native.state, {
    sourceStateHash: `ts-native-differential-${id}`,
    liquidVolume: request.liquidVolume,
  });
  compareNumber(
    differences,
    "hydrogenIonMolarity",
    legacyProjection.hydrogenIonMolarity,
    nativeProjection.hydrogenIonMolarity,
  );
  compareNumber(
    differences,
    "taughtHydrogenIonExponent",
    legacyProjection.taughtHydrogenIonExponent.value,
    nativeProjection.taughtHydrogenIonExponent.value,
  );
  const legacySpecies = legacy.state.species;
  const nativeSpecies = native.state.species;
  if (legacySpecies.map((species) => species.symbol).join("|") !==
      nativeSpecies.map((species) => species.symbol).join("|")) {
    throw new Error(`${id} species ordering/identity differs`);
  }
  for (const [index, legacySpeciesState] of legacySpecies.entries()) {
    compareNumber(
      differences,
      `species[${index}].molality`,
      legacySpeciesState.molality,
      nativeSpecies[index].molality,
    );
    compareNumber(
      differences,
      `species[${index}].activity`,
      legacySpeciesState.activity.value,
      nativeSpecies[index].activity.value,
    );
  }
  const legacyIndicators = legacy.state.indicators;
  const nativeIndicators = native.state.indicators;
  if (legacyIndicators.length !== nativeIndicators.length) {
    throw new Error(`${id} indicator count differs`);
  }
  for (const [index, legacyIndicator] of legacyIndicators.entries()) {
    if (legacyIndicator.indicatorId !== nativeIndicators[index].indicatorId) {
      throw new Error(`${id} indicator identity differs`);
    }
    compareNumber(
      differences,
      `indicators[${index}].protonationRatio`,
      legacyIndicator.protonationRatio,
      nativeIndicators[index].protonationRatio,
    );
  }
  return differences;
}

const wasmBytes = readFileSync(WASM_PATH);
const wasmArrayBuffer = wasmBytes.buffer.slice(
  wasmBytes.byteOffset,
  wasmBytes.byteOffset + wasmBytes.byteLength,
);
const native = createNativeJsonAdapter(
  await loadNativeWasmExecutor(wasmArrayBuffer),
);
const legacy = createAcidBaseAdapter();
const rows = [];

for (const entry of allRequests()) {
  const request = requestFromFixture(entry.request);
  const [legacyResult, nativeResult] = await Promise.all([
    legacy.solve(request),
    native.solve(request),
  ]);
  if (legacyResult.status !== nativeResult.status) {
    throw new Error(`${entry.id} status differs: ${legacyResult.status} vs ${nativeResult.status}`);
  }
  if (legacyResult.status === "OK" && nativeResult.status === "OK") {
    const differences = compareSuccessfulResults(entry.id, legacyResult, nativeResult, request);
    rows.push({ id: entry.id, status: "PASS", comparedFields: differences.length });
  } else {
    rows.push({ id: entry.id, status: "PASS", resultStatus: legacyResult.status });
  }
}

if (rows.length === 0 || rows.some((row) => row.status !== "PASS")) {
  throw new Error("native/TypeScript differential matrix is empty or failed");
}
console.log(`native ↔ TypeScript differential: ${rows.length}/${rows.length} requests PASS`);
