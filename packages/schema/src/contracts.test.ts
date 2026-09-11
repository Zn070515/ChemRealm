import { describe, expect, it } from "vitest";

import { ScenarioSchema } from "./content.js";
import { FORBIDDEN_BUNDLE_FIELDS, ExportBundleSchema } from "./export.js";
import { DomainEventSchema, WorldBranchedSchema, WorldCreatedSchema } from "./events.js";
import { MIGRATIONS, migrate } from "./migrate.js";
import {
  ScientificStateSchema,
  SolverOutcomeSchema,
  SpeciesStateSchema,
} from "./scientific.js";
import {
  CURRENT_SCHEMA_VERSION,
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

  it("rejects a vessel that tries to carry its own contents", () => {
    const withContents = {
      id: "flask",
      kind: "conicalFlask",
      capacity: { value: 0.25, unit: "L" },
      geometryRef: "flask-250",
      position: { unit: "mm", x: 0, y: 0 },
      contents: { waterMass: { value: 1, unit: "kg" } },
    };
    // Zod strips unknown keys by default rather than failing, so assert that
    // the key does not SURVIVE — which is the property that matters.
    const parsed = VesselSchema.parse(withContents) as Record<string, unknown>;
    expect(parsed).not.toHaveProperty("contents");
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
            concentration: { value: 0.1, unit: "mol/L" },
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
        volumeProfileRef: "flask-250",
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

describe("AC-P3 / AC-P4 — no identity in persisted or exported shapes", () => {
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

describe("AC-R8 — the migration harness exists before it is needed", () => {
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
    const refused = SolverOutcomeSchema.safeParse({
      status: "MODEL_OUT_OF_DOMAIN",
      reason: "temperature outside the model's range",
    });
    expect(refused.success).toBe(true);
  });

  it("has no bare-number shortcut in the outcome union", () => {
    const json = JSON.stringify(generateJsonSchemas()["solver-outcome"]);
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
