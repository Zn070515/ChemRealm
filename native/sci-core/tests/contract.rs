use chemrealm_sci_core::{
    det_exp10, det_log10, solve_canonical_json, MODEL_ID, MODEL_VERSION,
    NATIVE_BRIDGE_SCHEMA_VERSION, SCIENTIFIC_EXPRESSION_SCHEMA_VERSION, SCIENTIFIC_SCHEMA_VERSION,
};
use serde::Deserialize;
use serde_json::{json, Value};

fn hcl_request(amount: f64) -> Value {
    json!({
        "schemaVersion": SCIENTIFIC_SCHEMA_VERSION,
        "waterMass": { "value": 1.0, "unit": "kg" },
        "liquidVolume": { "value": 0.1, "unit": "L" },
        "temperature": { "value": 298.15, "unit": "K" },
        "solutes": [{
            "soluteId": "HCl",
            "amount": { "value": amount, "unit": "mol" },
            "mode": "fully-dissociated"
        }],
        "indicators": []
    })
}

fn solve(value: Value) -> Value {
    let envelope = json!({
        "bridgeSchemaVersion": NATIVE_BRIDGE_SCHEMA_VERSION,
        "request": value,
        "context": { "sourceStateHash": "sha256:test-world-state" }
    });
    let wire = serde_json::to_string(&envelope).expect("request serializes");
    let response = solve_canonical_json(&wire).expect("native bridge succeeds");
    serde_json::from_str(&response).expect("native response is JSON")
}

#[test]
fn deterministic_math_matches_pinned_vectors() {
    assert!((det_log10(1.0) - 0.0).abs() <= f64::EPSILON);
    assert!((det_log10(0.1) + 1.0).abs() < 1e-15);
    assert!((det_exp10(-1e-1) - 0.7943282347242815).abs() < 1e-15);
}

#[derive(Debug, Deserialize)]
struct MathCorpus {
    log10: Vec<MathVector>,
    exp10: Vec<MathVector>,
}

#[derive(Debug, Deserialize)]
struct MathVector {
    input: f64,
    expected: String,
}

fn ordered_bits(value: f64) -> i128 {
    let bits = value.to_bits();
    let sign = 1_u64 << 63;
    if bits & sign == 0 {
        (sign | bits) as i128
    } else {
        sign as i128 - (bits & !sign) as i128
    }
}

fn assert_within_one_ulp(actual: f64, expected: &str) {
    let expected = expected.parse::<f64>().expect("corpus expected value");
    let distance = (ordered_bits(actual) - ordered_bits(expected)).abs();
    assert!(
        distance <= 1,
        "{actual:?} is {distance} ulps from {expected:?}"
    );
}

#[test]
fn deterministic_math_matches_shared_arbitrary_precision_corpus() {
    let corpus: MathCorpus = serde_json::from_str(include_str!(
        "../../../packages/sci/test/math/deterministic-math-ulp.json"
    ))
    .expect("pinned deterministic math corpus is valid JSON");
    for vector in corpus.log10 {
        assert_within_one_ulp(det_log10(vector.input), &vector.expected);
    }
    for vector in corpus.exp10 {
        assert_within_one_ulp(det_exp10(vector.input), &vector.expected);
    }
}

#[test]
fn host_bridge_returns_schema_shaped_state_and_complete_base_equations() {
    let response = solve(hcl_request(0.1));
    assert_eq!(
        response["bridgeSchemaVersion"],
        NATIVE_BRIDGE_SCHEMA_VERSION
    );
    assert_eq!(response["sourceStateHash"], "sha256:test-world-state");
    assert_eq!(response["backend"]["id"], MODEL_ID);
    assert_eq!(response["backend"]["version"], MODEL_VERSION);
    assert_eq!(response["result"]["status"], "OK");
    assert_eq!(
        response["result"]["state"]["schemaVersion"],
        SCIENTIFIC_SCHEMA_VERSION
    );
    assert_eq!(response["expressions"].as_array().unwrap().len(), 5);
    let equations: Vec<&str> = response["expressions"]
        .as_array()
        .unwrap()
        .iter()
        .map(|entry| entry["equationId"].as_str().unwrap())
        .collect();
    assert_eq!(
        equations,
        vec![
            "charge-balance",
            "water-autoprotolysis",
            "ionic-strength-fixed-point",
            "davies-activity-coefficient",
            "activity-definition",
        ]
    );
    assert_eq!(response["expressions"][0]["producerId"], "scientific-core");
    assert_eq!(
        response["expressions"][0]["schemaVersion"],
        SCIENTIFIC_EXPRESSION_SCHEMA_VERSION
    );
    assert_eq!(
        response["expressions"][3]["substitutions"][2]["symbol"],
        "Î"
    );
    assert_eq!(response["expressions"][3]["substitutions"][2]["unit"], "1");
}

