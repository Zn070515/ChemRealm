import { describe, expect, it } from "vitest";

import { ionicStrengthMolal, kelvin, SCENARIO_SCHEMA_VERSION, type ModelDescriptor } from "@chemrealm/schema";
import { SolverRegistry, StubSolverAdapter } from "@chemrealm/sci";
import { createInitialState, createLog, scenarioSnapshotHash } from "@chemrealm/world";

import { createWorld, createWorldFromScenario, resolveScenario } from "./world-creation.js";

const descriptor: ModelDescriptor = {
  id: "test-solver",
  version: "1.0.0",
  description: "composition-root contract solver",
  validity: {
    temperature: { min: kelvin(273.15), max: kelvin(373.15) },
    ionicStrengthMolalMax: ionicStrengthMolal(0.5),
    species: ["H+"],
    components: ["HCl"],
    solvent: "water",
    phase: "aqueous",
    activityCorrected: true,
  },
};

const provenance = {
  source: "fixture",
  reference: "authoring resolver test",
  category: "evaluated" as const,
};

const volumeProfile = {
  profileId: "flask-250-profile",
  profileVersion: "1.0.0",
  representation: "piecewise-linear" as const,
  maxVolume: { value: 0.25, unit: "L" as const },
  maxHeight: { value: 100, unit: "mm" as const },
  roundTripTolerance: { value: 1e-12, unit: "L" as const },
  knots: [
    { volume: { value: 0, unit: "L" as const }, height: { value: 0, unit: "mm" as const } },
    { volume: { value: 0.25, unit: "L" as const }, height: { value: 100, unit: "mm" as const } },
  ],
  provenance,
};

const authoringScenario = {
  schemaVersion: SCENARIO_SCHEMA_VERSION,
  contentVersion: 1,
  scenarioRef: "hcl-authoring",
  title: "HCl authoring resolver",
  materials: [
    {
      materialId: "hcl-0.1",
      label: "0.100 mol/L hydrochloric acid",
      phase: "aqueous" as const,
      solutes: [
        {
          soluteId: "HCl",
          basis: "molarity" as const,
          amountConcentration: { value: 100, unit: "mmol/L" as const, provenance },
          molarMass: { value: 36.4609, unit: "g/mol" as const, provenance },
        },
      ],
      density: { value: 1.002, unit: "kg/L" as const, provenance },
    },
  ],
  vessels: [
    {
      vesselId: "flask",
      kind: "conicalFlask" as const,
      capacity: { value: 250, unit: "mL" as const },
      geometryRef: "flask-250",
      volumeProfile,
      position: { unit: "mm" as const, x: 0, y: 0 },
      initialContents: [{ materialId: "hcl-0.1", volume: { value: 25, unit: "mL" as const } }],
    },
  ],
  apparatus: [],
  indicators: [],
  modelRequirements: {
    temperature: { value: 25, unit: "degC" as const },
    species: ["H+"],
    solvent: "water" as const,
    phase: "aqueous" as const,
    activityCorrected: true,
  },
};

function registry(): SolverRegistry {
  return new SolverRegistry([
    new StubSolverAdapter({
      descriptor,
      parameters: { Kw: 1e-14 },
      outcome: {
        status: "NOT_CONVERGED",
        code: "OUTER_ITERATION_LIMIT",
        reason: "composition-root numerical failure",
        residual: 1,
        iterations: 1,
      },
    }),
  ]);
}

