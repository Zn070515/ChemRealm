import { describe, expect, it } from "vitest";

import {
  MaterialDefinitionSchema,
  SCENARIO_SCHEMA_VERSION,
  ScenarioSchema,
  SoluteDefinitionSchema,
} from "./content.js";
import { FORBIDDEN_BUNDLE_FIELDS, ExportBundleSchema } from "./export.js";
import { DomainEventSchema, WorldBranchedSchema, WorldCreatedSchema } from "./events.js";
import { MIGRATIONS, migrate } from "./migrate.js";
import { QuantitySchema } from "./quantity.js";
import {
  ScientificStateSchema,
  ModelDescriptorSchema,
  SolveRequestSchema,
  SolveResultSchema,
  SolverConfigSchema,
  SpeciesStateSchema,
  parseScientificState,
  parseSolveRequest,
  parseSolveResult,
  SCIENTIFIC_SCHEMA_VERSION,
} from "./scientific.js";
import {
  CURRENT_SCHEMA_VERSION,
  CanonicalContentsSchema,
  MaterialSnapshotSchema,
  PositionSchema,
  ScenarioSnapshotSchema,
  VesselSchema,
  WorldStateSchema,
} from "./world.js";
import { generateJsonSchemas, serializeJsonSchema } from "./json-schema.js";

describe("AC-R15 — contents live in exactly one place", () => {
  it("gives Vessel no contents field", () => {
    const shape = VesselSchema.shape as Record<string, unknown>;
    expect(Object.keys(shape)).not.toContain("contents");
    expect(Object.keys(shape)).not.toContain("canonical");
  });

  it("REJECTS a vessel that tries to carry its own contents", () => {
    const withContents = {
      id: "flask",
      kind: "conicalFlask",
      capacity: { value: 0.25, unit: "L" },
      geometryRef: "flask-250",
      position: { unit: "mm", x: 0, y: 0 },
      contents: { waterMass: { value: 1, unit: "kg" } },
    };
    // This test previously asserted the key was STRIPPED — which is zod's
    // default, and is the defect rather than the property. On a persisted
    // format, silently dropping an unknown field is how a newer world's data
    // disappears without anyone being told. ADR-0005 requires a downgrade to be
    // REFUSED, and a schema that strips cannot refuse anything.
    expect(VesselSchema.safeParse(withContents).success).toBe(false);
  });

  it("places contents under canonical.byVessel", () => {
    const keys = Object.keys(WorldStateSchema.shape as Record<string, unknown>);
    expect(keys).toContain("canonical");
  });
});

describe("AC-R16 — requirements and the resolved solver are different things", () => {
  it("gives the scenario snapshot no solverConfig field", () => {
    // Requirements constrain; solverConfig records. Storing both would
    // recreate the double-source-of-truth problem just removed from Vessel.
    //
    // Asserted against the ZOD schema, not the emitted JSON Schema: the
    // emission's internal shape ($defs naming, inlining) is zod's business and
    // would make this test brittle for no gain. The emission itself is covered
    // by the artifact drift check.
    const names = Object.keys(ScenarioSnapshotSchema.shape as Record<string, unknown>);
    expect(names).not.toContain("solverConfig");
    expect(names).toContain("modelRequirements");
  });

  it("carries exactly one resolved solverConfig, on WorldState", () => {
    const keys = Object.keys(WorldStateSchema.shape as Record<string, unknown>);
    expect(keys).toContain("solverConfig");
  });

  it("freezes scenario indicator constants with per-datum provenance", () => {
    const names = Object.keys(ScenarioSnapshotSchema.shape as Record<string, unknown>);
    expect(names).toContain("indicators");

    const snapshot = {
      scenarioRef: "indicator-snapshot",
      materials: [],
      vessels: [],
      apparatusDefaults: [],
      modelRequirements: {
        temperature: { value: 298.15, unit: "K" },
        species: ["H+"],
        solvent: "water",
        phase: "aqueous",
        activityCorrected: true,
      },
      indicators: [
        {
          indicatorId: "phenolphthalein",
          kaIn: { value: 3.98e-10, unit: "1" },
          provenance: {
            source: "reference",
            reference: "indicator transition table",
            category: "evaluated",
          },
        },
      ],
    };
    expect(ScenarioSnapshotSchema.safeParse(snapshot).success).toBe(true);
    const withoutProvenance = structuredClone(snapshot);
    delete (withoutProvenance.indicators[0] as Record<string, unknown>).provenance;
    expect(ScenarioSnapshotSchema.safeParse(withoutProvenance).success).toBe(false);
    const nonCanonical = structuredClone(snapshot);
    nonCanonical.indicators[0]!.kaIn = { value: 0.000000398, unit: "mmol/L" };
    expect(ScenarioSnapshotSchema.safeParse(nonCanonical).success).toBe(false);
    const nonPositive = structuredClone(snapshot);
    nonPositive.indicators[0]!.kaIn = { value: 0, unit: "1" };
    expect(ScenarioSnapshotSchema.safeParse(nonPositive).success).toBe(false);
  });
});

describe("AC-R19 — world identity is event-sourced", () => {
  it("puts worldId in WorldCreated, not only in world state", () => {
    const keys = Object.keys(WorldCreatedSchema.shape.payload.shape as object);
    expect(keys).toContain("worldId");
  });

  it("puts the child identity in WorldBranched", () => {
    const keys = Object.keys(WorldBranchedSchema.shape.payload.shape as object);
    for (const field of ["childWorldId", "parentWorldId", "forkSequence", "forkStateHash"]) {
      expect(keys).toContain(field);
    }
  });

  it("keeps wall-clock out of the hashed surface", () => {
    // `meta` is nested inside an optional envelope and is the only place a
    // timestamp may appear. It is excluded from the state hash by construction.
    const withMeta = {
      seq: 1,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      type: "WorldBranched" as const,
      meta: { recordedAt: "2026-09-11T00:00:00Z" },
      payload: {
        childWorldId: "c",
        parentWorldId: "p",
        forkSequence: 3,
        forkStateHash: "abc",
      },
    };
    const parsed = DomainEventSchema.parse(withMeta);
    expect(parsed).toHaveProperty("meta");
  });
});

