//! Rust implementation of the ChemRealm v0 Scientific Reality Core.
//!
//! The public bridge is deliberately small: a strict, versioned JSON request
//! enters and a strict JSON payload leaves.  The host binary and the WASM
//! export both call the same `solve_canonical_json` function, so neither
//! deployment target gets a second chemistry implementation.

use serde::{de::Error as _, Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::BTreeMap;

include!(concat!(env!("OUT_DIR"), "/version_constants.rs"));
include!(concat!(env!("OUT_DIR"), "/native_schema_contract.rs"));

const KW: f64 = 1.0e-14;
const KA_HOAC: f64 = 1.7539e-5;
const DAVIES_A: f64 = 0.509;
const DAVIES_B: f64 = 0.3;
const STANDARD_MOLALITY: f64 = 1.0;
const NEUTRAL_ACID_GAMMA: f64 = 1.0;
const WATER_ACTIVITY: f64 = 1.0;
const TEMPERATURE_K: f64 = 298.15;
const MIN_TOTAL_SOLUTE: f64 = 1.0e-9;
const MAX_TOTAL_SOLUTE: f64 = 0.5;
const MAX_IONIC_STRENGTH: f64 = 0.5;
const PROPOSED_ENVELOPE: f64 = 0.12;
const INNER_TOLERANCE: f64 = 1.0e-15;
const OUTER_TOLERANCE: f64 = 1.0e-15;
const INNER_ITERATION_LIMIT: usize = 100;
const OUTER_ITERATION_LIMIT: usize = 200;
const HYDROGEN_LOWER: f64 = 1.0e-16;
const HYDROGEN_UPPER: f64 = 1.0;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Quantity {
    value: f64,
    unit: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct RawSolute {
    solute_id: String,
    amount: Quantity,
    mode: String,
    #[serde(default)]
    #[serde(skip_serializing_if = "Option::is_none")]
    ka: Option<Quantity>,
    #[serde(skip)]
    ka_present: bool,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct RawSoluteWire {
    solute_id: String,
    amount: Quantity,
    mode: String,
    #[serde(default)]
    ka: Option<Quantity>,
}

impl<'de> Deserialize<'de> for RawSolute {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let value = serde_json::Value::deserialize(deserializer)?;
        let object = value
            .as_object()
            .ok_or_else(|| D::Error::custom("solute must be a JSON object"))?;
        let ka_present = object.contains_key("ka");
        let wire: RawSoluteWire = serde_json::from_value(value).map_err(D::Error::custom)?;
        Ok(Self {
            solute_id: wire.solute_id,
            amount: wire.amount,
            mode: wire.mode,
            ka: wire.ka,
            ka_present,
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct RawIndicator {
    indicator_id: String,
    ka_in: Quantity,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct RawRequest {
    schema_version: u32,
    water_mass: Quantity,
    liquid_volume: Quantity,
    solutes: Vec<RawSolute>,
    temperature: Quantity,
    indicators: Vec<RawIndicator>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct RawExecutionContext {
    source_state_hash: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct RawBridgeEnvelope {
    bridge_schema_version: u32,
    request: RawRequest,
    context: RawExecutionContext,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct BackendPayload {
    bridge_schema_version: u32,
    backend: BackendIdentity,
    request_hash: String,
    source_state_hash: String,
    result: NativeResult,
    expressions: Vec<ScientificExpressionDto>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct BackendIdentity {
    id: &'static str,
    version: &'static str,
}

#[derive(Debug, Serialize)]
#[serde(tag = "status", rename_all = "camelCase")]
enum NativeResult {
    #[serde(rename = "OK")]
    Ok {
        #[serde(rename = "schemaVersion")]
        schema_version: u32,
        state: ScientificStateDto,
    },
    #[serde(rename = "MODEL_OUT_OF_DOMAIN")]
    ModelOutOfDomain {
        #[serde(rename = "schemaVersion")]
        schema_version: u32,
        reason: String,
        #[serde(rename = "nearestSupported")]
        nearest_supported: ModelDescriptorDto,
    },
    #[serde(rename = "NOT_CONVERGED")]
    NotConverged {
        #[serde(rename = "schemaVersion")]
        schema_version: u32,
        code: String,
        reason: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        residual: Option<f64>,
        iterations: usize,
    },
    #[serde(rename = "INVALID_INPUT")]
    InvalidInput {
        #[serde(rename = "schemaVersion")]
        schema_version: u32,
        violations: Vec<InputViolationDto>,
    },
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct InputViolationDto {
    field: String,
    message: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ModelDescriptorDto {
    id: &'static str,
    version: &'static str,
    description: &'static str,
    validity: ModelValidityDto,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ModelValidityDto {
    temperature: TemperatureRangeDto,
    ionic_strength_molal_max: Quantity,
    species: [&'static str; 7],
    components: [&'static str; 4],
    solvent: &'static str,
    phase: &'static str,
    activity_corrected: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct TemperatureRangeDto {
    min: Quantity,
    max: Quantity,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ScientificStateDto {
    schema_version: u32,
    species: Vec<SpeciesStateDto>,
    ionic_strength_molal: Quantity,
    ionic_strength_reduced: Quantity,
    model_ph: Quantity,
    indicators: Vec<IndicatorStateDto>,
    validity: ValidityStatusDto,
    provenance: ProvenanceDto,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct SpeciesStateDto {
    symbol: &'static str,
    reduced_molality: Quantity,
    molality: Quantity,
    amount: Quantity,
    activity_coefficient: Quantity,
    activity: Quantity,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct IndicatorStateDto {
    indicator_id: String,
    protonation_ratio: f64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ValidityStatusDto {
    in_domain: bool,
    within_proposed_accuracy_envelope: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ProvenanceDto {
    model_id: &'static str,
    model_version: &'static str,
    activity_model: &'static str,
    category: &'static str,
    parameters: BTreeMap<String, f64>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ScientificExpressionDto {
    schema_version: u32,
    id: String,
    equation_id: String,
    label: &'static str,
    expression: String,
    formula: String,
    substitutions: Vec<ScientificExpressionSubstitutionDto>,
    omitted_terms: Vec<String>,
    producer_id: &'static str,
    producer_version: &'static str,
    model_id: &'static str,
    model_version: &'static str,
    source_state_hash: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ScientificExpressionSubstitutionDto {
    symbol: String,
    value: f64,
    unit: &'static str,
}

#[derive(Debug, Clone, Copy)]
struct Totals {
    strong_acid_chloride: f64,
    strong_base_sodium: f64,
    acid_family: f64,
}

#[derive(Debug, Clone, Copy)]
struct Species {
    hydrogen: f64,
    hydroxide: f64,
    neutral_acid: f64,
    conjugate_base: f64,
    sodium: f64,
    chloride: f64,
}

#[derive(Debug, Clone, Copy)]
struct Candidate {
    species: Species,
    ionic_strength: f64,
    charge_residual: f64,
}

#[derive(Debug, Clone, Copy)]
struct SolveSuccess {
    candidate: Candidate,
}

#[derive(Debug)]
enum SolveFailure {
    OutOfDomain(String),
    NotConverged {
        code: &'static str,
        reason: String,
        residual: Option<f64>,
        iterations: usize,
    },
}

#[derive(Debug, Clone, Copy)]
struct ValidatedRequest<'a> {
    request: &'a RawRequest,
    water_mass: f64,
}

fn quantity(value: f64, unit: &'static str) -> Quantity {
    Quantity {
        value,
        unit: unit.to_string(),
    }
}

fn model_descriptor() -> ModelDescriptorDto {
    ModelDescriptorDto {
        id: MODEL_ID,
        version: MODEL_VERSION,
        description: "Self-consistent monoprotic aqueous acid-base equilibrium with Davies activity coefficients at 25 °C.",
        validity: ModelValidityDto {
            temperature: TemperatureRangeDto {
                min: quantity(TEMPERATURE_K, "K"),
                max: quantity(TEMPERATURE_K, "K"),
            },
            ionic_strength_molal_max: quantity(MAX_IONIC_STRENGTH, "mol/kg"),
            species: ["H2O", "H+", "OH-", "HOAc", "OAc-", "Na+", "Cl-"],
            components: ["HCl", "NaOH", "HOAc", "NaOAc"],
            solvent: "water",
            phase: "aqueous",
            activity_corrected: true,
        },
    }
}

fn invalid(violations: Vec<InputViolationDto>) -> NativeResult {
    NativeResult::InvalidInput {
        schema_version: SCIENTIFIC_SCHEMA_VERSION,
        violations,
    }
}

fn out_of_domain(reason: impl Into<String>) -> NativeResult {
    NativeResult::ModelOutOfDomain {
        schema_version: SCIENTIFIC_SCHEMA_VERSION,
        reason: reason.into(),
        nearest_supported: model_descriptor(),
    }
}

fn not_converged(
    code: &'static str,
    reason: impl Into<String>,
    iterations: usize,
    residual: Option<f64>,
) -> NativeResult {
    NativeResult::NotConverged {
        schema_version: SCIENTIFIC_SCHEMA_VERSION,
        code: code.to_string(),
        reason: reason.into(),
        residual: residual.filter(|value| value.is_finite()),
        iterations,
    }
}

fn require_unit(quantity: &Quantity, expected: &'static str, field: &str) -> Result<f64, String> {
    if quantity.unit != expected {
        return Err(format!(
            "{field} must use canonical unit {expected}, got {}",
            quantity.unit
        ));
    }
    if !quantity.value.is_finite() {
        return Err(format!("{field} must be finite"));
    }
    Ok(quantity.value)
}

fn request_hash(input: &str) -> String {
    // Hash the exact UTF-8 bytes crossing the bridge. The TypeScript facade
    // computes the same digest before handing the request to an executor, so
    // the backend cannot replace a request identity with a self-reported one.
    let digest = Sha256::digest(input.as_bytes());
    let mut encoded = String::with_capacity(64);
    for byte in digest {
        use std::fmt::Write;
        write!(&mut encoded, "{byte:02x}").expect("writing to String cannot fail");
    }
    format!("sha256:{encoded}")
}

fn validate_request(request: &RawRequest) -> Result<ValidatedRequest<'_>, Box<NativeResult>> {
    if request.schema_version != SCIENTIFIC_SCHEMA_VERSION {
        return Err(Box::new(invalid(vec![InputViolationDto {
            field: "schemaVersion".to_string(),
            message: format!(
                "expected scientific schema version {}, got {}",
                SCIENTIFIC_SCHEMA_VERSION, request.schema_version
            ),
        }])));
    }

    let mut violations = Vec::new();
    let water_mass = match require_unit(&request.water_mass, "kg", "waterMass") {
        Ok(value) if value > 0.0 => value,
        Ok(_) => {
            violations.push(InputViolationDto {
                field: "waterMass".to_string(),
                message: "water mass must be greater than zero".to_string(),
            });
            1.0
        }
        Err(message) => {
            violations.push(InputViolationDto {
                field: "waterMass".to_string(),
                message,
            });
            1.0
        }
    };
    let _liquid_volume = match require_unit(&request.liquid_volume, "L", "liquidVolume") {
        Ok(value) if value > 0.0 => value,
        Ok(_) => {
            violations.push(InputViolationDto {
                field: "liquidVolume".to_string(),
                message: "liquid volume must be greater than zero".to_string(),
            });
            1.0
        }
        Err(message) => {
            violations.push(InputViolationDto {
                field: "liquidVolume".to_string(),
                message,
            });
            1.0
        }
    };
    let temperature = match require_unit(&request.temperature, "K", "temperature") {
        Ok(value) if value >= 0.0 => value,
        Ok(_) => {
            violations.push(InputViolationDto {
                field: "temperature".to_string(),
                message: "temperature must be non-negative".to_string(),
            });
            TEMPERATURE_K
        }
        Err(message) => {
            violations.push(InputViolationDto {
                field: "temperature".to_string(),
                message,
            });
            TEMPERATURE_K
        }
    };

    for (index, solute) in request.solutes.iter().enumerate() {
        if solute.solute_id.trim().is_empty() {
            violations.push(InputViolationDto {
                field: format!("solutes[{index}].soluteId"),
                message: "solute id must be non-empty".to_string(),
            });
        }
        match require_unit(&solute.amount, "mol", &format!("solutes[{index}].amount")) {
            Ok(value) if value >= 0.0 => {}
            Ok(_) => violations.push(InputViolationDto {
                field: format!("solutes[{index}].amount"),
                message: "solute amount must be non-negative".to_string(),
            }),
            Err(message) => violations.push(InputViolationDto {
                field: format!("solutes[{index}].amount"),
                message,
            }),
        }
        match solute.mode.as_str() {
            "fully-dissociated" => {
                if solute.ka_present {
                    violations.push(InputViolationDto {
                        field: format!("solutes[{index}].mode"),
                        message: "fully dissociated solutes cannot carry Ka".to_string(),
                    });
                }
            }
            "monoprotic-equilibrium" => match (solute.ka_present, solute.ka.as_ref()) {
                (true, Some(ka)) => match require_unit(ka, "1", &format!("solutes[{index}].ka")) {
                    Ok(value) if value > 0.0 => {}
                    Ok(_) => violations.push(InputViolationDto {
                        field: format!("solutes[{index}].ka"),
                        message: "Ka must be positive".to_string(),
                    }),
                    Err(message) => violations.push(InputViolationDto {
                        field: format!("solutes[{index}].ka"),
                        message,
                    }),
                },
                (true, None) => violations.push(InputViolationDto {
                    field: format!("solutes[{index}].ka"),
                    message: "equilibrium Ka must be an object, not null".to_string(),
                }),
                (false, None) => violations.push(InputViolationDto {
                    field: format!("solutes[{index}].ka"),
                    message: "equilibrium solutes require Ka".to_string(),
                }),
                (false, Some(_)) => violations.push(InputViolationDto {
                    field: format!("solutes[{index}].ka"),
                    message: "equilibrium Ka presence could not be established".to_string(),
                }),
            },
            _ => violations.push(InputViolationDto {
                field: format!("solutes[{index}].mode"),
                message: "solute mode is not supported".to_string(),
            }),
        }
    }

    for (index, indicator) in request.indicators.iter().enumerate() {
        if indicator.indicator_id.trim().is_empty() {
            violations.push(InputViolationDto {
                field: format!("indicators[{index}].indicatorId"),
                message: "indicator id must be non-empty".to_string(),
            });
        }
        match require_unit(&indicator.ka_in, "1", &format!("indicators[{index}].kaIn")) {
            Ok(value) if value > 0.0 => {}
            Ok(_) => violations.push(InputViolationDto {
                field: format!("indicators[{index}].kaIn"),
                message: "indicator Ka must be positive".to_string(),
            }),
            Err(message) => violations.push(InputViolationDto {
                field: format!("indicators[{index}].kaIn"),
                message,
            }),
        }
    }
    if !violations.is_empty() {
        return Err(Box::new(invalid(violations)));
    }

    if temperature < TEMPERATURE_K {
        return Err(Box::new(out_of_domain(
            "temperature is below the acid-base model's 25 °C domain",
        )));
    }
    if temperature > TEMPERATURE_K {
        return Err(Box::new(out_of_domain(
            "temperature is above the acid-base model's 25 °C domain",
        )));
    }

    let total_amount: f64 = request
        .solutes
        .iter()
        .map(|solute| solute.amount.value)
        .sum();
    let total_molality = total_amount / water_mass;
    if !total_molality.is_finite()
        || !(MIN_TOTAL_SOLUTE..=MAX_TOTAL_SOLUTE).contains(&total_molality)
    {
        return Err(Box::new(out_of_domain(format!(
            "total analytical solute molality {total_molality} mol/kg is outside the v0 domain [{MIN_TOTAL_SOLUTE}, {MAX_TOTAL_SOLUTE}] mol/kg"
        ))));
    }

    for solute in &request.solutes {
        if !matches!(solute.solute_id.as_str(), "HCl" | "NaOH" | "HOAc" | "NaOAc") {
            return Err(Box::new(out_of_domain(format!(
                "solute {} is outside the v0 acid-base model",
                solute.solute_id
            ))));
        }
    }

    Ok(ValidatedRequest {
        request,
        water_mass,
    })
}

fn aggregate(request: &RawRequest, water_mass: f64) -> Result<Totals, SolveFailure> {
    let mut totals = Totals {
        strong_acid_chloride: 0.0,
        strong_base_sodium: 0.0,
        acid_family: 0.0,
    };
    for solute in &request.solutes {
        let amount = solute.amount.value;
        let contribution = amount / water_mass / STANDARD_MOLALITY;
        match solute.solute_id.as_str() {
            "HCl" => {
                if solute.mode != "fully-dissociated" {
                    return Err(SolveFailure::OutOfDomain(
                        "HCl requires fully-dissociated mode".to_string(),
                    ));
                }
                totals.strong_acid_chloride += contribution;
            }
            "NaOH" => {
                if solute.mode != "fully-dissociated" {
                    return Err(SolveFailure::OutOfDomain(
                        "NaOH requires fully-dissociated mode".to_string(),
                    ));
                }
                totals.strong_base_sodium += contribution;
            }
            "HOAc" => {
                let ka = solute.ka.as_ref().map(|value| value.value);
                if solute.mode != "monoprotic-equilibrium" || ka != Some(KA_HOAC) {
                    return Err(SolveFailure::OutOfDomain(
                        "HOAc Ka or mode does not match the frozen model".to_string(),
                    ));
                }
                totals.acid_family += contribution;
            }
            "NaOAc" => {
                if solute.mode != "fully-dissociated" {
                    return Err(SolveFailure::OutOfDomain(
                        "NaOAc requires fully-dissociated mode".to_string(),
                    ));
                }
                totals.strong_base_sodium += contribution;
                totals.acid_family += contribution;
            }
            unsupported => {
                return Err(SolveFailure::OutOfDomain(format!(
                    "solute {unsupported} is outside the v0 acid-base model"
                )))
            }
        }
    }
    Ok(totals)
}

// ---------------------------------------------------------------------------
// Deterministic math — ported from the TypeScript v1 numeric policy.
// ---------------------------------------------------------------------------

const LN2_HIGH: f64 = 0.6931471803691238;
const LN2_LOW: f64 = 1.9082150941723212e-10;
const LOG2_10_HIGH: f64 = 3.321928024291992;
const LOG2_10_LOW: f64 = 7.059537034787032e-8;
#[allow(clippy::approx_constant)]
const LOG10_2_HIGH: f64 = 0.3010299956639812;
const LOG10_2_LOW: f64 = -4.786261105275507e-18;
#[allow(clippy::approx_constant)]
const LOG10_E_HIGH: f64 = 0.4342944819032518;
const LOG10_E_LOW: f64 = 2.7651128918916604e-17;
#[allow(clippy::approx_constant)]
const SQRT2: f64 = 1.4142135623730951;
const SPLIT_FACTOR: f64 = 134217729.0;
const MIN_NORMAL: f64 = 2.2250738585072014e-308;

#[derive(Clone, Copy)]
struct DoubleDouble {
    hi: f64,
    lo: f64,
}

fn two_sum(first: f64, second: f64) -> DoubleDouble {
    let sum = first + second;
    let virtual_value = sum - first;
    let error = (first - (sum - virtual_value)) + (second - virtual_value);
    DoubleDouble { hi: sum, lo: error }
}

fn two_product(first: f64, second: f64) -> DoubleDouble {
    let product = first * second;
    let first_split = SPLIT_FACTOR * first;
    let first_high = first_split - (first_split - first);
    let first_low = first - first_high;
    let second_split = SPLIT_FACTOR * second;
    let second_high = second_split - (second_split - second);
    let second_low = second - second_high;
    let error =
        ((first_high * second_high - product) + first_high * second_low + first_low * second_high)
            + first_low * second_low;
    DoubleDouble {
        hi: product,
        lo: error,
    }
}

fn add_dd(first: DoubleDouble, second: DoubleDouble) -> DoubleDouble {
    let leading = two_sum(first.hi, second.hi);
    let low = leading.lo + first.lo + second.lo;
    let hi = leading.hi + low;
    DoubleDouble {
        hi,
        lo: low - (hi - leading.hi),
    }
}

fn multiply_dd(first: DoubleDouble, second: DoubleDouble) -> DoubleDouble {
    let leading = two_product(first.hi, second.hi);
    let cross = add_dd(
        two_product(first.hi, second.lo),
        add_dd(
            two_product(first.lo, second.hi),
            two_product(first.lo, second.lo),
        ),
    );
    add_dd(leading, cross)
}

fn negate_dd(value: DoubleDouble) -> DoubleDouble {
    DoubleDouble {
        hi: -value.hi,
        lo: -value.lo,
    }
}

fn divide_dd(numerator: DoubleDouble, denominator: DoubleDouble) -> DoubleDouble {
    let quotient = numerator.hi / denominator.hi;
    let product = multiply_dd(
        DoubleDouble {
            hi: quotient,
            lo: 0.0,
        },
        denominator,
    );
    let residual = add_dd(numerator, negate_dd(product));
    let correction = (residual.hi + residual.lo) / denominator.hi;
    add_dd(
        DoubleDouble {
            hi: quotient,
            lo: 0.0,
        },
        DoubleDouble {
            hi: correction,
            lo: 0.0,
        },
    )
}

fn divide_by_integer(value: DoubleDouble, divisor: f64) -> DoubleDouble {
    DoubleDouble {
        hi: value.hi / divisor,
        lo: value.lo / divisor,
    }
}

pub fn det_exp10(value: f64) -> f64 {
    assert!(value.is_finite(), "det_exp10 input must be finite");
    assert!(
        (-0.137..=0.0).contains(&value),
        "det_exp10 input outside domain"
    );
    let reduced_log2 = add_dd(
        two_product(value, LOG2_10_HIGH),
        two_product(value, LOG2_10_LOW),
    );
    let k = (reduced_log2.hi + reduced_log2.lo + 0.5).floor() as i32;
    let fraction = add_dd(
        DoubleDouble {
            hi: reduced_log2.hi - f64::from(k),
            lo: reduced_log2.lo,
        },
        DoubleDouble { hi: 0.0, lo: 0.0 },
    );
    let r = multiply_dd(
        fraction,
        DoubleDouble {
            hi: LN2_HIGH,
            lo: LN2_LOW,
        },
    );
    let mut term = DoubleDouble { hi: 1.0, lo: 0.0 };
    let mut sum = term;
    for index in 1..=18 {
        term = divide_by_integer(multiply_dd(term, r), f64::from(index));
        sum = add_dd(sum, term);
    }
    let exponent = k + 1023;
    assert!(exponent > 0 && exponent < 0x7ff);
    let power = f64::from_bits((exponent as u64) << 52);
    let scaled = multiply_dd(sum, DoubleDouble { hi: power, lo: 0.0 });
    scaled.hi + scaled.lo
}

pub fn det_log10(value: f64) -> f64 {
    assert!(value.is_finite(), "det_log10 input must be finite");
    assert!(value >= MIN_NORMAL, "det_log10 input outside domain");
    let bits = value.to_bits();
    let mut high = (bits >> 32) as u32;
    let low = bits as u32;
    let mut exponent = (((high >> 20) & 0x7ff) as i32) - 1023;
    high = (high & 0x800f_ffff) | (1023 << 20);
    let mut mantissa = f64::from_bits(((high as u64) << 32) | low as u64);
    if mantissa > SQRT2 {
        mantissa *= 0.5;
        exponent += 1;
    }
    let t = divide_dd(two_sum(mantissa, -1.0), two_sum(mantissa, 1.0));
    let t_squared = multiply_dd(t, t);
    let mut term = t;
    let mut sum = DoubleDouble { hi: 0.0, lo: 0.0 };
    for index in 0..16 {
        sum = add_dd(sum, divide_by_integer(term, f64::from(2 * index + 1)));
        term = multiply_dd(term, t_squared);
    }
    let natural_log_mantissa = DoubleDouble {
        hi: 2.0 * sum.hi,
        lo: 2.0 * sum.lo,
    };
    let exponent_part = multiply_dd(
        DoubleDouble {
            hi: f64::from(exponent),
            lo: 0.0,
        },
        DoubleDouble {
            hi: LOG10_2_HIGH,
            lo: LOG10_2_LOW,
        },
    );
    let mantissa_part = multiply_dd(
        natural_log_mantissa,
        DoubleDouble {
            hi: LOG10_E_HIGH,
            lo: LOG10_E_LOW,
        },
    );
    let result = add_dd(exponent_part, mantissa_part);
    result.hi + result.lo
}

fn davies_gamma(ionic_strength: f64) -> Result<f64, SolveFailure> {
    if !ionic_strength.is_finite() || ionic_strength < 0.0 {
        return Err(SolveFailure::NotConverged {
            code: "INVALID_NUMERIC_ARGUMENT",
            reason: "reduced ionic strength must be finite and non-negative".to_string(),
            residual: None,
            iterations: 0,
        });
    }
    if ionic_strength > MAX_IONIC_STRENGTH {
        return Err(SolveFailure::OutOfDomain(format!(
            "Davies reduced ionic strength {ionic_strength} is outside the v0 domain [0, {MAX_IONIC_STRENGTH}]"
        )));
    }
    let square_root = ionic_strength.sqrt();
    let term = square_root / (1.0 + square_root) - DAVIES_B * ionic_strength;
    let log10_gamma = -DAVIES_A * term;
    let gamma = det_exp10(log10_gamma);
    if !gamma.is_finite() || gamma <= 0.0 {
        return Err(SolveFailure::NotConverged {
            code: "INVALID_NUMERIC_ARGUMENT",
            reason: "Davies activity coefficient is not finite and positive".to_string(),
            residual: None,
            iterations: 0,
        });
    }
    Ok(gamma)
}

fn species_at(hydrogen: f64, ionic_strength: f64, totals: Totals) -> Result<Species, SolveFailure> {
    if !hydrogen.is_finite() || hydrogen <= 0.0 {
        return Err(SolveFailure::NotConverged {
            code: "INVALID_NUMERIC_ARGUMENT",
            reason: "reduced hydrogen molality must be finite and positive".to_string(),
            residual: None,
            iterations: 0,
        });
    }
    let gamma = davies_gamma(ionic_strength)?;
    let kw_conditional = KW / (gamma * gamma);
    let ka_conditional = KA_HOAC / (gamma * gamma);
    let hydroxide = kw_conditional / hydrogen;
    let dissociated = totals.acid_family * ka_conditional / (ka_conditional + hydrogen);
    let neutral_acid = totals.acid_family - dissociated;
    let species = Species {
        hydrogen,
        hydroxide,
        neutral_acid,
        conjugate_base: dissociated,
        sodium: totals.strong_base_sodium,
        chloride: totals.strong_acid_chloride,
    };
    if [
        species.hydrogen,
        species.hydroxide,
        species.neutral_acid,
        species.conjugate_base,
        species.sodium,
        species.chloride,
    ]
    .iter()
    .any(|value| !value.is_finite() || *value < 0.0)
    {
        return Err(SolveFailure::NotConverged {
            code: "INVALID_NUMERIC_ARGUMENT",
            reason: "species evaluation is not finite and non-negative".to_string(),
            residual: None,
            iterations: 0,
        });
    }
    Ok(species)
}

fn ionic_strength_from_species(species: Species) -> f64 {
    0.5 * (species.hydrogen
        + species.hydroxide
        + species.conjugate_base
        + species.sodium
        + species.chloride)
}

fn charge_residual(species: Species) -> f64 {
    species.hydrogen + species.sodium
        - species.hydroxide
        - species.conjugate_base
        - species.chloride
}

fn ionic_strength_residual(
    hydrogen: f64,
    ionic_strength: f64,
    totals: Totals,
) -> Result<f64, SolveFailure> {
    let species = species_at(hydrogen, ionic_strength, totals)?;
    Ok(ionic_strength_from_species(species) - ionic_strength)
}

fn candidate_at(
    hydrogen: f64,
    ionic_strength: f64,
    totals: Totals,
) -> Result<Candidate, SolveFailure> {
    let species = species_at(hydrogen, ionic_strength, totals)?;
    Ok(Candidate {
        species,
        ionic_strength,
        charge_residual: charge_residual(species),
    })
}

fn solve_inner(hydrogen: f64, totals: Totals) -> Result<Candidate, SolveFailure> {
    let mut lower = 0.0;
    let mut upper = MAX_IONIC_STRENGTH;
    let lower_residual = ionic_strength_residual(hydrogen, lower, totals)?;
    let upper_residual = ionic_strength_residual(hydrogen, upper, totals)?;

    if lower_residual < 0.0 {
        return Err(SolveFailure::NotConverged {
            code: "INNER_BRACKET_NOT_FOUND",
            reason: "inner ionic-strength fixed-point bracket could not be established".to_string(),
            residual: Some(upper_residual),
            iterations: 0,
        });
    }
    if upper_residual > INNER_TOLERANCE {
        return Err(SolveFailure::OutOfDomain(format!(
            "ionic-strength fixed point exceeds the v0 limit of {MAX_IONIC_STRENGTH} mol/kg"
        )));
    }
    if lower_residual.abs() <= INNER_TOLERANCE {
        return candidate_at(hydrogen, lower, totals);
    }
    if upper_residual.abs() <= INNER_TOLERANCE {
        return candidate_at(hydrogen, upper, totals);
    }

    for iteration in 1..=INNER_ITERATION_LIMIT {
        let midpoint = lower + 0.5 * (upper - lower);
        let midpoint_residual = ionic_strength_residual(hydrogen, midpoint, totals)?;
        if midpoint_residual.abs() <= INNER_TOLERANCE {
            return candidate_at(hydrogen, midpoint, totals);
        }
        let collapsed = midpoint == lower || midpoint == upper;
        if midpoint_residual > 0.0 {
            lower = midpoint;
        } else {
            upper = midpoint;
        }
        if collapsed {
            let final_value = lower + 0.5 * (upper - lower);
            let final_residual = ionic_strength_residual(hydrogen, final_value, totals)?;
            if final_residual.abs() <= INNER_TOLERANCE {
                return candidate_at(hydrogen, final_value, totals);
            }
            return Err(SolveFailure::NotConverged {
                code: "INNER_ITERATION_LIMIT",
                reason: "inner ionic-strength solve reached a floating-point interval without meeting tolerance".to_string(),
                residual: Some(final_residual),
                iterations: iteration,
            });
        }
    }

    let final_value = lower + 0.5 * (upper - lower);
    Err(SolveFailure::NotConverged {
        code: "INNER_ITERATION_LIMIT",
        reason: "inner ionic-strength solve reached its iteration limit".to_string(),
        residual: Some(ionic_strength_residual(hydrogen, final_value, totals)?),
        iterations: INNER_ITERATION_LIMIT,
    })
}

fn boundary_candidate(hydrogen: f64, totals: Totals) -> Result<Candidate, SolveFailure> {
    candidate_at(hydrogen, MAX_IONIC_STRENGTH, totals)
}

fn locate_valid_domain_edge(
    outside_hydrogen: f64,
    inside_hydrogen: f64,
    inside_candidate: Candidate,
    totals: Totals,
) -> Result<(f64, Candidate), SolveFailure> {
    let mut outside = outside_hydrogen;
    let mut inside = inside_hydrogen;
    let mut candidate = inside_candidate;

    for _ in 0..OUTER_ITERATION_LIMIT {
        let midpoint = outside + 0.5 * (inside - outside);
        if midpoint == outside || midpoint == inside {
            return Ok((inside, candidate));
        }
        match solve_inner(midpoint, totals) {
            Ok(evaluated) => {
                inside = midpoint;
                candidate = evaluated;
            }
            Err(SolveFailure::OutOfDomain(_)) => {
                outside = midpoint;
            }
            Err(error) => return Err(error),
        }
    }

    Ok((inside, candidate))
}

fn ideal_hydrogen_root(totals: Totals) -> Result<f64, SolveFailure> {
    let residual = |hydrogen: f64| {
        totals.strong_base_sodium + hydrogen
            - KW / hydrogen
            - totals.acid_family * KA_HOAC / (KA_HOAC + hydrogen)
            - totals.strong_acid_chloride
    };
    let mut lower = HYDROGEN_LOWER;
    let mut upper = HYDROGEN_UPPER;
    if residual(lower) >= 0.0 || residual(upper) <= 0.0 {
        return Err(SolveFailure::NotConverged {
            code: "OUTER_BRACKET_NOT_FOUND",
            reason: "ideal hydrogen root is outside the bracket domain".to_string(),
            residual: None,
            iterations: 0,
        });
    }
    for _ in 0..OUTER_ITERATION_LIMIT {
        let midpoint = lower + 0.5 * (upper - lower);
        let collapsed = midpoint == lower || midpoint == upper;
        if residual(midpoint) < 0.0 {
            lower = midpoint;
        } else {
            upper = midpoint;
        }
        if collapsed {
            break;
        }
    }
    Ok(lower + 0.5 * (upper - lower))
}

fn solve_reduced(totals: Totals) -> Result<SolveSuccess, SolveFailure> {
    if WATER_ACTIVITY != 1.0 {
        return Err(SolveFailure::OutOfDomain(
            "v0 acid-base model requires the unit water-activity convention".to_string(),
        ));
    }
    let ideal_root = ideal_hydrogen_root(totals)?;
    let mut lower = HYDROGEN_LOWER;
    let mut upper = HYDROGEN_UPPER;
    let mut bracket_found = false;

    for span in [3.0, 10.0, 100.0, 1000.0] {
        let lower_seeds = [
            HYDROGEN_LOWER.max(ideal_root / span),
            HYDROGEN_LOWER.max(ideal_root * 0.5),
        ];
        let candidate_upper = HYDROGEN_UPPER
            .min(MAX_IONIC_STRENGTH)
            .min(ideal_root * span);
        for candidate_lower in lower_seeds {
            let evaluated_lower = solve_inner(candidate_lower, totals);
            let evaluated_upper = solve_inner(candidate_upper, totals);
            if let (Err(SolveFailure::OutOfDomain(_)), Err(SolveFailure::OutOfDomain(_))) =
                (&evaluated_lower, &evaluated_upper)
            {
                return Err(SolveFailure::OutOfDomain(
                    "converged ionic strength is outside the v0 limit of 0.5 mol/kg".to_string(),
                ));
            }

            match (&evaluated_lower, &evaluated_upper) {
                (Err(SolveFailure::OutOfDomain(_)), Ok(upper_value)) => {
                    let boundary = boundary_candidate(candidate_lower, totals)?;
                    if boundary.charge_residual >= -OUTER_TOLERANCE {
                        return Err(SolveFailure::OutOfDomain(
                            "converged ionic strength is outside the v0 limit of 0.5 mol/kg"
                                .to_string(),
                        ));
                    }
                    if upper_value.charge_residual > OUTER_TOLERANCE {
                        let (edge_hydrogen, edge_candidate) = locate_valid_domain_edge(
                            candidate_lower,
                            candidate_upper,
                            *upper_value,
                            totals,
                        )?;
                        if edge_candidate.charge_residual < 0.0 {
                            lower = edge_hydrogen;
                            upper = candidate_upper;
                            bracket_found = true;
                            break;
                        }
                        return Err(SolveFailure::OutOfDomain(
                            "converged ionic strength is outside the v0 limit of 0.5 mol/kg"
                                .to_string(),
                        ));
                    }
                }
                (Ok(lower_value), Err(SolveFailure::OutOfDomain(_))) => {
                    let boundary = boundary_candidate(candidate_upper, totals)?;
                    if boundary.charge_residual <= OUTER_TOLERANCE {
                        return Err(SolveFailure::OutOfDomain(
                            "converged ionic strength is outside the v0 limit of 0.5 mol/kg"
                                .to_string(),
                        ));
                    }
                    let (edge_hydrogen, edge_candidate) = locate_valid_domain_edge(
                        candidate_upper,
                        candidate_lower,
                        *lower_value,
                        totals,
                    )?;
                    if edge_candidate.charge_residual > 0.0 {
                        lower = candidate_lower;
                        upper = edge_hydrogen;
                        bracket_found = true;
                        break;
                    }
                    return Err(SolveFailure::OutOfDomain(
                        "converged ionic strength is outside the v0 limit of 0.5 mol/kg"
                            .to_string(),
                    ));
                }
                (Ok(lower_value), Ok(upper_value))
                    if lower_value.charge_residual < 0.0 && upper_value.charge_residual > 0.0 =>
                {
                    lower = candidate_lower;
                    upper = candidate_upper;
                    bracket_found = true;
                    break;
                }
                _ => {}
            }
        }
        if bracket_found {
            break;
        }
    }

    if !bracket_found {
        return Err(SolveFailure::NotConverged {
            code: "OUTER_BRACKET_NOT_FOUND",
            reason: "outer charge-balance bracket could not be established within the valid ionic-strength envelope".to_string(),
            residual: None,
            iterations: 4,
        });
    }

    let mut final_candidate: Option<Candidate> = None;
    let mut outer_iterations = 0;
    for iteration in 1..=OUTER_ITERATION_LIMIT {
        outer_iterations = iteration;
        let midpoint = lower + 0.5 * (upper - lower);
        let candidate = match solve_inner(midpoint, totals) {
            Ok(candidate) => candidate,
            Err(SolveFailure::OutOfDomain(_)) => {
                return Err(SolveFailure::OutOfDomain(
                    "converged ionic strength is outside the v0 limit of 0.5 mol/kg".to_string(),
                ));
            }
            Err(error) => return Err(error),
        };
        final_candidate = Some(candidate);
        if candidate.charge_residual.abs() <= OUTER_TOLERANCE {
            break;
        }
        let collapsed = midpoint == lower || midpoint == upper;
        if candidate.charge_residual < 0.0 {
            lower = midpoint;
        } else {
            upper = midpoint;
        }
        if collapsed {
            return Err(SolveFailure::NotConverged {
                code: "OUTER_ITERATION_LIMIT",
                reason: "outer charge-balance interval collapsed before meeting tolerance"
                    .to_string(),
                residual: Some(candidate.charge_residual),
                iterations: iteration,
            });
        }
    }
    let candidate = final_candidate.ok_or_else(|| SolveFailure::NotConverged {
        code: "OUTER_BRACKET_NOT_FOUND",
        reason: "outer charge-balance solve produced no candidate".to_string(),
        residual: None,
        iterations: OUTER_ITERATION_LIMIT,
    })?;
    if candidate.charge_residual.abs() > OUTER_TOLERANCE {
        return Err(SolveFailure::NotConverged {
            code: "OUTER_ITERATION_LIMIT",
            reason: "outer charge-balance solve reached its iteration limit".to_string(),
            residual: Some(candidate.charge_residual),
            iterations: outer_iterations,
        });
    }
    let recomputed = ionic_strength_from_species(candidate.species);
    if recomputed > MAX_IONIC_STRENGTH + INNER_TOLERANCE {
        return Err(SolveFailure::OutOfDomain(format!(
            "converged ionic strength {recomputed} mol/kg exceeds the v0 limit of {MAX_IONIC_STRENGTH} mol/kg"
        )));
    }
    Ok(SolveSuccess {
        candidate: Candidate {
            ionic_strength: recomputed,
            ..candidate
        },
    })
}

fn build_state(
    request: &ValidatedRequest<'_>,
    solved: SolveSuccess,
) -> Result<ScientificStateDto, SolveFailure> {
    let candidate = solved.candidate;
    let gamma = davies_gamma(candidate.ionic_strength)?;
    let items: [(&'static str, f64, f64); 6] = [
        ("H+", candidate.species.hydrogen, gamma),
        ("OH-", candidate.species.hydroxide, gamma),
        ("HOAc", candidate.species.neutral_acid, NEUTRAL_ACID_GAMMA),
        ("OAc-", candidate.species.conjugate_base, gamma),
        ("Na+", candidate.species.sodium, gamma),
        ("Cl-", candidate.species.chloride, gamma),
    ];
    let species = items
        .iter()
        .map(|(symbol, reduced, activity_coefficient)| SpeciesStateDto {
            symbol,
            reduced_molality: quantity(*reduced, "1"),
            molality: quantity(*reduced * STANDARD_MOLALITY, "mol/kg"),
            amount: quantity(*reduced * STANDARD_MOLALITY * request.water_mass, "mol"),
            activity_coefficient: quantity(*activity_coefficient, "1"),
            activity: quantity(*activity_coefficient * *reduced, "1"),
        })
        .collect::<Vec<_>>();
    let hydrogen_activity = candidate.species.hydrogen * gamma;
    let model_ph = -det_log10(hydrogen_activity);
    let indicators = request
        .request
        .indicators
        .iter()
        .map(|indicator| IndicatorStateDto {
            indicator_id: indicator.indicator_id.clone(),
            protonation_ratio: indicator.ka_in.value / (hydrogen_activity * gamma),
        })
        .collect();
    let mut parameters = BTreeMap::new();
    parameters.insert("Davies_A".to_string(), DAVIES_A);
    parameters.insert("Davies_b".to_string(), DAVIES_B);
    parameters.insert("Ka_HOAc".to_string(), KA_HOAC);
    parameters.insert("Kw".to_string(), KW);
    parameters.insert(
        "neutralAcidActivityCoefficient".to_string(),
        NEUTRAL_ACID_GAMMA,
    );
    parameters.insert(
        "numericPolicyVersion".to_string(),
        NUMERIC_POLICY_VERSION as f64,
    );
    parameters.insert("numericPrecisionSignificantDigits".to_string(), 12.0);
    parameters.insert("standardMolality".to_string(), STANDARD_MOLALITY);
    parameters.insert("waterActivity".to_string(), WATER_ACTIVITY);
    Ok(ScientificStateDto {
        schema_version: SCIENTIFIC_SCHEMA_VERSION,
        species,
        ionic_strength_molal: quantity(candidate.ionic_strength * STANDARD_MOLALITY, "mol/kg"),
        ionic_strength_reduced: quantity(candidate.ionic_strength, "1"),
        model_ph: quantity(model_ph, "1"),
        indicators,
        validity: ValidityStatusDto {
            in_domain: true,
            within_proposed_accuracy_envelope: candidate.ionic_strength <= PROPOSED_ENVELOPE,
        },
        provenance: ProvenanceDto {
            model_id: MODEL_ID,
            model_version: MODEL_VERSION,
            activity_model: "Davies",
            category: "calculated",
            parameters,
        },
    })
}

fn substitution(
    symbol: impl Into<String>,
    value: f64,
    unit: &'static str,
) -> ScientificExpressionSubstitutionDto {
    ScientificExpressionSubstitutionDto {
        symbol: symbol.into(),
        value,
        unit,
    }
}

fn substituted(symbol: &str, value: f64, unit: &str) -> String {
    format!("{symbol}[{value:.8} {unit}]")
}

fn build_expressions(
    state: &ScientificStateDto,
    source_state_hash: String,
) -> Vec<ScientificExpressionDto> {
    let value = |symbol: &str, field: &str| -> f64 {
        state
            .species
            .iter()
            .find(|entry| entry.symbol == symbol)
            .map(|entry| match field {
                "reduced" => entry.reduced_molality.value,
                "molality" => entry.molality.value,
                "activity" => entry.activity.value,
                "gamma" => entry.activity_coefficient.value,
                _ => unreachable!(),
            })
            .expect("native expression requires known species")
    };
    let h = value("H+", "molality");
    let na = value("Na+", "molality");
    let oh = value("OH-", "molality");
    let cl = value("Cl-", "molality");
    let oac = value("OAc-", "molality");
    let ha = value("HOAc", "molality");
    let h_activity = value("H+", "activity");
    let oh_activity = value("OH-", "activity");
    let ha_activity = value("HOAc", "activity");
    let oac_activity = value("OAc-", "activity");
    let h_gamma = value("H+", "gamma");
    let h_reduced = value("H+", "reduced");
    let ionic_strength = state.ionic_strength_molal.value;
    let reduced_ionic_strength = state.ionic_strength_reduced.value;
    let acid_family_total = ha + oac;

    let make = |equation_id: &str,
                formula: String,
                expression: String,
                substitutions: Vec<ScientificExpressionSubstitutionDto>,
                omitted_terms: Vec<String>| {
        ScientificExpressionDto {
            schema_version: SCIENTIFIC_EXPRESSION_SCHEMA_VERSION,
            id: equation_id.to_string(),
            equation_id: equation_id.to_string(),
            label: "exact",
            expression,
            formula,
            substitutions,
            omitted_terms,
            producer_id: "scientific-core",
            producer_version: EXPRESSION_PRODUCER_VERSION,
            model_id: MODEL_ID,
            model_version: MODEL_VERSION,
            source_state_hash: source_state_hash.clone(),
        }
    };

    let mut expressions = vec![
        make(
            "charge-balance",
            "m(H+) + m(Na+) = m(OH-) + m(Cl-) + m(OAc-)".to_string(),
            format!(
                "{} + {} = {} + {} + {}",
                substituted("m(H+)", h, "mol/kg"),
                substituted("m(Na+)", na, "mol/kg"),
                substituted("m(OH-)", oh, "mol/kg"),
                substituted("m(Cl-)", cl, "mol/kg"),
                substituted("m(OAc-)", oac, "mol/kg")
            ),
            vec![
                substitution("m(H+)", h, "mol/kg"),
                substitution("m(Na+)", na, "mol/kg"),
                substitution("m(OH-)", oh, "mol/kg"),
                substitution("m(Cl-)", cl, "mol/kg"),
                substitution("m(OAc-)", oac, "mol/kg"),
            ],
            vec![],
        ),
        make(
            "water-autoprotolysis",
            "a(H+) · a(OH-) = Kw".to_string(),
            format!(
                "{} · {} = {}",
                substituted("a(H+)", h_activity, "1"),
                substituted("a(OH-)", oh_activity, "1"),
                substituted("Kw", KW, "1")
            ),
            vec![
                substitution("a(H+)", h_activity, "1"),
                substitution("a(OH-)", oh_activity, "1"),
                substitution("Kw", KW, "1"),
            ],
            vec![
                "non-unit water activity is not modeled in the v0 unit-water-activity convention"
                    .to_string(),
            ],
        ),
        make(
            "ionic-strength-fixed-point",
            "I(species) - I = 0".to_string(),
            format!(
                "{} - {} = 0",
                substituted("I(species)", ionic_strength, "mol/kg"),
                substituted("I", ionic_strength, "mol/kg")
            ),
            vec![
                substitution("I(species)", ionic_strength, "mol/kg"),
                substitution("I", ionic_strength, "mol/kg"),
            ],
            vec![],
        ),
        make(
            "davies-activity-coefficient",
            "log10(γ_i) = -A(√Î/(1+√Î) - bÎ)".to_string(),
            format!(
                "{} = -{} · (√{} / (1 + √{}) - {} · {})",
                substituted("log10(γ(H+))", det_log10(h_gamma), "1"),
                substituted("A", DAVIES_A, "1"),
                substituted("Î", reduced_ionic_strength, "1"),
                substituted("Î", reduced_ionic_strength, "1"),
                substituted("b", DAVIES_B, "1"),
                substituted("Î", reduced_ionic_strength, "1")
            ),
            vec![
                substitution("A", DAVIES_A, "1"),
                substitution("b", DAVIES_B, "1"),
                substitution("Î", reduced_ionic_strength, "1"),
                substitution("γ(H+)", h_gamma, "1"),
            ],
            vec![],
        ),
        make(
            "activity-definition",
            "a_i = γ_i · m̂_i".to_string(),
            format!(
                "{} = {} · {}",
                substituted("a(H+)", h_activity, "1"),
                substituted("γ(H+)", h_gamma, "1"),
                substituted("m̂(H+)", h_reduced, "1")
            ),
            vec![
                substitution("a(H+)", h_activity, "1"),
                substitution("γ(H+)", h_gamma, "1"),
                substitution("m̂(H+)", h_reduced, "1"),
            ],
            vec![],
        ),
    ];
    if acid_family_total > 0.0 {
        expressions.push(make(
            "acid-family-equilibrium",
            "Ka_HOAc = a(H+) · a(OAc-) / a(HOAc)".to_string(),
            format!(
                "{} = {} · {} / {}",
                substituted("Ka_HOAc", KA_HOAC, "1"),
                substituted("a(H+)", h_activity, "1"),
                substituted("a(OAc-)", oac_activity, "1"),
                substituted("a(HOAc)", ha_activity, "1")
            ),
            vec![
                substitution("Ka_HOAc", KA_HOAC, "1"),
                substitution("a(H+)", h_activity, "1"),
                substitution("a(OAc-)", oac_activity, "1"),
                substitution("a(HOAc)", ha_activity, "1"),
            ],
            vec![],
        ));
        expressions.push(make(
            "acid-family-balance",
            "m(HOAc) + m(OAc-) = m_A,total".to_string(),
            format!(
                "{} + {} = {}",
                substituted("m(HOAc)", ha, "mol/kg"),
                substituted("m(OAc-)", oac, "mol/kg"),
                substituted("m_A,total", acid_family_total, "mol/kg")
            ),
            vec![
                substitution("m(HOAc)", ha, "mol/kg"),
                substitution("m(OAc-)", oac, "mol/kg"),
                substitution("m_A,total", acid_family_total, "mol/kg"),
            ],
            vec![],
        ));
    }
    expressions
}

fn solve_payload(
    request: RawRequest,
    request_hash: String,
    source_state_hash: String,
) -> BackendPayload {
    match validate_request(&request) {
        Err(result) => BackendPayload {
            bridge_schema_version: NATIVE_BRIDGE_SCHEMA_VERSION,
            backend: BackendIdentity {
                id: MODEL_ID,
                version: MODEL_VERSION,
            },
            request_hash,
            source_state_hash,
            result: *result,
            expressions: vec![],
        },
        Ok(validated) => match aggregate(validated.request, validated.water_mass)
            .and_then(|totals| solve_reduced(totals).map(|solved| (totals, solved)))
        {
            Err(SolveFailure::OutOfDomain(reason)) => BackendPayload {
                bridge_schema_version: NATIVE_BRIDGE_SCHEMA_VERSION,
                backend: BackendIdentity {
                    id: MODEL_ID,
                    version: MODEL_VERSION,
                },
                request_hash,
                source_state_hash,
                result: out_of_domain(reason),
                expressions: vec![],
            },
            Err(SolveFailure::NotConverged {
                code,
                reason,
                residual,
                iterations,
            }) => BackendPayload {
                bridge_schema_version: NATIVE_BRIDGE_SCHEMA_VERSION,
                backend: BackendIdentity {
                    id: MODEL_ID,
                    version: MODEL_VERSION,
                },
                request_hash,
                source_state_hash,
                result: not_converged(code, reason, iterations, residual),
                expressions: vec![],
            },
            Ok((_totals, solved)) => match build_state(&validated, solved) {
                Ok(state) => BackendPayload {
                    bridge_schema_version: NATIVE_BRIDGE_SCHEMA_VERSION,
                    backend: BackendIdentity {
                        id: MODEL_ID,
                        version: MODEL_VERSION,
                    },
                    request_hash: request_hash.clone(),
                    source_state_hash: source_state_hash.clone(),
                    expressions: build_expressions(&state, source_state_hash),
                    result: NativeResult::Ok {
                        schema_version: SCIENTIFIC_SCHEMA_VERSION,
                        state,
                    },
                },
                Err(SolveFailure::OutOfDomain(reason)) => BackendPayload {
                    bridge_schema_version: NATIVE_BRIDGE_SCHEMA_VERSION,
                    backend: BackendIdentity {
                        id: MODEL_ID,
                        version: MODEL_VERSION,
                    },
                    request_hash,
                    source_state_hash,
                    result: out_of_domain(reason),
                    expressions: vec![],
                },
                Err(SolveFailure::NotConverged {
                    code,
                    reason,
                    residual,
                    iterations,
                }) => BackendPayload {
                    bridge_schema_version: NATIVE_BRIDGE_SCHEMA_VERSION,
                    backend: BackendIdentity {
                        id: MODEL_ID,
                        version: MODEL_VERSION,
                    },
                    request_hash,
                    source_state_hash,
                    result: not_converged(code, reason, iterations, residual),
                    expressions: vec![],
                },
            },
        },
    }
}

/// Solve a canonical JSON request with the native scientific core.
pub fn solve_canonical_json(input: &str) -> Result<String, String> {
    let request_hash = request_hash(input);
    let envelope: RawBridgeEnvelope = serde_json::from_str(input)
        .map_err(|error| format!("native scientific request is invalid JSON/wire data: {error}"))?;
    if envelope.bridge_schema_version != NATIVE_BRIDGE_SCHEMA_VERSION {
        return Err(format!(
            "native bridge schema version {} is unsupported; expected {}",
            envelope.bridge_schema_version, NATIVE_BRIDGE_SCHEMA_VERSION
        ));
    }
    if envelope.context.source_state_hash.trim().is_empty() {
        return Err("native scientific sourceStateHash must not be empty".to_string());
    }
    serde_json::to_string(&solve_payload(
        envelope.request,
        request_hash,
        envelope.context.source_state_hash,
    ))
    .map_err(|error| format!("native scientific payload serialization failed: {error}"))
}

/// Browser entry point. The JSON string bridge keeps the WASM ABI independent
/// of JavaScript object layout and is intentionally the same operation as the
/// host validation path.
#[cfg(target_arch = "wasm32")]
#[no_mangle]
pub extern "C" fn chemrealm_alloc(length: usize) -> *mut u8 {
    let mut buffer = Vec::<u8>::with_capacity(length);
    let pointer = buffer.as_mut_ptr();
    std::mem::forget(buffer);
    pointer
}

#[cfg(target_arch = "wasm32")]
#[no_mangle]
pub unsafe extern "C" fn chemrealm_dealloc(pointer: *mut u8, length: usize) {
    if !pointer.is_null() {
        drop(Vec::from_raw_parts(pointer, 0, length));
    }
}

#[cfg(target_arch = "wasm32")]
#[no_mangle]
pub unsafe extern "C" fn chemrealm_solve_json(pointer: *const u8, length: usize) -> u64 {
    if pointer.is_null() {
        return 0;
    }
    let input = std::slice::from_raw_parts(pointer, length);
    let input = match std::str::from_utf8(input) {
        Ok(value) => value,
        Err(_) => return 0,
    };
    let output = match solve_canonical_json(input) {
        Ok(value) => value,
        Err(_) => return 0,
    };
    let bytes: Box<[u8]> = output.into_bytes().into_boxed_slice();
    let output_length = bytes.len();
    let output_pointer = Box::leak(bytes).as_mut_ptr();
    ((output_length as u64) << 32) | output_pointer as u32 as u64
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn deterministic_vectors_are_stable() {
        assert_eq!(det_log10(1.0), 0.0);
        assert!((det_log10(0.1) + 1.0).abs() < 1e-15);
        assert!((det_exp10(-0.1) - 0.7943282347242815).abs() < 1e-15);
    }
}
