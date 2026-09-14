use chemrealm_sci_core::{
    solve_multiform_coupled_json, solve_multiform_indicator_json, MULTIFORM_MODEL_ID,
    MULTIFORM_MODEL_VERSION,
};
use serde_json::{json, Value};

fn ordinary_request() -> String {
    serde_json::to_string(&json!({
        "sourceReplayHash": "sha256:indicator-world",
        "totalAmount": { "value": 5e-8, "unit": "mol" },
        "hydrogenActivity": { "value": 1e-10, "unit": "1" },
        "monovalentAnionActivityCoefficient": { "value": 1.0, "unit": "1" },
        "divalentAnionActivityCoefficient": { "value": 1.0, "unit": "1" },
        "regime": "ordinary-aqueous"
    }))
    .unwrap()
}

fn coupled_request() -> String {
    serde_json::to_string(&json!({
        "sourceReplayHash": "sha256:indicator-coupled-world",
        "totalAmount": { "value": 0.05, "unit": "mol" },
        "strongAcidChlorideMolality": { "value": 0.0, "unit": "mol/kg" },
        "strongBaseSodiumMolality": { "value": 0.1, "unit": "mol/kg" },
        "totalAcidFamilyMolality": { "value": 0.0, "unit": "mol/kg" },
        "indicatorTotalMolality": { "value": 0.05, "unit": "mol/kg" },
        "regime": "ordinary-aqueous"
    }))
    .unwrap()
}

#[test]
fn native_multiform_result_is_schema_shaped_and_conserves_fractions() {
    let response: Value = serde_json::from_str(
        &solve_multiform_indicator_json(&ordinary_request()).expect("ordinary result"),
    )
    .unwrap();

    assert_eq!(response["status"], "CHEMICAL_FORMS_OK");
    assert_eq!(response["indicatorId"], "phenolphthalein");
    assert_eq!(response["modelId"], MULTIFORM_MODEL_ID);
    assert_eq!(response["modelVersion"], MULTIFORM_MODEL_VERSION);
    assert_eq!(response["sourceReplayHash"], "sha256:indicator-world");
    assert_eq!(response["forms"][0]["formId"], "neutral-lactone");
    assert_eq!(response["forms"][1]["formId"], "intermediate-monoanion");
    assert_eq!(response["forms"][2]["formId"], "quinoid-base");
    let sum: f64 = response["forms"]
        .as_array()
        .unwrap()
        .iter()
        .map(|form| form["fraction"].as_f64().unwrap())
        .sum();
    assert!((sum - 1.0).abs() <= 1e-12);
}

#[test]
fn native_multiform_refuses_the_undelivered_strong_acid_regime() {
    let mut request: Value = serde_json::from_str(&ordinary_request()).unwrap();
    request["regime"] = json!("strong-acid-cation");
    let response: Value = serde_json::from_str(
        &solve_multiform_indicator_json(&serde_json::to_string(&request).unwrap())
            .expect("refusal result"),
    )
    .unwrap();

    assert_eq!(response["status"], "CHEMICAL_FORMS_UNAVAILABLE");
    assert_eq!(response["reasonCode"], "FORM_OUT_OF_DOMAIN");
    assert!(response.get("forms").is_none());
    assert!(!response["reason"].as_str().unwrap().contains("orange"));
}

#[test]
fn native_multiform_rejects_zero_indicator_dose() {
    let mut request: Value = serde_json::from_str(&ordinary_request()).unwrap();
    request["totalAmount"]["value"] = json!(0.0);
    let error = solve_multiform_indicator_json(&serde_json::to_string(&request).unwrap())
        .expect_err("zero dose must not produce a chemical form result");
    assert!(error.contains("positive"));
}

#[test]
fn native_multiform_coupled_result_includes_indicator_charge_and_ionic_strength() {
    let response: Value = serde_json::from_str(
        &solve_multiform_coupled_json(&coupled_request()).expect("coupled result"),
    )
    .unwrap();

    assert_eq!(response["observation"]["status"], "CHEMICAL_FORMS_OK");
    assert_eq!(response["observation"]["indicatorId"], "phenolphthalein");
    assert_eq!(response["observation"]["modelId"], MULTIFORM_MODEL_ID);
    assert_eq!(
        response["observation"]["modelVersion"],
        MULTIFORM_MODEL_VERSION
    );
    assert!(response["ionicStrengthMolal"]["value"].as_f64().unwrap() > 0.1);
    assert!(response["chargeResidual"]["value"].as_f64().unwrap().abs() <= 1e-12);
}
