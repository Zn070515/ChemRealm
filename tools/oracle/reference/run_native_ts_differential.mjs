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

function compareExact(rows, field, left, right) {
  const stable = (value) => Array.isArray(value)
    ? value.map(stable)
    : value !== null && typeof value === "object"
      ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]))
      : value;
  const equal = JSON.stringify(stable(left)) === JSON.stringify(stable(right));
  rows.push({ field, difference: equal ? 0 : Number.POSITIVE_INFINITY });
  if (!equal) throw new Error(`${field} differs: ${JSON.stringify(left)} vs ${JSON.stringify(right)}`);
}

function normaliseExpressionRendering(expression) {
  // TS and Rust intentionally use different shortest-number formatting in
  // human-readable expression strings. Numeric truth is compared through the
  // structured substitutions below; this keeps the surrounding expression
  // structure and units under comparison without making formatting a backend
  // identity.
  return expression.replace(/\[([-+0-9.eE]+) ([^\]]+)\]/g, "[# $2]");
}

function compareScientificState(differences, legacy, native) {
  compareNumber(
    differences,
    "ionicStrengthReduced",
    legacy.ionicStrengthReduced.value,
    native.ionicStrengthReduced.value,
  );
  compareExact(differences, "validity", legacy.validity, native.validity);

  if (legacy.species.length !== native.species.length) {
    throw new Error("species count differs");
  }
  for (const [index, legacySpeciesState] of legacy.species.entries()) {
    const nativeSpeciesState = native.species[index];
    compareExact(differences, `species[${index}].symbol`, legacySpeciesState.symbol, nativeSpeciesState.symbol);
    for (const field of ["reducedMolality", "molality", "amount", "activityCoefficient", "activity"]) {
      const legacyValue = ["reducedMolality", "activityCoefficient", "activity"].includes(field)
        ? legacySpeciesState[field].value
        : legacySpeciesState[field];
      const nativeValue = ["reducedMolality", "activityCoefficient", "activity"].includes(field)
        ? nativeSpeciesState[field].value
        : nativeSpeciesState[field];
      compareNumber(
        differences,
        `species[${index}].${field}`,
        legacyValue,
        nativeValue,
      );
    }
  }

  const legacyProvenance = { ...legacy.provenance };
  const nativeProvenance = { ...native.provenance };
  // The two accepted backends intentionally have distinct model versions.
  delete legacyProvenance.modelVersion;
  delete nativeProvenance.modelVersion;
  compareExact(differences, "provenance.nonVersionIdentity", legacyProvenance, nativeProvenance);

  const legacyParameters = Object.keys(legacy.provenance.parameters).sort();
  const nativeParameters = Object.keys(native.provenance.parameters).sort();
  compareExact(differences, "provenance.parameterKeys", legacyParameters, nativeParameters);
  for (const name of legacyParameters) {
    compareNumber(
      differences,
      `provenance.parameters.${name}`,
      legacy.provenance.parameters[name],
      native.provenance.parameters[name],
    );
  }

  if (legacy.indicators.length !== native.indicators.length) {
    throw new Error("indicator count differs");
  }
  for (const [index, legacyIndicator] of legacy.indicators.entries()) {
    const nativeIndicator = native.indicators[index];
    compareExact(
      differences,
      `indicators[${index}].indicatorId`,
      legacyIndicator.indicatorId,
      nativeIndicator.indicatorId,
    );
    compareNumber(
      differences,
      `indicators[${index}].protonationRatio`,
      legacyIndicator.protonationRatio,
      nativeIndicator.protonationRatio,
    );
  }
}

