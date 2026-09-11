import { describe, expect, it } from "vitest";

import { ScenarioSchema, SoluteDefinitionSchema } from "./content.js";
import { FORBIDDEN_BUNDLE_FIELDS, ExportBundleSchema } from "./export.js";
import { DomainEventSchema, WorldBranchedSchema, WorldCreatedSchema } from "./events.js";
import { MIGRATIONS, migrate } from "./migrate.js";
import {
  ScientificStateSchema,
  SolveResultSchema,
  SpeciesStateSchema,
} from "./scientific.js";
import {
  CURRENT_SCHEMA_VERSION,
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
            amountConcentration: { value: 0.1, unit: "mol/L" },
            molarMass: { value: 36.4609, unit: "g/mol" },
            fullyDissociated: true,
          },
        ],
        density: { value: 1.002, unit: "kg/L" },
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
  it("registers a no-op 1 -> 1 so the runner is exercised every run", () => {
    expect(MIGRATIONS.some((m) => m.from === 1 && m.to === 1)).toBe(true);
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
            amountConcentration: { value: 0.1, unit: "mol/L" },
            molarMass: { value: 36.46, unit: "g/mol" },
            fullyDissociated: true,
          },
        ],
        density: { value: 1.002, unit: "kg/L" },
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
        (s.vessels[0] as Record<string, unknown>)["capacity"] = { value: 5, unit: "mol" };
      }),
    ).toBe(false);
  });

  it("rejects a density declared in mol/L", () => {
    expect(
      acceptsIf((s) => {
        (s.materials[0] as Record<string, unknown>)["density"] = { value: 1, unit: "mol/L" };
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
      status: "MODEL_OUT_OF_DOMAIN",
      reason: "temperature outside the model's range",
    });
    expect(refused.success).toBe(true);
  });

  it("has no bare-number shortcut in the outcome union", () => {
    const json = JSON.stringify(generateJsonSchemas()["solve-result"]);
    expect(json).toContain("MODEL_OUT_OF_DOMAIN");
    expect(json).toContain("NOT_CONVERGED");
    expect(json).not.toContain('"ph"');
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

describe("a solute declares its composition scale by name", () => {
  const base = {
    soluteId: "HCl",
    molarMass: { value: 36.4609, unit: "g/mol" },
    fullyDissociated: true,
  };

  it("accepts a molarity-basis solute", () => {
    expect(
      SoluteDefinitionSchema.safeParse({
        ...base,
        basis: "molarity",
        amountConcentration: { value: 0.1, unit: "mol/L" },
      }).success,
    ).toBe(true);
  });

  it("accepts a molality-basis solute", () => {
    // Still supported: a scenario may legitimately declare molality, and the
    // required density gives `molalityToMolarity` the inputs it needs.
    expect(
      SoluteDefinitionSchema.safeParse({
        ...base,
        basis: "molality",
        molality: { value: 0.1, unit: "mol/kg" },
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
});
