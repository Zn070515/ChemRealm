/** GENERATED FILE — edit contracts/scientific/*.json instead. */
export const NATIVE_MODEL_CONTRACT = {
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "contractVersion": 1,
  "model": {
    "id": "acidbase-monoprotic-davies",
    "version": "2.0.0",
    "description": "Self-consistent monoprotic aqueous acid-base equilibrium with Davies activity coefficients at 25 °C.",
    "validity": {
      "temperature": {
        "min": {
          "value": 298.15,
          "unit": "K"
        },
        "max": {
          "value": 298.15,
          "unit": "K"
        }
      },
      "ionicStrengthMolalMax": {
        "value": 0.5,
        "unit": "mol/kg"
      },
      "species": [
        "H2O",
        "H+",
        "OH-",
        "HOAc",
        "OAc-",
        "Na+",
        "Cl-"
      ],
      "components": [
        "HCl",
        "NaOH",
        "HOAc",
        "NaOAc"
      ],
      "solvent": "water",
      "phase": "aqueous",
      "activityCorrected": true
    }
  },
  "solverConfig": {
    "id": "acidbase-monoprotic-davies",
    "version": "2.0.0",
    "parameters": {
      "Kw": 1e-14,
      "Ka_HOAc": 0.000017539,
      "Davies_A": 0.509,
      "Davies_b": 0.3,
      "standardMolality": 1,
      "neutralAcidActivityCoefficient": 1,
      "waterActivity": 1,
      "numericPrecisionSignificantDigits": 12,
      "numericPolicyVersion": 1
    }
  },
  "domain": {
    "totalSoluteMolality": {
      "min": 1e-9,
      "max": 0.5,
      "unit": "mol/kg"
    },
    "proposedAccuracyEnvelopeIonicStrength": {
      "value": 0.12,
      "unit": "mol/kg"
    }
  }
} as const;