function compareExpressions(differences, legacy, native) {
  if (legacy.length !== native.length) throw new Error("scientific expression count differs");
  for (const [index, legacyExpression] of legacy.entries()) {
    const nativeExpression = native[index];
    const legacyComparable = { ...legacyExpression, modelVersion: undefined, expression: undefined };
    const nativeComparable = { ...nativeExpression, modelVersion: undefined, expression: undefined };
    compareExact(differences, `expressions[${index}]`, legacyComparable, nativeComparable);
    compareExact(
      differences,
      `expressions[${index}].renderedStructure`,
      normaliseExpressionRendering(legacyExpression.expression),
      normaliseExpressionRendering(nativeExpression.expression),
    );
    if (legacyExpression.substitutions.length !== nativeExpression.substitutions.length) {
      throw new Error(`expressions[${index}] substitution count differs`);
    }
    for (const [substitutionIndex, legacySubstitution] of legacyExpression.substitutions.entries()) {
      const nativeSubstitution = nativeExpression.substitutions[substitutionIndex];
      compareExact(
        differences,
        `expressions[${index}].substitutions[${substitutionIndex}].identity`,
        { symbol: legacySubstitution.symbol, unit: legacySubstitution.unit },
        { symbol: nativeSubstitution.symbol, unit: nativeSubstitution.unit },
      );
      compareNumber(
        differences,
        `expressions[${index}].substitutions[${substitutionIndex}].value`,
        legacySubstitution.value,
        nativeSubstitution.value,
      );
    }
  }
}

function compareResultSemantics(differences, legacy, native) {
  compareExact(differences, "status", legacy.status, native.status);
  if (legacy.status === "MODEL_OUT_OF_DOMAIN" && native.status === "MODEL_OUT_OF_DOMAIN") {
    compareExact(differences, "domain.reason", legacy.reason, native.reason);
    const legacyNearest = { ...legacy.nearestSupported, version: undefined };
    const nativeNearest = { ...native.nearestSupported, version: undefined };
    compareExact(differences, "domain.nearestSupported", legacyNearest, nativeNearest);
  } else if (legacy.status === "NOT_CONVERGED" && native.status === "NOT_CONVERGED") {
    compareExact(differences, "notConverged.code", legacy.code, native.code);
    compareExact(differences, "notConverged.reason", legacy.reason, native.reason);
    compareExact(differences, "notConverged.iterations", legacy.iterations, native.iterations);
    compareExact(differences, "notConverged.residual", legacy.residual, native.residual);
  } else if (legacy.status === "INVALID_INPUT" && native.status === "INVALID_INPUT") {
    compareExact(differences, "invalidInput.violations", legacy.violations, native.violations);
  }
}

function compareSuccessfulResults(legacyExecution, nativeExecution, request) {
  const differences = [];
  const legacy = legacyExecution.result;
  const native = nativeExecution.result;
  compareExact(differences, "execution.sourceStateHash", legacyExecution.sourceStateHash, nativeExecution.sourceStateHash);
  compareNumber(differences, "modelPh", legacy.state.modelPh.value, native.state.modelPh.value);
  compareNumber(
    differences,
    "ionicStrengthMolal",
    legacy.state.ionicStrengthMolal.value,
    native.state.ionicStrengthMolal.value,
  );
  const legacyProjection = projectScientificState(legacy.state, {
    sourceStateHash: legacyExecution.sourceStateHash,
    liquidVolume: request.liquidVolume,
  });
  const nativeProjection = projectScientificState(native.state, {
    sourceStateHash: nativeExecution.sourceStateHash,
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
  compareScientificState(differences, legacy.state, native.state);
  compareExpressions(differences, legacyExecution.expressions, nativeExecution.expressions);
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
  const sourceStateHash = `ts-native-differential-${entry.id}`;
  const [legacyExecution, nativeExecution] = await Promise.all([
    legacy.solveWithScientificArtifacts(request, { sourceStateHash }),
    native.solveWithScientificArtifacts(request, { sourceStateHash }),
  ]);
  const legacyResult = legacyExecution.result;
  const nativeResult = nativeExecution.result;
  if (legacyResult.status !== nativeResult.status) {
    throw new Error(`${entry.id} status differs: ${legacyResult.status} vs ${nativeResult.status}`);
  }
  if (legacyResult.status === "OK" && nativeResult.status === "OK") {
    const differences = compareSuccessfulResults(legacyExecution, nativeExecution, request);
    rows.push({ id: entry.id, status: "PASS", comparedFields: differences.length });
  } else {
    const differences = [];
    compareResultSemantics(differences, legacyResult, nativeResult);
    compareExpressions(differences, legacyExecution.expressions, nativeExecution.expressions);
    rows.push({ id: entry.id, status: "PASS", resultStatus: legacyResult.status });
  }
}

if (rows.length === 0 || rows.some((row) => row.status !== "PASS")) {
  throw new Error("native/TypeScript differential matrix is empty or failed");
}
console.log(`native ↔ TypeScript differential: ${rows.length}/${rows.length} requests PASS`);
