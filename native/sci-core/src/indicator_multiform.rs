use serde::{Deserialize, Serialize};

use crate::{
    det_exp10, DAVIES_A, DAVIES_B, HYDROGEN_LOWER, HYDROGEN_UPPER, INNER_TOLERANCE, KA_HOAC, KW,
    MAX_IONIC_STRENGTH, MULTIFORM_KA_IN_1, MULTIFORM_KA_IN_2, MULTIFORM_MODEL_ID,
    MULTIFORM_MODEL_VERSION, MULTIFORM_NEUTRAL_GAMMA, OUTER_ITERATION_LIMIT, OUTER_TOLERANCE,
};

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Quantity {
    value: f64,
    unit: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Request {
    source_replay_hash: String,
    total_amount: Quantity,
    hydrogen_activity: Quantity,
    monovalent_anion_activity_coefficient: Quantity,
    divalent_anion_activity_coefficient: Quantity,
    regime: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct CoupledRequest {
    source_replay_hash: String,
    total_amount: Quantity,
    strong_acid_chloride_molality: Quantity,
    strong_base_sodium_molality: Quantity,
    total_acid_family_molality: Quantity,
    indicator_total_molality: Quantity,
    regime: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct CoupledResponse {
    observation: AvailableObservation,
    ionic_strength_molal: Quantity,
    charge_residual: Quantity,
}

#[derive(Debug, Clone, Copy)]
struct CoupledTotals {
    strong_acid_chloride: f64,
    strong_base_sodium: f64,
    acid_family: f64,
    indicator_total: f64,
}

#[derive(Debug, Clone, Copy)]
struct CoupledEvaluation {
    ionic_strength: f64,
    charge_residual: f64,
    neutral_fraction: f64,
    monoanion_fraction: f64,
    dianion_fraction: f64,
}

const COUPLED_INNER_ITERATION_LIMIT: usize = 100;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct Form {
    form_id: &'static str,
    fraction: f64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct AvailableObservation {
    status: &'static str,
    indicator_id: &'static str,
    total_amount: Quantity,
    forms: [Form; 3],
    model_id: &'static str,
    model_version: &'static str,
    source_replay_hash: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct UnavailableObservation {
    status: &'static str,
    indicator_id: &'static str,
    #[serde(skip_serializing_if = "Option::is_none")]
    total_amount: Option<Quantity>,
    reason_code: &'static str,
    reason: &'static str,
    model_id: &'static str,
    model_version: &'static str,
    source_replay_hash: String,
}

fn require_unit(quantity: &Quantity, expected: &str, name: &str) -> Result<f64, String> {
    if quantity.unit != expected {
        return Err(format!("{name} must use canonical unit {expected}"));
    }
    if !quantity.value.is_finite() {
        return Err(format!("{name} must be finite"));
    }
    Ok(quantity.value)
}

fn positive(value: f64, name: &str) -> Result<f64, String> {
    if !value.is_finite() || value <= 0.0 {
        return Err(format!("{name} must be finite and positive"));
    }
    Ok(value)
}

fn unavailable(request: &Request) -> Result<String, String> {
    serde_json::to_string(&UnavailableObservation {
        status: "CHEMICAL_FORMS_UNAVAILABLE",
        indicator_id: "phenolphthalein",
        total_amount: None,
        reason_code: "FORM_OUT_OF_DOMAIN",
        reason: "requested indicator regime is outside the ordinary aqueous model",
        model_id: MULTIFORM_MODEL_ID,
        model_version: MULTIFORM_MODEL_VERSION,
        source_replay_hash: request.source_replay_hash.clone(),
    })
    .map_err(|error| format!("multiform refusal serialization failed: {error}"))
}

/// Candidate native/WASM bridge for the accepted ordinary three-form model.
/// It is intentionally separate from the legacy M4 bridge until a new model
/// identity and independent differential matrix are accepted.
pub fn solve_multiform_indicator_json(input: &str) -> Result<String, String> {
    let request: Request = serde_json::from_str(input)
        .map_err(|error| format!("multiform request is invalid JSON: {error}"))?;
    if request.source_replay_hash.trim().is_empty() {
        return Err("source replay hash must be non-empty".to_string());
    }
    if request.regime != "ordinary-aqueous" {
        return unavailable(&request);
    }

    let total_amount = positive(
        require_unit(&request.total_amount, "mol", "totalAmount")?,
        "indicator dose",
    )?;
    let hydrogen = positive(
        require_unit(&request.hydrogen_activity, "1", "hydrogenActivity")?,
        "hydrogen activity",
    )?;
    let mono_gamma = positive(
        require_unit(
            &request.monovalent_anion_activity_coefficient,
            "1",
            "monovalentAnionActivityCoefficient",
        )?,
        "monovalent indicator activity coefficient",
    )?;
    let di_gamma = positive(
        require_unit(
            &request.divalent_anion_activity_coefficient,
            "1",
            "divalentAnionActivityCoefficient",
        )?,
        "divalent indicator activity coefficient",
    )?;

    let monoanion_to_neutral =
        MULTIFORM_KA_IN_1 * MULTIFORM_NEUTRAL_GAMMA / (hydrogen * mono_gamma);
    let dianion_to_monoanion = MULTIFORM_KA_IN_2 * mono_gamma / (hydrogen * di_gamma);
    let dianion_to_neutral = monoanion_to_neutral * dianion_to_monoanion;
    let denominator = 1.0 + monoanion_to_neutral + dianion_to_neutral;
    if !denominator.is_finite() || denominator <= 0.0 {
        return Err("multiform fraction denominator is not finite".to_string());
    }

    let fractions = [
        1.0 / denominator,
        monoanion_to_neutral / denominator,
        dianion_to_neutral / denominator,
    ];
    let sum: f64 = fractions.iter().sum();
    if fractions
        .iter()
        .any(|value| !value.is_finite() || *value < 0.0)
        || (sum - 1.0).abs() > 1e-12
    {
        return Err("multiform fractions are not finite, non-negative, and normalised".to_string());
    }

    serde_json::to_string(&AvailableObservation {
        status: "CHEMICAL_FORMS_OK",
        indicator_id: "phenolphthalein",
        total_amount: Quantity {
            value: total_amount,
            unit: "mol".to_string(),
        },
        forms: [
            Form {
                form_id: "neutral-lactone",
                fraction: fractions[0],
            },
            Form {
                form_id: "intermediate-monoanion",
                fraction: fractions[1],
            },
            Form {
                form_id: "quinoid-base",
                fraction: fractions[2],
            },
        ],
        model_id: MULTIFORM_MODEL_ID,
        model_version: MULTIFORM_MODEL_VERSION,
        source_replay_hash: request.source_replay_hash,
    })
    .map_err(|error| format!("multiform result serialization failed: {error}"))
}

fn coupled_gamma(ionic_strength: f64) -> Result<f64, String> {
    if !ionic_strength.is_finite() || !(0.0..=MAX_IONIC_STRENGTH).contains(&ionic_strength) {
        return Err("coupled indicator ionic strength is outside the Davies domain".to_string());
    }
    let square_root = ionic_strength.sqrt();
    let log10_gamma = -DAVIES_A * (square_root / (1.0 + square_root) - DAVIES_B * ionic_strength);
    let gamma = det_exp10(log10_gamma);
    if !gamma.is_finite() || gamma <= 0.0 {
        return Err(
            "coupled indicator activity coefficient is not finite and positive".to_string(),
        );
    }
    Ok(gamma)
}

fn coupled_evaluation(
    hydrogen: f64,
    ionic_strength: f64,
    totals: CoupledTotals,
) -> Result<CoupledEvaluation, String> {
    if !hydrogen.is_finite() || hydrogen <= 0.0 {
        return Err("coupled indicator hydrogen activity is not finite and positive".to_string());
    }
    let gamma = coupled_gamma(ionic_strength)?;
    let hydroxide = KW / (gamma * gamma * hydrogen);
    let conditional_ka = KA_HOAC / (gamma * gamma);
    let conjugate_base = totals.acid_family * conditional_ka / (conditional_ka + hydrogen);
    let indicator_mono_to_neutral =
        MULTIFORM_KA_IN_1 * MULTIFORM_NEUTRAL_GAMMA / (hydrogen * gamma * gamma);
    let gamma_fourth = gamma * gamma * gamma * gamma;
    let indicator_di_to_mono = MULTIFORM_KA_IN_2 / (hydrogen * gamma_fourth);
    let indicator_di_to_neutral = indicator_mono_to_neutral * indicator_di_to_mono;
    let denominator = 1.0 + indicator_mono_to_neutral + indicator_di_to_neutral;
    if !denominator.is_finite() || denominator <= 0.0 {
        return Err("coupled indicator fraction denominator is not finite".to_string());
    }
    let neutral_fraction = 1.0 / denominator;
    let monoanion_fraction = indicator_mono_to_neutral / denominator;
    let dianion_fraction = indicator_di_to_neutral / denominator;
    let indicator_monoanion = totals.indicator_total * monoanion_fraction;
    let indicator_dianion = totals.indicator_total * dianion_fraction;
    let ionic = 0.5
        * (hydrogen
            + hydroxide
            + conjugate_base
            + totals.strong_base_sodium
            + totals.strong_acid_chloride
            + indicator_monoanion
            + 4.0 * indicator_dianion);
    let charge = hydrogen + totals.strong_base_sodium
        - hydroxide
        - conjugate_base
        - totals.strong_acid_chloride
        - indicator_monoanion
        - 2.0 * indicator_dianion;
    if !ionic.is_finite()
        || ionic < 0.0
        || !charge.is_finite()
        || !neutral_fraction.is_finite()
        || !monoanion_fraction.is_finite()
        || !dianion_fraction.is_finite()
        || neutral_fraction < 0.0
        || monoanion_fraction < 0.0
        || dianion_fraction < 0.0
    {
        return Err("coupled indicator evaluation is not finite".to_string());
    }
    Ok(CoupledEvaluation {
        ionic_strength: ionic,
        charge_residual: charge,
        neutral_fraction,
        monoanion_fraction,
        dianion_fraction,
    })
}

fn coupled_inner(hydrogen: f64, totals: CoupledTotals) -> Result<CoupledEvaluation, String> {
    let mut lower = 0.0;
    let mut upper = MAX_IONIC_STRENGTH;
    let lower_value = coupled_evaluation(hydrogen, lower, totals)?;
    let upper_value = coupled_evaluation(hydrogen, upper, totals)?;
    let lower_residual = lower_value.ionic_strength - lower;
    let upper_residual = upper_value.ionic_strength - upper;
    if lower_residual < 0.0 {
        return Err("coupled indicator inner bracket has a negative lower residual".to_string());
    }
    if upper_residual > INNER_TOLERANCE {
        return Err(format!(
            "coupled indicator ionic strength is outside the Davies domain at hydrogen {hydrogen}"
        ));
    }
    if lower_residual.abs() <= INNER_TOLERANCE {
        return Ok(lower_value);
    }
    if upper_residual.abs() <= INNER_TOLERANCE {
        return Ok(upper_value);
    }

    for _ in 0..COUPLED_INNER_ITERATION_LIMIT {
        let midpoint = lower + 0.5 * (upper - lower);
        if midpoint == lower || midpoint == upper {
            break;
        }
        let value = coupled_evaluation(hydrogen, midpoint, totals)?;
        let residual = value.ionic_strength - midpoint;
        if residual.abs() <= INNER_TOLERANCE {
            return Ok(value);
        }
        if residual > 0.0 {
            lower = midpoint;
        } else {
            upper = midpoint;
        }
    }

    Err("coupled indicator inner ionic-strength solve did not converge".to_string())
}

fn solve_coupled(totals: CoupledTotals) -> Result<CoupledEvaluation, String> {
    // At extremely small hydrogen activity, water autoionization can itself
    // require an ionic strength above the Davies envelope. Find the first
    // valid lower endpoint from the legal side rather than evaluating
    // out-of-domain activity coefficients merely to establish a bracket.
    let mut lower_hydrogen = HYDROGEN_LOWER;
    let lower = loop {
        match coupled_inner(lower_hydrogen, totals) {
            Ok(value) => break value,
            Err(_error) if lower_hydrogen < 1.0e-6 => {
                lower_hydrogen *= 10.0;
            }
            Err(error) => return Err(error),
        }
    };
    let mut upper_hydrogen = HYDROGEN_UPPER;
    let upper = loop {
        match coupled_inner(upper_hydrogen, totals) {
            Ok(value) => break value,
            Err(_error) if upper_hydrogen > HYDROGEN_LOWER => {
                upper_hydrogen *= 0.5;
            }
            Err(error) => return Err(error),
        }
    };
    if lower.charge_residual >= 0.0 || upper.charge_residual <= 0.0 {
        return Err("coupled indicator outer charge bracket is missing".to_string());
    }

    let mut hydrogen_lower = lower_hydrogen;
    let mut hydrogen_upper = upper_hydrogen;
    let mut final_candidate = upper;
    for _ in 0..OUTER_ITERATION_LIMIT {
        let midpoint = hydrogen_lower + 0.5 * (hydrogen_upper - hydrogen_lower);
        if midpoint == hydrogen_lower || midpoint == hydrogen_upper {
            break;
        }
        let candidate = coupled_inner(midpoint, totals)?;
        final_candidate = candidate;
        if candidate.charge_residual.abs() <= OUTER_TOLERANCE {
            return Ok(candidate);
        }
        if candidate.charge_residual < 0.0 {
            hydrogen_lower = midpoint;
        } else {
            hydrogen_upper = midpoint;
        }
    }
    if final_candidate.charge_residual.abs() > OUTER_TOLERANCE {
        return Err("coupled indicator outer charge solve did not converge".to_string());
    }
    Ok(final_candidate)
}

/// Solve the ordinary three-form model with indicator charge included in the
/// bulk charge and ionic-strength equations. This is a candidate bridge; it
/// does not alter the accepted legacy production adapter.
pub fn solve_multiform_coupled_json(input: &str) -> Result<String, String> {
    let request: CoupledRequest = serde_json::from_str(input)
        .map_err(|error| format!("coupled multiform request is invalid JSON: {error}"))?;
    if request.source_replay_hash.trim().is_empty() {
        return Err("source replay hash must be non-empty".to_string());
    }
    if request.regime != "ordinary-aqueous" {
        return Err("coupled multiform bridge only accepts ordinary-aqueous regime".to_string());
    }
    let total_amount = positive(
        require_unit(&request.total_amount, "mol", "totalAmount")?,
        "indicator dose",
    )?;
    let totals = CoupledTotals {
        strong_acid_chloride: non_negative_quantity(
            &request.strong_acid_chloride_molality,
            "strongAcidChlorideMolality",
        )?,
        strong_base_sodium: non_negative_quantity(
            &request.strong_base_sodium_molality,
            "strongBaseSodiumMolality",
        )?,
        acid_family: non_negative_quantity(
            &request.total_acid_family_molality,
            "totalAcidFamilyMolality",
        )?,
        indicator_total: positive(
            non_negative_quantity(&request.indicator_total_molality, "indicatorTotalMolality")?,
            "indicator total molality",
        )?,
    };
    let solved = solve_coupled(totals)?;
    serde_json::to_string(&CoupledResponse {
        observation: AvailableObservation {
            status: "CHEMICAL_FORMS_OK",
            indicator_id: "phenolphthalein",
            total_amount: Quantity {
                value: total_amount,
                unit: "mol".to_string(),
            },
            forms: [
                Form {
                    form_id: "neutral-lactone",
                    fraction: solved.neutral_fraction,
                },
                Form {
                    form_id: "intermediate-monoanion",
                    fraction: solved.monoanion_fraction,
                },
                Form {
                    form_id: "quinoid-base",
                    fraction: solved.dianion_fraction,
                },
            ],
            model_id: MULTIFORM_MODEL_ID,
            model_version: MULTIFORM_MODEL_VERSION,
            source_replay_hash: request.source_replay_hash,
        },
        ionic_strength_molal: Quantity {
            value: solved.ionic_strength,
            unit: "mol/kg".to_string(),
        },
        charge_residual: Quantity {
            value: solved.charge_residual,
            unit: "mol/kg".to_string(),
        },
    })
    .map_err(|error| format!("coupled multiform result serialization failed: {error}"))
}

fn non_negative_quantity(quantity: &Quantity, name: &str) -> Result<f64, String> {
    let value = require_unit(quantity, "mol/kg", name)?;
    if value < 0.0 {
        return Err(format!("{name} must be finite and non-negative"));
    }
    Ok(value)
}
