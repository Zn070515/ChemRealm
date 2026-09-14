#!/usr/bin/env node
/**
 * Compare the accepted ordinary phenolphthalein fraction equations in the
 * TypeScript and native/WASM candidates. This is a differential check, not an
 * independent scientific reference and not permission to enable optical RGB.
 */

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  IndicatorMultiformObservationSchema,
  activity,
  activityCoefficient,
  mol,
} from "../../../packages/schema/dist/index.js";
import {
  buildPhenolphthaleinMultiformObservation,
  calculateDiproticIndicatorFractions,
  DEFAULT_PHENOLPHTHALEIN_MULTIFORM_CONSTANTS,
  loadNativeMultiformWasmExecutor,
  refuseUnsupportedPhenolphthaleinRegime,
} from "../../../packages/sci/dist/index.js";

const ROOT = resolve(fileURLToPath(new URL("../../../", import.meta.url)));
const WASM_PATH = resolve(ROOT, "packages/sci/dist/wasm/chemrealm_sci_core.wasm");
const REFERENCE_DIR = resolve(ROOT, "packages/sci/test/reference/indicator-multiform");
const ABSOLUTE_TOLERANCE = 1e-14;

async function loadReferenceCases() {
  const manifest = JSON.parse(
    await readFile(resolve(REFERENCE_DIR, "manifest.json"), "utf8"),
  );
  const cases = [];
  for (const fixtureId of manifest.fixtures) {
    const fixture = JSON.parse(
      await readFile(resolve(REFERENCE_DIR, `${fixtureId}.json`), "utf8"),
    );
    if (fixture.expectedStatus !== undefined) continue;
    if (fixture.request !== undefined) {
      cases.push({ id: fixtureId, ...fixture.request });
    }
    for (const point of fixture.points ?? []) {
      cases.push({ ...point, id: `${fixtureId}-${point.id}` });
    }
  }
  return cases.filter((testCase) =>
    testCase.kind === undefined ||
    testCase.regime === "ordinary-aqueous" ||
    testCase.regime === "strong-acid-cation",
  );
}

function tsResult(testCase, sourceReplayHash) {
  if (testCase.regime !== "ordinary-aqueous") {
    return refuseUnsupportedPhenolphthaleinRegime(
      "strong-acid-cation",
      mol(Number(testCase.totalAmountMol)),
      sourceReplayHash,
    );
  }
  const fractions = calculateDiproticIndicatorFractions({
    constants: DEFAULT_PHENOLPHTHALEIN_MULTIFORM_CONSTANTS,
    hydrogenActivity: activity(Number(testCase.hydrogenActivity)),
    monovalentAnionActivityCoefficient: activityCoefficient(
      Number(testCase.monovalentAnionActivityCoefficient),
    ),
    divalentAnionActivityCoefficient: activityCoefficient(
      Number(testCase.divalentAnionActivityCoefficient),
    ),
  });
  return buildPhenolphthaleinMultiformObservation(
    mol(Number(testCase.totalAmountMol)),
    fractions,
    sourceReplayHash,
  );
}

function compare(ts, native, id) {
  if (ts.status !== native.status) throw new Error(`${id}: status differs`);
  if (ts.indicatorId !== native.indicatorId) throw new Error(`${id}: indicator differs`);
  if (ts.modelId !== native.modelId || ts.modelVersion !== native.modelVersion) {
    throw new Error(`${id}: model identity differs`);
  }
  if (ts.sourceReplayHash !== native.sourceReplayHash) {
    throw new Error(`${id}: source replay identity differs`);
  }
  if (ts.status === "CHEMICAL_FORMS_UNAVAILABLE") {
    if (ts.reasonCode !== native.reasonCode) throw new Error(`${id}: refusal code differs`);
    return;
  }
  if (ts.forms.length !== native.forms.length) throw new Error(`${id}: form count differs`);
  for (const [index, form] of ts.forms.entries()) {
    const other = native.forms[index];
    if (form.formId !== other.formId) throw new Error(`${id}: form identity differs`);
    const difference = Math.abs(form.fraction - other.fraction);
    if (difference > ABSOLUTE_TOLERANCE) {
      throw new Error(`${id}: ${form.formId} differs by ${difference}`);
    }
  }
}

const cases = await loadReferenceCases();
const wasmBytes = await readFile(WASM_PATH);
const wasmArrayBuffer = wasmBytes.buffer.slice(
  wasmBytes.byteOffset,
  wasmBytes.byteOffset + wasmBytes.byteLength,
);
const nativeExecute = await loadNativeMultiformWasmExecutor(wasmArrayBuffer);
const rows = [];
for (const testCase of cases) {
  const sourceReplayHash = testCase.sourceReplayHash;
  const request = {
    sourceReplayHash,
    totalAmount: { value: Number(testCase.totalAmountMol), unit: "mol" },
    // The native JSON request is structurally complete even for a refused
    // regime. The refusal is selected by `regime`; it must not be encoded by
    // omitting fields that the ordinary branch requires.
    hydrogenActivity: { value: Number(testCase.hydrogenActivity ?? 1e-10), unit: "1" },
    monovalentAnionActivityCoefficient: {
      value: Number(testCase.monovalentAnionActivityCoefficient ?? 1),
      unit: "1",
    },
    divalentAnionActivityCoefficient: {
      value: Number(testCase.divalentAnionActivityCoefficient ?? 1),
      unit: "1",
    },
    regime: testCase.regime,
  };
  const ts = tsResult(testCase, sourceReplayHash);
  const native = IndicatorMultiformObservationSchema.parse(
    JSON.parse(await nativeExecute(JSON.stringify(request))),
  );
  compare(ts, native, testCase.id);
  rows.push({ id: testCase.id, status: "PASS" });
}

console.log(JSON.stringify({
  kind: "ordinary-phenolphthalein-multiform-ts-wasm-differential",
  requestCount: rows.length,
  pass: rows.every((row) => row.status === "PASS"),
  rows,
}, null, 2));
