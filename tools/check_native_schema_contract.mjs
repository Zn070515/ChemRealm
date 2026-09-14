#!/usr/bin/env node
/**
 * Verify that the Rust bridge DTO roots remain mechanically aligned with the
 * schema-owned native artifacts. This is a drift guard, not a replacement for
 * runtime schema validation or native scientific acceptance.
 */

import { readFile } from "node:fs/promises";
import { readVersionManifest } from "./version-manifest.mjs";

const root = new URL("../", import.meta.url);
const manifest = await readVersionManifest();

async function file(relativePath) {
  return readFile(new URL(relativePath, root), "utf8");
}

function objectProperties(schema, path) {
  let value = schema;
  for (const segment of path) value = value?.properties?.[segment];
  return value?.properties ?? {};
}

function requiredProperties(schema) {
  return Object.fromEntries(
    (schema?.required ?? []).map((property) => [property, schema.properties?.[property] ?? {}]),
  );
}

function unionObjectProperties(schema) {
  if (schema?.properties !== undefined) return schema.properties;
  return Object.assign({}, ...(schema?.oneOf ?? []).map((variant) => variant.properties ?? {}));
}

function unionRequiredProperties(schema) {
  if (schema?.properties !== undefined) return requiredProperties(schema);
  return Object.fromEntries(
    [...new Set((schema?.oneOf ?? []).flatMap((variant) => variant.required ?? []))]
      .map((property) => [property, unionObjectProperties(schema)[property] ?? {}]),
  );
}

function unitConstraint(schema) {
  const unit = schema?.properties?.unit;
  if (unit?.const !== undefined) return [unit.const];
  if (Array.isArray(unit?.enum)) return unit.enum;
  return [];
}

