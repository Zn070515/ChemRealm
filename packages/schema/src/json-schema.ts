/**
 * JSON Schema emission (`ADR-0001` rule 1).
 *
 * zod is the source of truth. This module emits JSON Schema artifacts so the
 * PYTHON side — the acceptance-coverage checker today, the PHREEQC oracle from
 * M4 — validates its fixtures against the same contract the runtime enforces,
 * instead of hand-mirroring TypeScript types and drifting.
 *
 * The emitted files are COMMITTED artifacts under `packages/schema/json-schema/`.
 * `pnpm verify:schema-artifacts` regenerates them and fails if the working copy
 * differs, so drift is caught rather than discovered and Python can consume the
 * contract without a Node toolchain.
 */

import { z } from "zod";

import { ScenarioSchema } from "./content.js";
import { CommandSchema } from "./commands.js";
import { DomainEventSchema, EventLogSchema } from "./events.js";
import { ExportBundleSchema } from "./export.js";
import { QuantitySchema } from "./quantity.js";
import {
  ScientificExpressionSchema,
  NativeBackendPayloadSchema,
  NativeSolveEnvelopeSchema,
  ScientificStateSchema,
  SolveResultSchema,
} from "./scientific.js";
import { WorldStateSchema } from "./world.js";
import {
  FrozenOpticalPathSnapshotSchema,
  IndicatorChemicalObservationSchema,
  IndicatorOpticalObservationSchema,
  OpticalProfileSnapshotSchema,
} from "./indicator-optics.js";
import { IndicatorMultiformObservationSchema } from "./indicator-multiform.js";

/**
 * Every contract the Python side needs to validate against. Adding a contract
 * here is what makes it reachable from the oracle; a contract that is only in
 * `index.ts` is invisible across the language boundary.
 */
export const JSON_SCHEMA_SOURCES = {
  "quantity": QuantitySchema,
  "world-state": WorldStateSchema,
  "domain-event": DomainEventSchema,
  "event-log": EventLogSchema,
  "command": CommandSchema,
  "scenario": ScenarioSchema,
  "scientific-state": ScientificStateSchema,
  "scientific-expression": ScientificExpressionSchema,
  "optical-profile": OpticalProfileSnapshotSchema,
  "optical-path": FrozenOpticalPathSnapshotSchema,
  "indicator-chemical-observation": IndicatorChemicalObservationSchema,
  "indicator-multiform-observation": IndicatorMultiformObservationSchema,
  "indicator-optical-observation": IndicatorOpticalObservationSchema,
  "solve-result": SolveResultSchema,
  "native-solve-envelope": NativeSolveEnvelopeSchema,
  "native-backend-payload": NativeBackendPayloadSchema,
  "export-bundle": ExportBundleSchema,
} as const;

export type JsonSchemaArtifactName = keyof typeof JSON_SCHEMA_SOURCES;

/**
 * Generate every artifact. Returns `{ [name]: schema }`, where each schema
 * carries `$schema` so a consumer can validate without extra configuration.
 */
export function generateJsonSchemas(): Record<JsonSchemaArtifactName, unknown> {
  const out = {} as Record<JsonSchemaArtifactName, unknown>;
  for (const [name, schema] of Object.entries(JSON_SCHEMA_SOURCES)) {
    out[name as JsonSchemaArtifactName] = z.toJSONSchema(schema, {
      target: "draft-2020-12",
    });
  }
  return out;
}

/** Stable, diffable serialization: 2-space indent, sorted keys, trailing newline. */
export function serializeJsonSchema(schema: unknown): string {
  return `${JSON.stringify(schema, sortedReplacer, 2)}\n`;
}

function sortedReplacer(_key: string, value: unknown): unknown {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return value;
  }
  const record = value as Record<string, unknown>;
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(record).sort()) sorted[key] = record[key];
  return sorted;
}

/** Filename for an artifact. Used by the emitter and the drift check. */
export function artifactFilename(name: JsonSchemaArtifactName): string {
  return `${name}.schema.json`;
}