#[test]
fn native_identity_is_backed_by_the_checked_in_model_contract() {
    let contract: Value =
        serde_json::from_str(include_str!(env!("CHEMREALM_NATIVE_MODEL_CONTRACT_PATH")))
            .expect("native model contract is valid JSON");
    let response = solve(hcl_request(0.1));

    assert_eq!(response["backend"]["id"], contract["model"]["id"]);
    assert_eq!(response["backend"]["version"], contract["model"]["version"]);
    for parameter in [
        "Kw",
        "Ka_HOAc",
        "Davies_A",
        "Davies_b",
        "standardMolality",
        "neutralAcidActivityCoefficient",
        "waterActivity",
    ] {
        assert_eq!(
            response["result"]["state"]["provenance"]["parameters"][parameter]
                .as_f64()
                .expect("native parameter is numeric"),
            contract["solverConfig"]["parameters"][parameter]
                .as_f64()
                .expect("contract parameter is numeric"),
            "native parameter {parameter} drifted from the checked-in contract"
        );
    }
}

#[test]
fn host_bridge_echoes_context_identity_not_request_hash() {
    let request = hcl_request(0.1);
    let envelope = json!({
        "bridgeSchemaVersion": NATIVE_BRIDGE_SCHEMA_VERSION,
        "request": request,
        "context": { "sourceStateHash": "sha256:another-world-state" }
    });
    let wire = serde_json::to_string(&envelope).unwrap();
    let response: Value = serde_json::from_str(&solve_canonical_json(&wire).unwrap()).unwrap();

    assert_eq!(response["sourceStateHash"], "sha256:another-world-state");
    assert_eq!(
        response["expressions"][0]["sourceStateHash"],
        "sha256:another-world-state"
    );
    assert_ne!(response["requestHash"], response["sourceStateHash"]);
}

#[test]
fn host_bridge_rejects_wrong_units_and_unsupported_components() {
    let mut request = hcl_request(0.1);
    request["waterMass"]["unit"] = json!("L");
    let wrong_unit = solve(request);
    assert_eq!(wrong_unit["result"]["status"], "INVALID_INPUT");

    let unsupported = hcl_request(0.1).tap_mut(|value| {
        value["solutes"][0]["soluteId"] = json!("HNO3");
    });
    let response = solve(unsupported);
    assert_eq!(response["result"]["status"], "MODEL_OUT_OF_DOMAIN");
}

#[test]
fn host_bridge_matches_native_domain_boundary_classification() {
    for amount in [0.26, 0.30, 0.40, 0.49] {
        let response = solve(hcl_request(amount));
        assert_eq!(
            response["result"]["status"], "OK",
            "{amount} mol/kg HCl is inside the declared ionic-strength domain"
        );
        let ionic_strength = response["result"]["state"]["ionicStrengthMolal"]["value"]
            .as_f64()
            .expect("successful result has ionic strength");
        assert!(
            ionic_strength <= 0.5,
            "ionic strength leaked outside domain"
        );
    }

    for amount in [0.5, 0.6] {
        let response = solve(hcl_request(amount));
        assert_eq!(response["result"]["status"], "MODEL_OUT_OF_DOMAIN");
    }
}

#[test]
fn host_bridge_rejects_explicit_null_ka_even_for_fully_dissociated_solute() {
    let request = hcl_request(0.1).tap_mut(|value| {
        value["solutes"][0]["ka"] = Value::Null;
    });
    let response = solve(request);
    assert_eq!(response["result"]["status"], "INVALID_INPUT");
}

#[test]
fn host_bridge_preserves_common_acetate_family_representation() {
    let hoac_plus_base = json!({
        "schemaVersion": SCIENTIFIC_SCHEMA_VERSION,
        "waterMass": { "value": 1.0, "unit": "kg" },
        "liquidVolume": { "value": 0.1, "unit": "L" },
        "temperature": { "value": 298.15, "unit": "K" },
        "solutes": [
            { "soluteId": "HOAc", "amount": { "value": 0.1, "unit": "mol" }, "mode": "monoprotic-equilibrium", "ka": { "value": 1.7539e-5, "unit": "1" } },
            { "soluteId": "NaOH", "amount": { "value": 0.1, "unit": "mol" }, "mode": "fully-dissociated" }
        ],
        "indicators": []
    });
    let naoac = json!({
        "schemaVersion": SCIENTIFIC_SCHEMA_VERSION,
        "waterMass": { "value": 1.0, "unit": "kg" },
        "liquidVolume": { "value": 0.1, "unit": "L" },
        "temperature": { "value": 298.15, "unit": "K" },
        "solutes": [{ "soluteId": "NaOAc", "amount": { "value": 0.1, "unit": "mol" }, "mode": "fully-dissociated" }],
        "indicators": []
    });
    let first = solve(hoac_plus_base);
    let second = solve(naoac);
    assert_eq!(first["result"]["status"], "OK");
    assert_eq!(second["result"]["status"], "OK");
    assert_eq!(
        first["result"]["state"]["ionicStrengthMolal"],
        second["result"]["state"]["ionicStrengthMolal"]
    );
    assert_eq!(
        first["result"]["state"]["species"],
        second["result"]["state"]["species"]
    );
}

trait TapMut {
    fn tap_mut(self, f: impl FnOnce(&mut Self)) -> Self;
}

impl TapMut for Value {
    fn tap_mut(mut self, f: impl FnOnce(&mut Self)) -> Self {
        f(&mut self);
        self
    }
}