function requireCanonicalUnit(schema, path, expected, failures) {
  const actual = unitConstraint(schema);
  if (actual.length !== 1 || actual[0] !== expected) {
    failures.push(
      `native schema ${path} must require canonical unit ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
    );
  }
}

function structFields(source, name) {
  const match = source.match(new RegExp(`struct\\s+${name}\\s*\\{([\\s\\S]*?)\\n\\}`, "m"));
  if (match === null) return null;
  return [...match[1].matchAll(/^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:/gm)].map((entry) => entry[1]);
}

function enumVariantFields(source, enumName, variantName) {
  const enumMatch = source.match(new RegExp(`enum\\s+${enumName}\\s*\\{([\\s\\S]*?)\\n\\}`, "m"));
  if (enumMatch === null) return null;
  const variantMatch = enumMatch[1].match(
    new RegExp(`${variantName}\\s*\\{([\\s\\S]*?)\\n\\s*\\}`, "m"),
  );
  if (variantMatch === null) return null;
  return [...variantMatch[1].matchAll(/^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:/gm)].map(
    (entry) => entry[1],
  );
}

function camelToSnake(value) {
  return value.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function missingFields(schemaProperties, source, structName, variant = false) {
  const fields = variant
    ? enumVariantFields(source, "NativeResult", structName)
    : structFields(source, structName);
  if (fields === null) return [`Rust struct ${structName} is missing`];
  const missing = [];
  for (const property of Object.keys(schemaProperties)) {
    if (property === "status") continue;
    const rustField = camelToSnake(property);
    if (!fields.includes(rustField)) missing.push(`${structName}.${rustField}`);
  }
  return missing;
}

const nativeContractRelativePath = `contracts/scientific/${manifest.scientific.acidBase.id}-${manifest.scientific.acidBase.nativeVersion}.json`;
const nativeContractTestRelativePath = nativeContractRelativePath.replace(/\.json$/, ".test.json");
const [envelopeText, payloadText, rustSource, buildSource, nativeContractText, nativeContractTestText] = await Promise.all([
  file("packages/schema/json-schema/native-solve-envelope.schema.json"),
  file("packages/schema/json-schema/native-backend-payload.schema.json"),
  file("native/sci-core/src/lib.rs"),
  file("native/sci-core/build.rs"),
  file(nativeContractRelativePath),
  file(nativeContractTestRelativePath),
]);
const envelope = JSON.parse(envelopeText);
const payload = JSON.parse(payloadText);
const nativeContract = JSON.parse(nativeContractText);
const nativeContractTest = JSON.parse(nativeContractTestText);
const failures = [];

if (nativeContract.model?.id !== manifest.scientific.acidBase.id ||
    nativeContract.model?.version !== manifest.scientific.acidBase.nativeVersion ||
    nativeContract.solverConfig?.id !== manifest.scientific.acidBase.id ||
    nativeContract.solverConfig?.version !== manifest.scientific.acidBase.nativeVersion) {
  failures.push("native model contract identity does not match the central version manifest");
}
if (nativeContractTest.contract !== nativeContractRelativePath.split("/").pop()) {
  failures.push("native model contract test fixture does not name the active contract");
}
for (const parameter of [
  "Kw",
  "Ka_HOAc",
  "Davies_A",
  "Davies_b",
  "standardMolality",
  "neutralAcidActivityCoefficient",
  "waterActivity",
  "numericPrecisionSignificantDigits",
  "numericPolicyVersion",
]) {
  if (typeof nativeContract.solverConfig?.parameters?.[parameter] !== "number" ||
      !Number.isFinite(nativeContract.solverConfig.parameters[parameter])) {
    failures.push(`native model contract parameter ${parameter} must be finite`);
  }
}

const envelopeVersion = envelope.properties?.bridgeSchemaVersion?.const;
const payloadVersion = payload.properties?.bridgeSchemaVersion?.const;
if (envelopeVersion !== manifest.schema.nativeBridge || payloadVersion !== manifest.schema.nativeBridge) {
  failures.push("native schema bridge version does not match contracts/version-manifest.json");
}

for (const [name, properties, structName] of [
  ["envelope", envelope.properties ?? {}, "RawBridgeEnvelope"],
  ["request", objectProperties(envelope, ["request"]), "RawRequest"],
  ["context", objectProperties(envelope, ["context"]), "RawExecutionContext"],
  ["payload", payload.properties ?? {}, "BackendPayload"],
]) {
  for (const missing of missingFields(properties, rustSource, structName)) {
    failures.push(`${name} schema field is not represented by ${missing}`);
  }
}

const envelopeRequest = envelope.properties?.request;
const requestSolute = envelopeRequest?.properties?.solutes?.items;
const payloadResult = payload.properties?.result;
const payloadOkResult = payloadResult?.oneOf?.[0];
const payloadDomainResult = payloadResult?.oneOf?.[1];
const payloadNotConvergedResult = payloadResult?.oneOf?.[2];
const payloadInvalidInputResult = payloadResult?.oneOf?.[3];

// A field-name match is not enough for a cross-language ABI. Rust's
// `require_unit` consumes canonical values only; keep the generated schema's
// discriminated unit semantics mechanically aligned with that contract.
requireCanonicalUnit(
  envelopeRequest?.properties?.waterMass,
  "request.waterMass",
  "kg",
  failures,
);
requireCanonicalUnit(
  envelopeRequest?.properties?.liquidVolume,
  "request.liquidVolume",
  "L",
  failures,
);
requireCanonicalUnit(
  envelopeRequest?.properties?.temperature,
  "request.temperature",
  "K",
  failures,
);
for (const [index, variant] of (requestSolute?.oneOf ?? []).entries()) {
  requireCanonicalUnit(variant.properties?.amount, `request.solutes[${index}].amount`, "mol", failures);
  if (variant.properties?.ka !== undefined) {
    requireCanonicalUnit(variant.properties.ka, `request.solutes[${index}].ka`, "1", failures);
  }
}
requireCanonicalUnit(
  envelopeRequest?.properties?.indicators?.items?.properties?.kaIn,
  "request.indicators[].kaIn",
  "1",
  failures,
);
for (const [field, unit] of [
  ["water_mass", "kg"],
  ["liquid_volume", "L"],
  ["temperature", "K"],
] ) {
  if (!rustSource.includes(`require_unit(&request.${field}, "${unit}"`)) {
    failures.push(`Rust RawRequest.${field} does not enforce canonical unit ${unit}`);
  }
}
if (!rustSource.includes('require_unit(&solute.amount, "mol"')) {
  failures.push("Rust RawSolute.amount does not enforce canonical unit mol");
}
if (!rustSource.includes('require_unit(ka, "1"')) {
  failures.push("Rust equilibrium Ka does not enforce canonical unit 1");
}
if (!rustSource.includes('require_unit(&indicator.ka_in, "1"')) {
  failures.push("Rust indicator Ka does not enforce canonical unit 1");
}

for (const [name, properties, structName] of [
  ["quantity", { value: {}, unit: {} }, "Quantity"],
  ["request solute", unionRequiredProperties(requestSolute), "RawSolute"],
  ["request indicator", requiredProperties(envelopeRequest?.properties?.indicators?.items), "RawIndicator"],
  ["backend identity", requiredProperties(payload.properties?.backend), "BackendIdentity"],
  ["state", requiredProperties(payloadOkResult?.properties?.state), "ScientificStateDto"],
  ["species state", requiredProperties(payloadOkResult?.properties?.state?.properties?.species?.items), "SpeciesStateDto"],
  ["indicator state", requiredProperties(payloadOkResult?.properties?.state?.properties?.indicators?.items), "IndicatorStateDto"],
  ["validity status", requiredProperties(payloadOkResult?.properties?.state?.properties?.validity), "ValidityStatusDto"],
  ["provenance", requiredProperties(payloadOkResult?.properties?.state?.properties?.provenance), "ProvenanceDto"],
  ["expression", requiredProperties(payload.properties?.expressions?.items), "ScientificExpressionDto"],
  ["expression substitution", requiredProperties(payload.properties?.expressions?.items?.properties?.substitutions?.items), "ScientificExpressionSubstitutionDto"],
  ["nearest model", requiredProperties(payloadDomainResult?.properties?.nearestSupported), "ModelDescriptorDto"],
  ["model validity", requiredProperties(payloadDomainResult?.properties?.nearestSupported?.properties?.validity), "ModelValidityDto"],
  ["temperature range", requiredProperties(payloadDomainResult?.properties?.nearestSupported?.properties?.validity?.properties?.temperature), "TemperatureRangeDto"],
  ["input violation", requiredProperties(payloadInvalidInputResult?.properties?.violations?.items), "InputViolationDto"],
]) {
  for (const missing of missingFields(properties, rustSource, structName)) {
    failures.push(`${name} schema field is not represented by ${missing}`);
  }
}

for (const [name, schemaVariant, rustVariant] of [
  ["OK result", payloadOkResult, "Ok"],
  ["out-of-domain result", payloadDomainResult, "ModelOutOfDomain"],
  ["not-converged result", payloadNotConvergedResult, "NotConverged"],
  ["invalid-input result", payloadInvalidInputResult, "InvalidInput"],
]) {
  for (const missing of missingFields(requiredProperties(schemaVariant), rustSource, rustVariant, true)) {
    failures.push(`${name} schema field is not represented by NativeResult.${missing}`);
  }
}

if (!buildSource.includes("native-solve-envelope.schema.json") ||
    !buildSource.includes("native-backend-payload.schema.json") ||
    !buildSource.includes("native_model_contract.rs") ||
    !buildSource.includes("CHEMREALM_NATIVE_MODEL_CONTRACT_PATH")) {
  failures.push("native build.rs does not read the schema and scientific contract artifacts");
}
if (!rustSource.includes("native_model_contract.rs")) {
  failures.push("native Rust library does not consume generated native model contract constants");
}
const nativeContractTestSource = await file("native/sci-core/tests/contract.rs");
if (!nativeContractTestSource.includes("CHEMREALM_NATIVE_MODEL_CONTRACT_PATH")) {
  failures.push("native contract tests must resolve the checked-in contract through the manifest-derived build path");
}

// Negative self-test: the guard must notice a removed required root field.
const damagedRust = rustSource.replace(/\n\s*request:\s*RawRequest,/, "");
if (missingFields(objectProperties(envelope, ["request"]), damagedRust, "RawBridgeEnvelope").length === 0) {
  failures.push("self-test: removing the request field was not detected");
}
const damagedNestedRust = rustSource.replace(/\n\s*expressions:\s*Vec<ScientificExpressionDto>,/, "");
if (missingFields(payload.properties ?? {}, damagedNestedRust, "BackendPayload").length === 0) {
  failures.push("self-test: removing the expressions field was not detected");
}
const damagedExpressionRust = rustSource.replace(
  /(struct\s+ScientificExpressionDto\s*\{[\s\S]*?)\n\s*source_state_hash\s*:[^\n]+/m,
  "$1",
);
if (
  missingFields(
    requiredProperties(payload.properties?.expressions?.items),
    damagedExpressionRust,
    "ScientificExpressionDto",
  ).length === 0
) {
  failures.push("self-test: removing a nested expression field was not detected");
}

const damagedEnvelope = structuredClone(envelope);
damagedEnvelope.properties.request.properties.waterMass.properties.unit = {
  enum: ["kg", "g"],
  type: "string",
};
const damagedUnitFailures = [];
requireCanonicalUnit(
  damagedEnvelope.properties.request.properties.waterMass,
  "request.waterMass",
  "kg",
  damagedUnitFailures,
);
if (damagedUnitFailures.length === 0) {
  failures.push("self-test: widening a native unit constraint was not detected");
}

if (failures.length > 0) {
  for (const failure of failures) console.error(`FAIL  ${failure}`);
  console.log("\nRESULT: FAIL");
  process.exit(1);
}

console.log("ok    Rust bridge DTOs match schema-owned envelope, request, result, state, and expression fields");
console.log("ok    schema bridge version matches the central version manifest");
console.log("ok    negative drift fixtures detect removed request, payload, and nested expression fields");
console.log("\nRESULT: PASS");