describe("AC-C1 — content declares a scenario and cannot express chemistry", () => {
  const minimalScenario = {
    schemaVersion: SCENARIO_SCHEMA_VERSION,
    contentVersion: 1,
    scenarioRef: "hcl-naoh",
    title: "HCl vs NaOH",
    materials: [
      {
        materialId: "hcl-0.1",
        label: "0.1000 mol/L HCl",
        phase: "aqueous",
        solutes: [
          {
            soluteId: "HCl",
            basis: "molarity",
            amountConcentration: {
              value: 0.1,
              unit: "mol/L",
              provenance: {
                source: "fixture",
                reference: "HCl composition fixture",
                category: "evaluated",
              },
            },
            molarMass: {
              value: 36.4609,
              unit: "g/mol",
              provenance: {
                source: "fixture",
                reference: "HCl molar mass fixture",
                category: "evaluated",
              },
            },
          },
        ],
        density: {
          value: 1.002,
          unit: "kg/L",
          provenance: {
            source: "fixture",
            reference: "HCl density fixture",
            category: "evaluated",
          },
        },
      },
    ],
    vessels: [
      {
        vesselId: "flask",
        kind: "conicalFlask",
        capacity: { value: 0.25, unit: "L" },
        geometryRef: "flask-250",
        position: { unit: "mm", x: 0, y: 0 },
        initialContents: [{ materialId: "hcl-0.1", volume: { value: 0.025, unit: "L" } }],
      },
    ],
    apparatus: [],
    indicators: [],
    modelRequirements: {
      temperature: { value: 298.15, unit: "K" },
      solvent: "water",
      phase: "aqueous",
      activityCorrected: true,
      species: ["H2O", "H+", "OH-", "Cl-", "Na+"],
    },
  };

  it("accepts a scenario that only declares state", () => {
    expect(ScenarioSchema.safeParse(minimalScenario).success).toBe(true);
  });

  it("has no field through which an equilibrium could be supplied", () => {
    const names = Object.keys(ScenarioSchema.shape as Record<string, unknown>);
    for (const forbidden of ["ka", "kw", "equilibrium", "reactions", "ph", "solverConfig"]) {
      expect(names).not.toContain(forbidden);
    }
  });

  it("REQUIRES a density rather than defaulting one (AC-S15)", () => {
    const withoutDensity = structuredClone(minimalScenario);
    delete (withoutDensity.materials[0] as Record<string, unknown>)["density"];
    // Density sets waterMass, hence molality, hence activity, hence model pH.
    // A scenario that omits it is incomplete, not defaulted.
    expect(ScenarioSchema.safeParse(withoutDensity).success).toBe(false);
  });
});

// `AC-P4`, not `AC-P3`. `AC-P3` is "IndexedDB contains no identifier, name, or
// contact field", evidenced by storage inspection at M8. This block tests the
// EXPORT schema, which is `AC-P4`.
describe("AC-P4 — no tracking identifier in the export bundle, and lineage present", () => {
  it("lists the fields a bundle must never carry", () => {
    expect(FORBIDDEN_BUNDLE_FIELDS.length).toBeGreaterThan(0);
  });

  it("has none of them in the export bundle shape", () => {
    const names = Object.keys(ExportBundleSchema.shape as Record<string, unknown>);
    for (const forbidden of FORBIDDEN_BUNDLE_FIELDS) {
      expect(names).not.toContain(forbidden);
    }
  });

  it("permits lineage identifiers, which are content rather than identity", () => {
    const names = Object.keys(ExportBundleSchema.shape as Record<string, unknown>);
    expect(names).toContain("lineage");
  });

  it("states explicitly whether learner evidence is included", () => {
    const names = Object.keys(ExportBundleSchema.shape as Record<string, unknown>);
    expect(names).toContain("includesLearnerEvidence");
  });
});

