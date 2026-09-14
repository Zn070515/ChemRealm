#!/usr/bin/env node
/**
 * Compare the coupled ordinary phenolphthalein solve in TypeScript and
 * native/WASM. This is a candidate bridge check; it does not enable the
 * production adapter or any optical colour output.
 */

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  IndicatorMultiformObservationSchema,
  mol,
  reducedMolality,
} from "../../../packages/schema/dist/index.js";
import {
  buildPhenolphthaleinMultiformObservation,
  DEFAULT_ACID_BASE_CONSTANTS,
  DEFAULT_PHENOLPHTHALEIN_MULTIFORM_CONSTANTS,
  loadNativeMultiformCoupledWasmExecutor,
  solveReducedWithDiproticIndicator,
} from "../../../packages/sci/dist/index.js";

const ROOT = resolve(fileURLToPath(new URL("../../../", import.meta.url)));
const WASM_PATH = resolve(ROOT, "packages/sci/dist/wasm/chemrealm_sci_core.wasm");
const FIXTURE_PATH = resolve(
  ROOT,
  "packages/sci/test/reference/indicator-multiform/MF-8.json",
);
const ABSOLUTE_TOLERANCE = 1e-12;

const fixture = JSON.parse(await readFile(FIXTURE_PATH, "utf8"));
const request = fixture.coupledRequest;
if (request === undefined) {
  throw new Error("MF-8 must provide the canonical coupled differential request");
}

function numeric(value, name) {
  const result = Number(value);
  if (!Number.isFinite(result)) throw new Error(`${name} must be finite`);
  return result;
}

function tsResult() {
  const result = solveReducedWithDiproticIndicator({
    totals: {
      strongAcidChlorideMolality: reducedMolality(
        numeric(request.strongAcidChlorideMolality, "strong acid total"),
      ),
      strongBaseSodiumMolality: reducedMolality(
        numeric(request.strongBaseSodiumMolality, "strong base total"),
      ),
      totalAcidFamilyMolality: reducedMolality(
        numeric(request.totalAcidFamilyMolality, "acid-family total"),
      ),
    },
    constants: DEFAULT_ACID_BASE_CONSTANTS,
    indicator: {
      totalMolality: reducedMolality(
        numeric(request.indicatorTotalMolality, "indicator total"),
      ),
      constants: DEFAULT_PHENOLPHTHALEIN_MULTIFORM_CONSTANTS,
    },
  });
  if ("kind" in result) {
    throw new Error(`TypeScript coupled solve failed: ${result.kind}`);
  }
  if (result.indicatorForms === undefined) {
    throw new Error("TypeScript coupled solve did not return indicator forms");
  }
  return {
    observation: buildPhenolphthaleinMultiformObservation(
      mol(numeric(request.totalAmountMol, "total amount")),
      result.indicatorForms,
      request.sourceReplayHash,
    ),
    ionicStrength: result.ionicStrength.value,
    chargeResidual: result.chargeResidual,
  };
}

function assertClose(actual, expected, label) {
  const difference = Math.abs(actual - expected);
  if (difference > ABSOLUTE_TOLERANCE) {
    throw new Error(`${label} differs by ${difference}`);
  }
}

const wasmBytes = await readFile(WASM_PATH);
const wasmArrayBuffer = wasmBytes.buffer.slice(
  wasmBytes.byteOffset,
  wasmBytes.byteOffset + wasmBytes.byteLength,
);
const nativeExecute = await loadNativeMultiformCoupledWasmExecutor(wasmArrayBuffer);
const nativePayload = JSON.parse(await nativeExecute(JSON.stringify({
  sourceReplayHash: request.sourceReplayHash,
  totalAmount: { value: numeric(request.totalAmountMol, "total amount"), unit: "mol" },
  strongAcidChlorideMolality: {
    value: numeric(request.strongAcidChlorideMolality, "strong acid total"),
    unit: "mol/kg",
  },
  strongBaseSodiumMolality: {
    value: numeric(request.strongBaseSodiumMolality, "strong base total"),
    unit: "mol/kg",
  },
  totalAcidFamilyMolality: {
    value: numeric(request.totalAcidFamilyMolality, "acid-family total"),
    unit: "mol/kg",
  },
  indicatorTotalMolality: {
    value: numeric(request.indicatorTotalMolality, "indicator total"),
    unit: "mol/kg",
  },
  regime: request.regime,
})));
const nativeObservation = IndicatorMultiformObservationSchema.parse(
  nativePayload.observation,
);
const ts = tsResult();

if (ts.observation.status !== nativeObservation.status) {
  throw new Error("coupled differential status differs");
}
if (
  ts.observation.modelId !== nativeObservation.modelId ||
  ts.observation.modelVersion !== nativeObservation.modelVersion ||
  ts.observation.sourceReplayHash !== nativeObservation.sourceReplayHash
) {
  throw new Error("coupled differential identity differs");
}
for (const [index, form] of ts.observation.forms.entries()) {
  const nativeForm = nativeObservation.forms[index];
  if (nativeForm === undefined || nativeForm.formId !== form.formId) {
    throw new Error(`coupled differential form ${index} identity differs`);
  }
  assertClose(nativeForm.fraction, form.fraction, `${form.formId} fraction`);
}
assertClose(
  nativePayload.ionicStrengthMolal.value,
  ts.ionicStrength,
  "ionic strength",
);
assertClose(nativePayload.chargeResidual.value, ts.chargeResidual, "charge residual");

console.log(JSON.stringify({
  kind: "ordinary-phenolphthalein-coupled-ts-wasm-differential",
  fixture: "MF-8",
  requestCount: 1,
  pass: true,
  ionicStrengthMolal: ts.ionicStrength,
  chargeResidualMolal: ts.chargeResidual,
  forms: ts.observation.forms,
}, null, 2));