describe("composition-level world creation", () => {
  it("emits genesis with the resolver's complete solver identity", () => {
    const result = createWorld(registry(), {
      worldId: "world-m3",
      scenario: authoringScenario,
      seed: null,
    });

    expect(result.accepted).toBe(true);
    if (!result.accepted) throw new Error("expected compatible world");
    expect(result.event.payload.solverConfig).toEqual({
      id: "test-solver",
      version: "1.0.0",
      parameters: { Kw: 1e-14 },
    });
    expect(() => createLog(result.event)).not.toThrow();
    expect(() => createInitialState(result.event)).not.toThrow();
  });

  it("rejects incompatible requirements before emitting WorldCreated", () => {
    const result = createWorld(registry(), {
      worldId: "world-m3-rejected",
      scenario: {
        ...authoringScenario,
        modelRequirements: {
          ...authoringScenario.modelRequirements,
          temperature: { value: 1000, unit: "K" },
        },
      },
      seed: null,
    });

    expect(result).toMatchObject({ accepted: false, status: "incompatible" });
    expect("event" in result).toBe(false);
    if (result.accepted) throw new Error("expected incompatible requirements");
    expect(result.reason).toContain("temperature");
  });

  it("rejects a scenario component the resolved model cannot accept", () => {
    const result = createWorld(registry(), {
      worldId: "world-unsupported-component",
      scenario: {
        ...authoringScenario,
        materials: [{
          ...authoringScenario.materials[0]!,
          solutes: [{
            ...authoringScenario.materials[0]!.solutes[0]!,
            soluteId: "HNO3",
          }],
        }],
      },
      seed: null,
    });

    expect(result).toMatchObject({ accepted: false, status: "incompatible" });
    expect("event" in result).toBe(false);
    if (result.accepted) throw new Error("expected unsupported component rejection");
    expect(result.reason).toContain("HNO3");
  });

  it("resolves authored scenario quantities into a self-contained genesis snapshot", () => {
    const result = createWorld(registry(), {
      worldId: "world-authored",
      scenario: authoringScenario,
      seed: null,
    });

    expect(result.accepted).toBe(true);
    if (!result.accepted) throw new Error("expected authored scenario to resolve");
    const material = result.event.payload.scenarioSnapshot.materials[0]!;
    expect(material.density).toEqual({ value: 1.002, unit: "kg/L", provenance });
    expect(material.composition[0]?.amountConcentration).toEqual({ value: 0.1, unit: "mol/L" });
    expect(material.molarMasses[0]?.molarMass).toEqual({ value: 0.0364609, unit: "kg/mol" });
    expect(material.resolvedInventoryPerLitre).toEqual({
      waterMass: { value: 0.99835391, unit: "kg" },
      soluteAmounts: [{ soluteId: "HCl", amount: { value: 0.1, unit: "mol" } }],
    });
    expect(result.event.payload.scenarioSnapshot.vessels[0]?.capacity).toEqual({
      value: 0.25,
      unit: "L",
    });
    expect("initialContents" in result.event.payload.scenarioSnapshot.vessels[0]!).toBe(false);
  });

  it("does not let the new-world path bypass authored scenario resolution", () => {
    const resolved = resolveScenario(authoringScenario);
    const result = createWorld(registry(), {
      worldId: "world-resolved-bypass",
      scenario: resolved,
      seed: null,
    });

    expect(result).toMatchObject({ accepted: false, status: "invalid" });
  });

  it("normalizes equivalent authoring units to the same snapshot representation", () => {
    const canonicalAuthoring = {
      ...authoringScenario,
      materials: [
        {
          ...authoringScenario.materials[0]!,
          solutes: [
            {
              ...authoringScenario.materials[0]!.solutes[0]!,
              amountConcentration: { value: 0.1, unit: "mol/L" as const, provenance },
              molarMass: { value: 0.0364609, unit: "kg/mol" as const, provenance },
            },
          ],
        },
      ],
      vessels: [
        {
          ...authoringScenario.vessels[0]!,
          capacity: { value: 0.25, unit: "L" as const },
          initialContents: [{ materialId: "hcl-0.1", volume: { value: 0.025, unit: "L" as const } }],
        },
      ],
      modelRequirements: {
        ...authoringScenario.modelRequirements,
        temperature: { value: 298.15, unit: "K" as const },
      },
    };

    expect(resolveScenario(authoringScenario)).toEqual(resolveScenario(canonicalAuthoring));
    expect(scenarioSnapshotHash(resolveScenario(authoringScenario))).toBe(
      scenarioSnapshotHash(resolveScenario(canonicalAuthoring)),
    );
  });

  it("resolves the supported molality authoring basis into per-litre inventory", () => {
    const molalityScenario = {
      ...authoringScenario,
      materials: [
        {
          ...authoringScenario.materials[0]!,
          solutes: [
            {
              soluteId: "HCl",
              basis: "molality" as const,
              molality: { value: 0.1, unit: "mol/kg" as const, provenance },
              molarMass: { value: 0.0364609, unit: "kg/mol" as const, provenance },
            },
          ],
        },
      ],
    };

    const snapshot = resolveScenario(molalityScenario);
    const material = snapshot.materials[0]!;
    const expectedWaterMass = 1.002 / (1 + 0.1 * 0.0364609);
    expect(material.resolvedInventoryPerLitre.waterMass.value).toBeCloseTo(expectedWaterMass, 14);
    expect(material.composition[0]?.amountConcentration.value).toBeCloseTo(
      0.1 * expectedWaterMass,
      14,
    );
  });

  it("creates initial contents as events after resolving genesis", () => {
    const result = createWorldFromScenario(registry(), {
      worldId: "world-authored-events",
      scenario: authoringScenario,
      seed: null,
    });

    expect(result.accepted).toBe(true);
    if (!result.accepted) throw new Error("expected authored world creation");
    expect(result.events).toHaveLength(2);
    expect(result.events[1]?.type).toBe("MaterialCharged");
    expect(result.state.canonical.byVessel.flask?.liquidVolume).toBe(0.025);
    expect(result.state.canonical.byVessel.flask?.waterMass).toBeCloseTo(
      0.99835391 * 0.025,
      15,
    );
  });

  it.each([
    ["unknown material", "missing-material", "unknown material"],
    ["capacity overflow", "hcl-0.1", "would exceed"],
  ] as const)("rejects %s without exposing a partial event log", (_label, materialId, expectedReason) => {
    const invalid = structuredClone(authoringScenario) as typeof authoringScenario;
    invalid.vessels[0]!.initialContents[0] = {
      materialId,
      volume: materialId === "missing-material"
        ? { value: 25, unit: "mL" }
        : { value: 300, unit: "mL" },
    };

    const result = createWorldFromScenario(registry(), {
      worldId: `world-invalid-${materialId}`,
      scenario: invalid,
      seed: null,
    });

    expect(result).toMatchObject({
      accepted: false,
      status: "invalid",
      reason: expect.stringContaining(expectedReason),
    });
    expect("events" in result).toBe(false);
  });

  it("refuses to create a world when authored scientific provenance is missing", () => {
    const missingProvenance = structuredClone(authoringScenario) as unknown as {
      materials: Array<{ solutes: Array<{ molarMass: Record<string, unknown> }> }>;
    };
    delete missingProvenance.materials[0]!.solutes[0]!.molarMass.provenance;

    expect(createWorldFromScenario(registry(), {
      worldId: "world-missing-provenance",
      scenario: missingProvenance,
      seed: null,
    })).toMatchObject({ accepted: false, status: "invalid" });
  });
});