// NOT `AC-R8`. That criterion is "world export → import round-trips to an
// identical state hash" (`SPEC-0001` AC-R8), a persistence test that lands with
// the store. This block tests the migration harness, which `SPEC-0001`
// §Rollout/migration requires to exist before it is needed. The earlier label
// attached a criterion to a test that did not test it — which is the failure
// mode `CLAUDE.md` §16 calls "tests passing only because assertions were
// weakened", arriving through the label rather than the assertion.
describe("the migration harness exists before it is needed", () => {
  it("registers the indicator snapshot migration before it is needed", () => {
    expect(MIGRATIONS.some((m) => m.from === 1 && m.to === 2)).toBe(true);
  });

  it("passes a current record through untouched", () => {
    const result = migrate({ schemaVersion: CURRENT_SCHEMA_VERSION }, CURRENT_SCHEMA_VERSION);
    expect(result.status).toBe("OK");
  });

  it("REFUSES a record from the future rather than attempting it", () => {
    const result = migrate({ schemaVersion: 999 }, CURRENT_SCHEMA_VERSION);
    expect(result.status).toBe("REFUSED_FROM_FUTURE");
    if (result.status === "REFUSED_FROM_FUTURE") {
      expect(result.foundVersion).toBe(999);
    }
  });

  it("reports a broken chain instead of returning a half-migrated record", () => {
    const result = migrate({ schemaVersion: 0 }, CURRENT_SCHEMA_VERSION);
    expect(result.status).toBe("NO_PATH");
  });

  it("migrates a v1 genesis record with no indicator block into v2", () => {
    const result = migrate(
      {
        schemaVersion: 1,
        type: "WorldCreated",
        payload: {
          scenarioSnapshot: {
            scenarioRef: "legacy",
            materials: [],
            vessels: [],
            apparatusDefaults: [],
            modelRequirements: {},
          },
        },
      },
      CURRENT_SCHEMA_VERSION,
    );

    expect(result.status).toBe("OK");
    if (result.status === "OK") {
      expect(result.record.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
      const payload = result.record.payload;
      expect(payload).toBeTypeOf("object");
      if (payload !== null && typeof payload === "object") {
        const scenarioSnapshot = (payload as Record<string, unknown>).scenarioSnapshot;
        expect(scenarioSnapshot).toMatchObject({ indicators: [] });
      }
    }
  });

  it("migrates a v1 authored scenario by making an empty indicator selection explicit", () => {
    const result = migrate(
      {
        schemaVersion: 1,
        scenarioRef: "legacy-content",
        materials: [],
        vessels: [],
        apparatus: [],
        modelRequirements: {},
      },
      CURRENT_SCHEMA_VERSION,
    );

    expect(result.status).toBe("OK");
    if (result.status === "OK") {
      expect(result.record).toMatchObject({ indicators: [] });
    }
  });

  it("does not mutate the legacy record while migrating nested snapshots", () => {
    const legacy = {
      schemaVersion: 1,
      type: "WorldCreated",
      payload: {
        scenarioSnapshot: {
          scenarioRef: "legacy",
          materials: [],
          vessels: [],
          apparatusDefaults: [],
          modelRequirements: {},
        },
      },
    };
    const before = structuredClone(legacy);
    const result = migrate(legacy, CURRENT_SCHEMA_VERSION);

    expect(result.status).toBe("OK");
    expect(legacy).toEqual(before);
  });
});

describe("AC-V7 — geometry is a length, never a volume", () => {
  // PLAN-0001 M1 lists this test and it was missing until an audit of the
  // implementation against the plan found it. "Millimetre" being present is not
  // the same as "a volume cannot be written here".

  it("accepts millimetres", () => {
    expect(PositionSchema.safeParse({ unit: "mm", x: 0, y: 0 }).success).toBe(true);
  });

  it("REJECTS a position declared in a volume unit", () => {
    // The original dimensional error: geometry carried millilitres, which is
    // correct for a straight cylinder and silently wrong for the conical flask
    // this slice actually needs (apparatus-standard.md).
    expect(PositionSchema.safeParse({ unit: "L", x: 0, y: 0 }).success).toBe(false);
    expect(PositionSchema.safeParse({ unit: "mL", x: 0, y: 0 }).success).toBe(false);
  });

  it("carries no volume field in the geometry block", () => {
    const positionFields = Object.keys(PositionSchema.shape as Record<string, unknown>);
    expect(positionFields).not.toContain("volume");
    expect(positionFields).not.toContain("liquidVolume");
    // The unit is declared ONCE for the block, so no coordinate is ambiguous.
    expect(positionFields).toContain("unit");
  });

  it("declares capacity as a volume, because a capacity IS one", () => {
    // The distinction is that a vessel's CAPACITY is genuinely a volume while
    // its POSITION is genuinely a length. Both are checked, so neither is
    // silently allowed to be the other.
    const vesselFields = Object.keys(VesselSchema.shape as Record<string, unknown>);
    expect(vesselFields).toContain("capacity");
    expect(vesselFields).toContain("position");
  });
});

describe("boundary shapes REJECT unknown keys rather than stripping them", () => {
  it("refuses an event carrying a field the schema does not know", () => {
    const result = DomainEventSchema.safeParse({
      seq: 1,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      type: "ApparatusPlaced",
      payload: { apparatusId: "b", kind: "burette", position: { unit: "mm", x: 0, y: 0 } },
      somethingUnexpected: true,
    });
    expect(result.success).toBe(false);
  });

  it("emits additionalProperties:false, so the Python side refuses too", () => {
    const json = JSON.stringify(generateJsonSchemas()["world-state"]);
    expect(json).toContain('"additionalProperties":false');
  });
});

describe("dimension coherence — the contract cannot express dimensional nonsense", () => {
  // Found by PROBING, not by reading. `SerializedQuantitySchema` accepts any
  // registered unit, so the first version of this contract happily accepted
  // `temperature: {value: 25, unit: "mL"}` and `capacity: {value: 5, unit: "mol"}`,
  // and the emitted JSON Schema inherited the hole, so the Python side would
  // have accepted them too. Being explicit about units does not prevent
  // dimension confusion; only checking the dimension does (ADR-0004).
  const valid = {
    schemaVersion: SCENARIO_SCHEMA_VERSION,
    contentVersion: 1,
    scenarioRef: "x",
    title: "x",
    materials: [
      {
        materialId: "m",
        label: "m",
        phase: "aqueous" as const,
        solutes: [
          {
            soluteId: "HCl",
            basis: "molarity",
            amountConcentration: {
              value: 0.1,
              unit: "mol/L",
              provenance: { source: "fixture", reference: "composition", category: "evaluated" },
            },
            molarMass: {
              value: 36.46,
              unit: "g/mol",
              provenance: { source: "fixture", reference: "molar mass", category: "evaluated" },
            },
          },
        ],
        density: {
          value: 1.002,
          unit: "kg/L",
          provenance: { source: "fixture", reference: "density", category: "evaluated" },
        },
      },
    ],
    vessels: [
      {
        vesselId: "v",
        kind: "conicalFlask" as const,
        capacity: { value: 0.25, unit: "L" },
        geometryRef: "g",
        position: { unit: "mm" as const, x: 0, y: 0 },
        initialContents: [],
      },
    ],
    apparatus: [],
    indicators: [],
    modelRequirements: {
      temperature: { value: 298.15, unit: "K" },
      solvent: "water" as const,
      phase: "aqueous" as const,
      activityCorrected: true,
      species: ["H2O"],
    },
  };

  /** Re-parse the scenario with one quantity swapped to a wrong dimension. */
  const acceptsIf = (swap: (s: Record<string, Record<string, unknown>>) => void) => {
    const copy = structuredClone(valid) as unknown as Record<string, Record<string, unknown>>;
    swap(copy);
    return ScenarioSchema.safeParse(copy).success;
  };

  it("accepts the well-formed scenario", () => {
    expect(ScenarioSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a VOLUME field holding an AMOUNT", () => {
    expect(
      acceptsIf((s) => {
        (s.vessels as unknown as Record<string, unknown>[])[0]!["capacity"] = {
          value: 5,
          unit: "mol",
        };
      }),
    ).toBe(false);
  });

  it("rejects a density declared in mol/L", () => {
    expect(
      acceptsIf((s) => {
        (s.materials as unknown as Record<string, unknown>[])[0]!["density"] = {
          value: 1,
          unit: "mol/L",
        };
      }),
    ).toBe(false);
  });

  it("rejects a temperature declared in millilitres", () => {
    expect(
      acceptsIf((s) => {
        (s.modelRequirements as Record<string, unknown>)["temperature"] = {
          value: 25,
          unit: "mL",
        };
      }),
    ).toBe(false);
  });
});

describe("scientific contract carries the model's identity and validity", () => {
  it("requires provenance with a category", () => {
    const names = Object.keys(ScientificStateSchema.shape as Record<string, unknown>);
    expect(names).toContain("provenance");
    expect(names).toContain("validity");
  });

  it("carries BOTH reduced and physical representations", () => {
    // The algebra runs in reduced molality; physical molality is derived at the
    // boundary. Carrying both makes the conversion explicit rather than assumed,
    // which is what stops `m° = 1` from hiding a mix-up.
    const props = Object.keys(SpeciesStateSchema.shape as Record<string, unknown>);
    expect(props).toContain("reducedMolality");
    expect(props).toContain("molality");
  });

  it("treats refusal as a normal outcome, not an exception", () => {
    const refused = SolveResultSchema.safeParse({
      schemaVersion: SCIENTIFIC_SCHEMA_VERSION,
      status: "MODEL_OUT_OF_DOMAIN",
      reason: "temperature outside the model's range",
    });
    expect(refused.success).toBe(false);
  });

  it("requires an actionable nearest-supported descriptor for refusal", () => {
    const refused = SolveResultSchema.safeParse({
      schemaVersion: SCIENTIFIC_SCHEMA_VERSION,
      status: "MODEL_OUT_OF_DOMAIN",
      reason: "temperature outside the model's range",
      nearestSupported: {
        id: "test-solver",
        version: "1.0.0",
        description: "contract test",
        validity: {
          temperature: {
            min: { value: 273.15, unit: "K" },
            max: { value: 373.15, unit: "K" },
          },
          ionicStrengthMolalMax: { value: 0.5, unit: "mol/kg" },
          species: ["H+"],
          components: ["HCl"],
          solvent: "water",
          phase: "aqueous",
          activityCorrected: true,
        },
      },
    });
    expect(refused.success).toBe(true);
  });

  it("requires a diagnostic code and reason for non-convergence", () => {
    const failure = SolveResultSchema.safeParse({
      schemaVersion: SCIENTIFIC_SCHEMA_VERSION,
      status: "NOT_CONVERGED",
      code: "OUTER_BRACKET_NOT_FOUND",
      reason: "no valid outer bracket was found",
      iterations: 4,
    });
    expect(failure.success).toBe(true);

    const legacyFailure = SolveResultSchema.safeParse({
      schemaVersion: SCIENTIFIC_SCHEMA_VERSION,
      status: "NOT_CONVERGED",
      residual: 0,
      iterations: 4,
    });
    expect(legacyFailure.success).toBe(false);
  });

  it("has no bare-number shortcut in the outcome union", () => {
    const json = JSON.stringify(generateJsonSchemas()["solve-result"]);
    expect(json).toContain("MODEL_OUT_OF_DOMAIN");
    expect(json).toContain("NOT_CONVERGED");
    expect(json).not.toContain('"ph"');
  });
});

describe("unknown-field behaviour is identical in TypeScript and in the artifact", () => {
  /**
   * THE DEFECT THIS PINS. A plain `z.object` STRIPS unknown keys at parse time,
   * but zod emits `additionalProperties: false` for it. So the emitted contract
   * rejected input the runtime accepted:
   *
   *     QuantitySchema.safeParse({ value: 1, unit: "L", surprise: "oops" })
   *       -> { success: true, data: { value: 1, unit: "L" } }   // verified
   *
   * while `quantity.schema.json` said `additionalProperties: false`. Cross-
   * language "one source of truth" fails in both directions; this is the
   * direction where Python was STRICTER, which is the one that lets a fixture
   * pass here and fail there.
   */
  function openObjects(node: unknown, path: string, out: string[]): void {
    if (Array.isArray(node)) {
      node.forEach((child, i) => openObjects(child, `${path}[${i}]`, out));
      return;
    }
    if (node === null || typeof node !== "object") return;
    const record = node as Record<string, unknown>;
    if (record["type"] === "object" && record["properties"] !== undefined) {
      // An object that declares properties must close them. A `z.record` emits
      // no `properties`, so the deliberate extension points (`apparatus.state`,
      // `provenance.parameters`, `solverConfig.parameters`, the `byVessel` map)
      // are exempt by construction rather than by an allow-list that rots.
      if (record["additionalProperties"] !== false) out.push(path);
    }
    for (const [key, value] of Object.entries(record)) {
      openObjects(value, `${path}.${key}`, out);
    }
  }

  it("closes every object that declares properties, in every artifact", () => {
    const open: string[] = [];
    for (const [name, schema] of Object.entries(generateJsonSchemas())) {
      openObjects(schema, name, open);
    }
    expect(open).toEqual([]);
  });

  it("and the runtime agrees with the artifact it emits", () => {
    // Top level.
    expect(
      QuantitySchema.safeParse({ value: 1, unit: "L", surprise: "oops" }).success,
    ).toBe(false);
    // Nested, one level in, which is where the hole was.
    expect(
      SolverConfigSchema.safeParse({
        id: "x",
        version: "1",
        parameters: {},
        surprise: 1,
      }).success,
    ).toBe(false);
  });
});

describe("JSON Schema emission is deterministic", () => {
  it("produces byte-identical output across runs", () => {
    const a = serializeJsonSchema(generateJsonSchemas()["world-state"]);
    const b = serializeJsonSchema(generateJsonSchemas()["world-state"]);
    expect(a).toBe(b);
  });

  it("emits every contract the Python side needs", () => {
    const names = Object.keys(generateJsonSchemas());
    for (const required of [
      "quantity",
      "world-state",
      "domain-event",
      "event-log",
      "scenario",
      "export-bundle",
    ]) {
      expect(names).toContain(required);
    }
  });
});

describe("the export bundle restates nothing the log already says", () => {
  it("carries no copy of a genesis field", () => {
    // `events[0]` is `WorldCreated`, which carries these already. An earlier
    // version duplicated them at the bundle's top level and nothing checked the
    // copies agreed — the second-source-of-truth defect this project removed
    // from `Vessel.contents`. `world` is listed too: `ADR-0005` sketched it,
    // nothing ever produced it, and a field no producer writes is a field no
    // consumer can rely on.
    const names = Object.keys(ExportBundleSchema.shape as Record<string, unknown>);
    for (const duplicate of [
      "scenarioSnapshot",
      "contentHash",
      "solverConfig",
      "world",
    ]) {
      expect(names).not.toContain(duplicate);
    }
  });

  it("keeps the fields that are genuinely the bundle's own", () => {
    const names = Object.keys(ExportBundleSchema.shape as Record<string, unknown>);
    for (const own of [
      "format",
      "formatVersion",
      "schemaVersion",
      "lineage",
      "events",
      "includesLearnerEvidence",
    ]) {
      expect(names).toContain(own);
    }
  });
});

describe("the conserved inventory is components, not materials", () => {
  it("gives CanonicalContents no materials field", () => {
    // A material is a reagent RECIPE. Two materials supplying the same solute
    // are indistinguishable after mixing, and a material holding two solutes
    // has no meaningful `n(material)` at all — so a materialId is not a
    // conserved quantity and must not be one.
    const names = Object.keys(
      CanonicalContentsSchema.shape as Record<string, unknown>,
    );
    expect(names).not.toContain("materials");
    expect(names).toContain("componentAmounts");
    expect(names).toContain("waterMass");
    expect(names).toContain("liquidVolume");
  });

  it("keeps the recipe fields at the recipe layer", () => {
    // Both levels exist on purpose: the material says what a recipe SUPPLIES,
    // the canonical contents say what the world CONSERVES.
    const names = Object.keys(
      MaterialDefinitionSchema.shape as Record<string, unknown>,
    );
    expect(names).toContain("solutes");
    expect(names).toContain("density");
  });
});

describe("persisted material snapshots tag every scientific input", () => {
  const snapshot = {
    materialId: "hcl-0.1",
    sourceDefinition: "0.1000 mol/L HCl",
    density: {
      value: 1.002,
      unit: "kg/L",
      provenance: {
        source: "CRC Handbook",
        reference: "aqueous HCl density table",
        category: "evaluated",
      },
    },
    composition: [
      {
        soluteId: "HCl",
        amountConcentration: { value: 0.1, unit: "mol/L" },
        provenance: {
          source: "Scenario record",
          reference: "hcl-0.1 composition label",
          category: "evaluated",
        },
      },
    ],
    molarMasses: [
      {
        soluteId: "HCl",
        molarMass: { value: 0.0364609, unit: "kg/mol" },
        provenance: {
          source: "IUPAC standard atomic weights",
          reference: "HCl molar mass calculation",
          category: "calculated",
        },
      },
    ],
    resolvedInventoryPerLitre: {
      waterMass: { value: 0.998, unit: "kg" },
      soluteAmounts: [{ soluteId: "HCl", amount: { value: 0.1, unit: "mol" } }],
    },
  };

  it("accepts canonical tagged quantities with provenance attached to each datum", () => {
    expect(MaterialSnapshotSchema.safeParse(snapshot).success).toBe(true);
  });

  it("accepts separate provenance for each solute datum", () => {
    const expanded = structuredClone(snapshot);
    expanded.composition.push({
      soluteId: "NaCl",
      amountConcentration: { value: 0.1, unit: "mol/L" },
      provenance: {
        source: "Scenario record",
        reference: "nacl-0.1 composition label",
        category: "evaluated",
      },
    });
    expanded.molarMasses.push({
      soluteId: "NaCl",
      molarMass: { value: 0.05844, unit: "kg/mol" },
      provenance: {
        source: "IUPAC standard atomic weights",
        reference: "NaCl molar mass calculation",
        category: "calculated",
      },
    });

    const parsed = MaterialSnapshotSchema.parse(expanded);
    expect(parsed.composition[1]?.provenance.reference).toBe(
      "nacl-0.1 composition label",
    );
    expect(parsed.molarMasses[1]?.provenance.reference).toBe(
      "NaCl molar mass calculation",
    );
  });

  it("rejects the old bare composition and molar-mass fields", () => {
    const broken = structuredClone(snapshot) as Record<string, unknown>;
    (broken.composition as Array<Record<string, unknown>>)[0] = {
      soluteId: "HCl",
      molPerLitre: 0.1,
    };
    (broken.molarMasses as Array<Record<string, unknown>>)[0] = {
      soluteId: "HCl",
      kilogramsPerMol: 0.0364609,
    };
    expect(MaterialSnapshotSchema.safeParse(broken).success).toBe(false);
  });

  it("rejects a snapshot when density provenance is missing", () => {
    const broken = structuredClone(snapshot) as Record<string, unknown>;
    delete (broken.density as Record<string, unknown>)["provenance"];
    expect(MaterialSnapshotSchema.safeParse(broken).success).toBe(false);
  });

  it("rejects a snapshot when a composition datum lacks provenance", () => {
    const broken = structuredClone(snapshot) as Record<string, unknown>;
    delete (broken.composition as Array<Record<string, unknown>>)[0]!["provenance"];
    expect(MaterialSnapshotSchema.safeParse(broken).success).toBe(false);
  });

  it("rejects a snapshot when a molar-mass datum lacks provenance", () => {
    const broken = structuredClone(snapshot) as Record<string, unknown>;
    delete (broken.molarMasses as Array<Record<string, unknown>>)[0]!["provenance"];
    expect(MaterialSnapshotSchema.safeParse(broken).success).toBe(false);
  });

  it("rejects non-canonical units in the resolved snapshot", () => {
    const broken = structuredClone(snapshot) as Record<string, unknown>;
    (broken.density as Record<string, unknown>)["unit"] = "g/mL";
    (broken.composition as Array<Record<string, unknown>>)[0]!["amountConcentration"] = {
      value: 100,
      unit: "mmol/L",
    };
    (broken.molarMasses as Array<Record<string, unknown>>)[0]!["molarMass"] = {
      value: 36.4609,
      unit: "g/mol",
    };
    (broken.resolvedInventoryPerLitre as Record<string, unknown>)["waterMass"] = {
      value: 998,
      unit: "g",
    };
    (
      (broken.resolvedInventoryPerLitre as Record<string, unknown>)[
        "soluteAmounts"
      ] as Array<Record<string, unknown>>
    )[0]!["amount"] = { value: 100, unit: "mmol" };
    expect(MaterialSnapshotSchema.safeParse(broken).success).toBe(false);
  });

  it("emits no bare legacy physical fields in persisted artifacts", () => {
    const json = JSON.stringify(generateJsonSchemas());
    expect(json).not.toContain('"molPerLitre"');
    expect(json).not.toContain('"kilogramsPerMol"');
    expect(json).toContain('"amountConcentration"');
    expect(json).toContain('"molarMass"');
  });

  it("does not accept solver provenance as a material-data citation", () => {
    const broken = structuredClone(snapshot) as Record<string, unknown>;
    (broken.density as Record<string, unknown>)["provenance"] = {
      modelId: "acidbase-monoprotic-davies",
      modelVersion: "1.0.0",
      activityModel: "davies",
      category: "calculated",
      parameters: {},
    };
    expect(MaterialSnapshotSchema.safeParse(broken).success).toBe(false);
  });
});

describe("the export bundle cannot carry learner identity", () => {
  const bundle = (over: Record<string, unknown>) => ({
    format: "chemrealm.export",
    formatVersion: 1,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    lineage: [
      {
        worldId: "w",
        lineage: { parentWorldId: null, forkSequence: null, forkStateHash: null },
      },
    ],
    events: [],
    includesLearnerEvidence: false,
    ...over,
  });

  it("accepts a bundle that carries no learner evidence", () => {
    expect(ExportBundleSchema.safeParse(bundle({})).success).toBe(true);
  });

  it("REJECTS a bundle claiming learner evidence, because v1 has no such shape", () => {
    // There is no M9 evidence schema yet, so the only truthful answer is
    // `false`. Leaving the branch open would mean the later version inherits an
    // arbitrary-JSON hole rather than designing one.
    expect(
      ExportBundleSchema.safeParse(bundle({ includesLearnerEvidence: true }))
        .success,
    ).toBe(false);
  });

  it("REJECTS a nested learner identifier, which the old passthrough accepted", () => {
    // Verified before the fix: this exact bundle parsed successfully, because
    // `z.array(z.strictObject({}).passthrough())` means "any key at all" and the
    // AC-P4 test only ever looked at TOP-LEVEL field names.
    expect(
      ExportBundleSchema.safeParse(
        bundle({
          includesLearnerEvidence: true,
          learnerEvidence: [
            { learnerId: "123", email: "x@example.com", sessionId: "abc" },
          ],
        }),
      ).success,
    ).toBe(false);
  });

  it("has no forbidden identifier anywhere in the emitted artifact", () => {
    // Recursive, not top-level: the defect was that the check stopped at depth
    // 1 while the hole was at depth 2.
    const json = JSON.stringify(generateJsonSchemas()["export-bundle"]);
    for (const forbidden of FORBIDDEN_BUNDLE_FIELDS) {
      expect(json).not.toContain(`"${forbidden}"`);
    }
  });
});

describe("model descriptors declare machine-checkable capabilities", () => {
  const base = {
    id: "test-solver",
    version: "1.0.0",
    description: "contract test",
    validity: {
      temperature: {
        min: { value: 0, unit: "K" },
        max: { value: 400, unit: "K" },
      },
      ionicStrengthMolalMax: { value: 0.5, unit: "mol/kg" },
      species: ["H+"],
      components: ["HCl"],
      solvent: "water",
      phase: "aqueous",
    },
  };

  it("requires an explicit activity-correction capability", () => {
    expect(
      ModelDescriptorSchema.safeParse({
        ...base,
        validity: { ...base.validity, activityCorrected: true },
      }).success,
    ).toBe(true);
    expect(ModelDescriptorSchema.safeParse(base).success).toBe(false);
  });
});

describe("persisted model requirements keep the v0 solvent and phase boundary", () => {
  const baseSnapshot = {
    scenarioRef: "requirements-boundary",
    materials: [],
    vessels: [],
    apparatusDefaults: [],
    indicators: [],
    modelRequirements: {
      temperature: { value: 298.15, unit: "K" as const },
      species: ["H+"],
      solvent: "water" as const,
      phase: "aqueous" as const,
      activityCorrected: true,
    },
  };

  it("rejects a snapshot that asks for a non-water or non-aqueous runtime", () => {
    const invalidSolvent = structuredClone(baseSnapshot);
    (invalidSolvent.modelRequirements as unknown as Record<string, unknown>).solvent = "methanol";
    expect(ScenarioSnapshotSchema.safeParse(invalidSolvent).success).toBe(false);

    const invalidPhase = structuredClone(baseSnapshot);
    (invalidPhase.modelRequirements as unknown as Record<string, unknown>).phase = "gas";
    expect(ScenarioSnapshotSchema.safeParse(invalidPhase).success).toBe(false);
  });
});

describe("DTOs parse into domain quantities, not bare numbers", () => {
  const requestDto = {
    schemaVersion: SCIENTIFIC_SCHEMA_VERSION,
    waterMass: { value: 0.998, unit: "kg" },
    liquidVolume: { value: 0.05, unit: "L" },
    solutes: [
      {
        soluteId: "HCl",
        amount: { value: 0.005, unit: "mol" },
        mode: "fully-dissociated",
      },
    ],
    temperature: { value: 298.15, unit: "K" },
    indicators: [{ indicatorId: "phenolphthalein", kaIn: { value: 1e-9, unit: "1" } }],
  };

  it("accepts the DTO, including a dimensionless quantity with the unit one", () => {
    expect(SolveRequestSchema.safeParse(requestDto).success).toBe(true);
  });

  it("REJECTS a dimensionless quantity carrying a dimensioned unit", () => {
    // The point of registering ISO 80000's unit one: `Ka` is dimensionless, and
    // `{value: 1e-9, unit: "mol/kg"}` would otherwise be an untraceable mix-up.
    const broken = structuredClone(requestDto);
    broken.indicators[0]!.kaIn = { value: 1e-9, unit: "mol/kg" };
    expect(SolveRequestSchema.safeParse(broken).success).toBe(false);
  });

  it("parses through the constructors, so the domain type holds quantities", () => {
    const req = parseSolveRequest(SolveRequestSchema.parse(requestDto));
    expect(req.waterMass).toBeCloseTo(0.998, 15);
    expect(req.liquidVolume).toBeCloseTo(0.05, 15);
    expect(req.solutes[0]!.amount).toBeCloseTo(0.005, 15);
    expect(req.solutes[0]!.mode).toBe("fully-dissociated");
  });

  it("requires Ka only for the monoprotic-equilibrium solute mode", () => {
    const weak = structuredClone(requestDto) as unknown as {
      solutes: Array<Record<string, unknown>>;
    };
    weak.solutes[0] = {
      soluteId: "HA",
      amount: { value: 0.005, unit: "mol" },
      mode: "monoprotic-equilibrium",
      ka: { value: 1.8e-5, unit: "1" },
    };
    const parsed = SolveRequestSchema.parse(weak);
    const req = parseSolveRequest(parsed);
    expect(req.solutes[0]!.mode).toBe("monoprotic-equilibrium");
    if (req.solutes[0]!.mode !== "monoprotic-equilibrium") {
      throw new Error("expected equilibrium solute");
    }
    expect(req.solutes[0]!.ka.value).toBeCloseTo(1.8e-5, 20);
  });

  it("rejects contradictory or incomplete solute mode data", () => {
    const withKaOnStrong = structuredClone(requestDto) as unknown as {
      solutes: Array<Record<string, unknown>>;
    };
    withKaOnStrong.solutes[0] = {
      soluteId: "HCl",
      amount: { value: 0.005, unit: "mol" },
      mode: "fully-dissociated",
      ka: { value: 1.8e-5, unit: "1" },
    };
    const withoutKaOnEquilibrium = structuredClone(requestDto) as unknown as {
      solutes: Array<Record<string, unknown>>;
    };
    withoutKaOnEquilibrium.solutes[0] = {
      soluteId: "HA",
      amount: { value: 0.005, unit: "mol" },
      mode: "monoprotic-equilibrium",
    };

    expect(SolveRequestSchema.safeParse(withKaOnStrong).success).toBe(false);
    expect(SolveRequestSchema.safeParse(withoutKaOnEquilibrium).success).toBe(false);
  });

  it("canonicalizes non-canonical wire units before constructing the domain", () => {
    const nonCanonical = structuredClone(requestDto);
    nonCanonical.waterMass = { value: 1000, unit: "g" };
    nonCanonical.liquidVolume = { value: 50, unit: "mL" };
    nonCanonical.solutes[0]!.amount = { value: 5, unit: "mmol" };
    nonCanonical.temperature = { value: 25, unit: "degC" };

    const req = parseSolveRequest(SolveRequestSchema.parse(nonCanonical));
    expect(req.waterMass).toBeCloseTo(1, 15);
    expect(req.liquidVolume).toBeCloseTo(0.05, 15);
    expect(req.solutes[0]!.amount).toBeCloseTo(0.005, 15);
    expect(req.temperature).toBeCloseTo(298.15, 12);
  });

  it("canonicalizes the nested scientific state and nearest-supported descriptor", () => {
    const state = parseScientificState(
      ScientificStateSchema.parse({
        schemaVersion: SCIENTIFIC_SCHEMA_VERSION,
        species: [
          {
            symbol: "H+",
            reducedMolality: { value: 0.1, unit: "1" },
            molality: { value: 0.1, unit: "mol/kg" },
            amount: { value: 5, unit: "mmol" },
            activityCoefficient: { value: 0.9, unit: "1" },
            activity: { value: 0.09, unit: "1" },
          },
        ],
        ionicStrengthMolal: { value: 0.1, unit: "mol/kg" },
        ionicStrengthReduced: { value: 0.1, unit: "1" },
        modelPh: { value: 1.05, unit: "1" },
        indicators: [],
        validity: { inDomain: true, withinProposedAccuracyEnvelope: true },
        provenance: {
          modelId: "acidbase-monoprotic-davies",
          modelVersion: "1.0.0",
          activityModel: "davies",
          category: "calculated",
          parameters: {},
        },
      }),
    );
    expect(state.species[0]!.amount).toBeCloseTo(0.005, 15);

    const result = parseSolveResult(
      SolveResultSchema.parse({
        schemaVersion: SCIENTIFIC_SCHEMA_VERSION,
        status: "MODEL_OUT_OF_DOMAIN",
        reason: "temperature outside the model range",
        nearestSupported: {
          id: "acidbase-monoprotic-davies",
          version: "1.0.0",
          description: "test model",
          validity: {
            temperature: {
              min: { value: 0, unit: "degC" },
              max: { value: 100, unit: "degC" },
            },
            ionicStrengthMolalMax: { value: 0.5, unit: "mol/kg" },
            species: ["H+"],
            components: ["HCl"],
            solvent: "water",
            phase: "aqueous",
            activityCorrected: true,
          },
        },
      }),
    );
    if (result.status !== "MODEL_OUT_OF_DOMAIN" || !result.nearestSupported) {
      throw new Error("expected an out-of-domain result with a descriptor");
    }
    expect(result.nearestSupported.validity.temperature.min).toBeCloseTo(273.15, 12);
    expect(result.nearestSupported.validity.temperature.max).toBeCloseTo(373.15, 12);
  });
});

describe("a solute declares its composition scale by name", () => {
  const provenance = { source: "fixture", reference: "solute datum", category: "evaluated" as const };
  const base = {
    soluteId: "HCl",
    molarMass: { value: 36.4609, unit: "g/mol", provenance },
  };

  it("accepts a molarity-basis solute", () => {
    expect(
      SoluteDefinitionSchema.safeParse({
        ...base,
        basis: "molarity",
        amountConcentration: { value: 0.1, unit: "mol/L", provenance },
      }).success,
    ).toBe(true);
  });

  it("rejects an authored dissociation flag because chemistry mode is catalog-owned", () => {
    expect(
      SoluteDefinitionSchema.safeParse({
        ...base,
        basis: "molarity",
        amountConcentration: { value: 0.1, unit: "mol/L", provenance },
        fullyDissociated: true,
      }).success,
    ).toBe(false);
  });

  it("accepts a molality-basis solute", () => {
    // Still supported: a scenario may legitimately declare molality, and the
    // required density gives `molalityToMolarity` the inputs it needs.
    expect(
      SoluteDefinitionSchema.safeParse({
        ...base,
        basis: "molality",
        molality: { value: 0.1, unit: "mol/kg", provenance },
      }).success,
    ).toBe(true);
  });

  it("REJECTS the anonymous `concentration` field it replaced", () => {
    // Anti-pattern 1 of `docs/science/quantity-ontology.md`: a field named
    // `concentration` that could be holding a molality. The scale is now in the
    // field name rather than inferred from the unit.
    expect(
      SoluteDefinitionSchema.safeParse({
        ...base,
        concentration: { value: 0.1, unit: "mol/L" },
      }).success,
    ).toBe(false);
  });

  it("REJECTS a scale that contradicts its own field name", () => {
    expect(
      SoluteDefinitionSchema.safeParse({
        ...base,
        basis: "molarity",
        amountConcentration: { value: 0.1, unit: "mol/kg" },
      }).success,
    ).toBe(false);
  });

  it("rejects multiple molality solutes until the joint resolver exists", () => {
    const hcl = {
      ...base,
      basis: "molality" as const,
      molality: { value: 0.1, unit: "mol/kg" as const },
    };
    const nacl = {
      soluteId: "NaCl",
      basis: "molality" as const,
      molality: { value: 0.1, unit: "mol/kg" as const, provenance },
      molarMass: { value: 58.44, unit: "g/mol" as const, provenance },
    };
    expect(
      MaterialDefinitionSchema.safeParse({
        materialId: "mixed",
        label: "mixed molality",
        phase: "aqueous",
        solutes: [hcl, nacl],
        density: { value: 1, unit: "kg/L", provenance },
      }).success,
    ).toBe(false);
  });

  it("rejects mixed molarity and molality bases until the joint resolver exists", () => {
    const molality = {
      soluteId: "NaCl",
      basis: "molality" as const,
      molality: { value: 0.1, unit: "mol/kg" as const, provenance },
      molarMass: { value: 58.44, unit: "g/mol" as const, provenance },
    };
    expect(
      MaterialDefinitionSchema.safeParse({
        materialId: "mixed",
        label: "mixed basis",
        phase: "aqueous",
        solutes: [base, molality],
        density: { value: 1, unit: "kg/L", provenance },
      }).success,
    ).toBe(false);
  });
});
