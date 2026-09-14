#!/usr/bin/env node
/**
 * Compare the native host binary and the release WASM artifact over every
 * request in the canonical REF, ORACLE, and adversarial fixture manifests.
 *
 * This is intentionally a host↔WASM bridge check, not a PHREEQC or
 * TypeScript-equivalence claim. The native reference matrix separately checks
 * the WASM result against the frozen scientific expectations.
 */

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { deepStrictEqual } from "node:assert/strict";

import {
  NATIVE_BRIDGE_SCHEMA_VERSION,
  NativeSolveEnvelopeSchema,
} from "../../../packages/schema/dist/index.js";
import { loadNativeWasmExecutor } from "../../../packages/sci/dist/index.js";

const ROOT = resolve(fileURLToPath(new URL("../../../", import.meta.url)));
const REFERENCE_DIR = join(ROOT, "packages", "sci", "test", "reference");
const WASM_PATH = join(ROOT, "packages", "sci", "dist", "wasm", "chemrealm_sci_core.wasm");
const CARGO_MANIFEST = join(ROOT, "native", "sci-core", "Cargo.toml");
const HOST_PATH = join(
  ROOT,
  "native",
  "sci-core",
  "target",
  "release",
  process.platform === "win32" ? "sci-core-host.exe" : "sci-core-host",
);

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function buildHost() {
  const completed = spawnSync(
    "cargo",
    ["build", "--release", "--manifest-path", CARGO_MANIFEST, "--bin", "sci-core-host"],
    { cwd: ROOT, encoding: "utf8" },
  );
  if (completed.status !== 0) {
    throw new Error(
      `native host release build failed\n${completed.stdout ?? ""}\n${completed.stderr ?? ""}`,
    );
  }
}

function requestDto(request, schemaVersion) {
  return {
    schemaVersion,
    waterMass: { value: request.waterMassKg, unit: "kg" },
    liquidVolume: { value: request.liquidVolumeL, unit: "L" },
    temperature: { value: request.temperatureK, unit: "K" },
    solutes: request.solutes.map((solute) => ({
      soluteId: solute.soluteId,
      amount: { value: solute.amountMol, unit: "mol" },
      mode: solute.mode,
      ...(solute.mode === "monoprotic-equilibrium"
        ? { ka: { value: solute.ka, unit: "1" } }
        : {}),
    })),
    indicators: request.indicators.map((indicator) => ({
      indicatorId: indicator.indicatorId,
      kaIn: { value: indicator.kaIn, unit: "1" },
    })),
  };
}

function fixtureRequests(fixture) {
  if (fixture.request !== undefined) {
    return [{ id: fixture.id, request: fixture.request }];
  }
  if (fixture.kind === "molality-molarity-bound") {
    return fixture.cases.flatMap((referenceCase) => [
      { id: `${referenceCase.caseId}:true`, request: referenceCase.trueRequest },
      {
        id: `${referenceCase.caseId}:molarity-as-molality`,
        request: referenceCase.molarityAsMolalityRequest,
      },
    ]);
  }
  return fixture.cases.map((referenceCase) => ({
    id: referenceCase.caseId,
    request: referenceCase.request,
  }));
}

function envelopeFor(request, schemaVersion, sourceStateHash) {
  return NativeSolveEnvelopeSchema.parse({
    bridgeSchemaVersion: NATIVE_BRIDGE_SCHEMA_VERSION,
    request: requestDto(request, schemaVersion),
    context: { sourceStateHash },
  });
}

function hostSolve(wire) {
  const completed = spawnSync(HOST_PATH, [], {
    cwd: ROOT,
    input: wire,
    encoding: "utf8",
  });
  if (completed.status !== 0) {
    throw new Error(`native host failed\n${completed.stdout ?? ""}\n${completed.stderr ?? ""}`);
  }
  try {
    return JSON.parse(completed.stdout);
  } catch (error) {
    throw new Error("native host returned invalid JSON", { cause: error });
  }
}

async function main() {
  const versionManifest = await readJson(join(ROOT, "contracts", "version-manifest.json"));
  const fixtureManifest = await readJson(join(REFERENCE_DIR, "manifest.json"));
  const groups = [
    ["REF", fixtureManifest.fixtures],
    ["ORACLE", fixtureManifest.oracleFixtures],
    ["ADVERSARIAL", fixtureManifest.adversarialFixtures],
  ];
  const requests = [];
  for (const [, fixtureIds] of groups) {
    for (const fixtureId of fixtureIds) {
      const fixture = await readJson(join(REFERENCE_DIR, `${fixtureId}.json`));
      requests.push(...fixtureRequests(fixture));
    }
  }
  if (requests.length === 0) throw new Error("native differential matrix is empty");
  if (!existsSync(WASM_PATH)) throw new Error(`missing release WASM artifact: ${WASM_PATH}`);

  buildHost();
  if (!existsSync(HOST_PATH)) throw new Error(`missing native host artifact: ${HOST_PATH}`);
  const wasmBytes = await readFile(WASM_PATH);
  const wasmArrayBuffer = wasmBytes.buffer.slice(
    wasmBytes.byteOffset,
    wasmBytes.byteOffset + wasmBytes.byteLength,
  );
  const wasmExecute = await loadNativeWasmExecutor(wasmArrayBuffer);
  const rows = [];
  for (const [index, entry] of requests.entries()) {
    const sourceStateHash = `sha256:native-differential-${entry.id}`;
    const envelope = envelopeFor(
      entry.request,
      versionManifest.schema.scientific,
      sourceStateHash,
    );
    const wire = JSON.stringify(envelope);
    const host = hostSolve(wire);
    const wasm = JSON.parse(await wasmExecute(wire));
    let equal = true;
    let reason;
    try {
      deepStrictEqual(host, wasm);
    } catch (error) {
      equal = false;
      reason = error instanceof Error ? error.message : String(error);
    }
    rows.push({
      id: entry.id,
      status: equal ? "PASS" : "FAIL",
      ...(reason === undefined ? {} : { reason }),
      hostStatus: host.result?.status,
      wasmStatus: wasm.result?.status,
    });
    if (!equal) {
      throw new Error(`host↔WASM mismatch at ${entry.id}: ${reason}`);
    }
    if ((index + 1) % 10 === 0 || index === requests.length - 1) {
      console.log(`native differential: ${index + 1}/${requests.length}`);
    }
  }

  const report = {
    kind: "native-host-wasm-differential",
    backend: {
      id: versionManifest.scientific.acidBase.id,
      version: versionManifest.scientific.acidBase.nativeVersion,
    },
    fixtureGroups: groups.map(([name, ids]) => ({ name, ids })),
    requestCount: rows.length,
    allRequestsCompared: rows.length === requests.length,
    pass: rows.every((row) => row.status === "PASS"),
    wasmArtifact: {
      path: "packages/sci/dist/wasm/chemrealm_sci_core.wasm",
      sha256: `sha256:${createHash("sha256").update(wasmBytes).digest("hex")}`,
    },
    validation: {
      sourceCommit: process.env.CHEMREALM_VALIDATION_COMMIT ?? "uncommitted-working-tree",
      ciRun: process.env.CHEMREALM_VALIDATION_CI ?? "not-recorded",
    },
    rows,
  };
  const output = JSON.stringify(report, null, 2);
  const outputPath = process.argv[2];
  if (outputPath !== undefined) {
    const resolved = resolve(ROOT, outputPath);
    await writeFile(resolved, `${output}\n`, "utf8");
    console.log(`native differential report: ${resolved}`);
  }
  console.log(output);
}

await main();
