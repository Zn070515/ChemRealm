use std::{env, fs, path::PathBuf};

fn main() {
    let manifest_path = PathBuf::from(env::var("CARGO_MANIFEST_DIR").unwrap())
        .join("..")
        .join("..")
        .join("contracts")
        .join("version-manifest.json");
    println!("cargo:rerun-if-changed={}", manifest_path.display());

    let repository_root = manifest_path
        .parent()
        .and_then(|path| path.parent())
        .expect("repository root");
    let native_schema_dir = repository_root
        .join("packages")
        .join("schema")
        .join("json-schema");
    let envelope_schema_path = native_schema_dir.join("native-solve-envelope.schema.json");
    let payload_schema_path = native_schema_dir.join("native-backend-payload.schema.json");
    println!("cargo:rerun-if-changed={}", envelope_schema_path.display());
    println!("cargo:rerun-if-changed={}", payload_schema_path.display());

    let manifest_text = fs::read_to_string(&manifest_path)
        .unwrap_or_else(|error| panic!("failed to read version manifest: {error}"));
    let manifest: serde_json::Value = serde_json::from_str(&manifest_text)
        .unwrap_or_else(|error| panic!("failed to parse version manifest: {error}"));

    let read_schema = |path: &PathBuf| {
        let text = fs::read_to_string(path).unwrap_or_else(|error| {
            panic!("failed to read schema artifact {}: {error}", path.display())
        });
        serde_json::from_str::<serde_json::Value>(&text).unwrap_or_else(|error| {
            panic!(
                "failed to parse schema artifact {}: {error}",
                path.display()
            )
        })
    };
    let envelope_schema = read_schema(&envelope_schema_path);
    let payload_schema = read_schema(&payload_schema_path);
    let schema_bridge_version = |schema: &serde_json::Value, name: &str| {
        schema
            .get("properties")
            .and_then(|value| value.get("bridgeSchemaVersion"))
            .and_then(|value| value.get("const"))
            .and_then(serde_json::Value::as_u64)
            .unwrap_or_else(|| panic!("{name} must declare bridgeSchemaVersion.const"))
    };
    let envelope_bridge_version = schema_bridge_version(&envelope_schema, "native envelope schema");
    let payload_bridge_version = schema_bridge_version(&payload_schema, "native payload schema");

    let schema = manifest
        .get("schema")
        .expect("version manifest schema section");
    let representation = manifest
        .get("representation")
        .expect("version manifest representation section");
    let scientific = manifest
        .get("scientific")
        .and_then(|value| value.get("acidBase"))
        .expect("version manifest acid-base section");

    let u32_value = |parent: &serde_json::Value, key: &str| {
        parent
            .get(key)
            .and_then(serde_json::Value::as_u64)
            .unwrap_or_else(|| panic!("version manifest field {key} must be an integer"))
    };
    let string_value = |parent: &serde_json::Value, key: &str| {
        parent
            .get(key)
            .and_then(serde_json::Value::as_str)
            .map(str::to_owned)
            .unwrap_or_else(|| panic!("version manifest field {key} must be a string"))
    };

    let native_model_id = string_value(scientific, "id");
    let native_model_version = string_value(scientific, "nativeVersion");
    let native_contract_path = repository_root
        .join("contracts")
        .join("scientific")
        .join(format!("{native_model_id}-{native_model_version}.json"));
    println!("cargo:rerun-if-changed={}", native_contract_path.display());
    println!(
        "cargo:rustc-env=CHEMREALM_NATIVE_MODEL_CONTRACT_PATH={}",
        native_contract_path.display()
    );
    let native_contract = read_schema(&native_contract_path);
    let contract_model = native_contract
        .get("model")
        .expect("native model contract model section");
    let contract_solver_config = native_contract
        .get("solverConfig")
        .expect("native model contract solverConfig section");
    if string_value(contract_model, "id") != native_model_id
        || string_value(contract_model, "version") != native_model_version
        || string_value(contract_solver_config, "id") != native_model_id
        || string_value(contract_solver_config, "version") != native_model_version
    {
        panic!("native model contract identity disagrees with the version manifest");
    }
    let number_value = |parent: &serde_json::Value, key: &str| {
        parent
            .get(key)
            .and_then(serde_json::Value::as_f64)
            .unwrap_or_else(|| panic!("native model contract field {key} must be a number"))
    };
    let quantity_value = |parent: &serde_json::Value, key: &str, unit: &str| {
        let quantity = parent
            .get(key)
            .unwrap_or_else(|| panic!("native model contract quantity {key} is missing"));
        if string_value(quantity, "unit") != unit {
            panic!("native model contract quantity {key} must use unit {unit}");
        }
        number_value(quantity, "value")
    };
    let string_array = |parent: &serde_json::Value, key: &str| {
        parent
            .get(key)
            .and_then(serde_json::Value::as_array)
            .unwrap_or_else(|| panic!("native model contract field {key} must be an array"))
            .iter()
            .map(|value| {
                value.as_str().map(str::to_owned).unwrap_or_else(|| {
                    panic!("native model contract field {key} must contain strings")
                })
            })
            .collect::<Vec<_>>()
    };
    let validity = contract_model
        .get("validity")
        .expect("native model contract validity section");
    let temperature = validity
        .get("temperature")
        .expect("native model contract temperature section");
    let temperature_min = quantity_value(temperature, "min", "K");
    let temperature_max = quantity_value(temperature, "max", "K");
    let ionic_strength = quantity_value(validity, "ionicStrengthMolalMax", "mol/kg");
    let contract_species = string_array(validity, "species");
    let contract_components = string_array(validity, "components");
    if contract_species.len() != 7 || contract_components.len() != 4 {
        panic!("native model contract species/components cardinality changed without a Rust ABI update");
    }
    let parameters = contract_solver_config
        .get("parameters")
        .expect("native model contract solver parameters");
    let kw = number_value(parameters, "Kw");
    let ka_hoac = number_value(parameters, "Ka_HOAc");
    let davies_a = number_value(parameters, "Davies_A");
    let davies_b = number_value(parameters, "Davies_b");
    let standard_molality = number_value(parameters, "standardMolality");
    let neutral_acid_gamma = number_value(parameters, "neutralAcidActivityCoefficient");
    let water_activity = number_value(parameters, "waterActivity");
    let numeric_precision = number_value(parameters, "numericPrecisionSignificantDigits");
    let numeric_policy_version = number_value(parameters, "numericPolicyVersion");
    let domain = native_contract
        .get("domain")
        .expect("native model contract domain section");
    let total_solute = domain
        .get("totalSoluteMolality")
        .expect("native model contract total-solute section");
    if string_value(total_solute, "unit") != "mol/kg" {
        panic!("native model contract total-solute domain must use mol/kg");
    }
    let min_total_solute = number_value(total_solute, "min");
    let max_total_solute = number_value(total_solute, "max");
    let proposed_envelope =
        quantity_value(domain, "proposedAccuracyEnvelopeIonicStrength", "mol/kg");
    let rust_strings = |values: &[String]| {
        values
            .iter()
            .map(|value| format!("{value:?}"))
            .collect::<Vec<_>>()
            .join(", ")
    };
    let native_contract_generated = format!(
        "pub const MODEL_ID: &str = {:?};\n\
pub const MODEL_VERSION: &str = {:?};\n\
pub const KW: f64 = {:?};\n\
pub const KA_HOAC: f64 = {:?};\n\
pub const DAVIES_A: f64 = {:?};\n\
pub const DAVIES_B: f64 = {:?};\n\
pub const STANDARD_MOLALITY: f64 = {:?};\n\
pub const NEUTRAL_ACID_GAMMA: f64 = {:?};\n\
pub const WATER_ACTIVITY: f64 = {:?};\n\
pub const TEMPERATURE_MIN_K: f64 = {:?};\n\
pub const TEMPERATURE_MAX_K: f64 = {:?};\n\
pub const TEMPERATURE_K: f64 = TEMPERATURE_MIN_K;\n\
pub const MIN_TOTAL_SOLUTE: f64 = {:?};\n\
pub const MAX_TOTAL_SOLUTE: f64 = {:?};\n\
pub const MAX_IONIC_STRENGTH: f64 = {:?};\n\
pub const PROPOSED_ENVELOPE: f64 = {:?};\n\
pub const NUMERIC_PRECISION_SIGNIFICANT_DIGITS: usize = {};\n\
pub const CONTRACT_NUMERIC_POLICY_VERSION: u32 = {};\n\
pub const MODEL_SPECIES: [&str; 7] = [{}];\n\
pub const MODEL_COMPONENTS: [&str; 4] = [{}];\n",
        native_model_id,
        native_model_version,
        kw,
        ka_hoac,
        davies_a,
        davies_b,
        standard_molality,
        neutral_acid_gamma,
        water_activity,
        temperature_min,
        temperature_max,
        min_total_solute,
        max_total_solute,
        ionic_strength,
        proposed_envelope,
        numeric_precision as usize,
        numeric_policy_version as u32,
        rust_strings(&contract_species),
        rust_strings(&contract_components),
    );

    let native_bridge_version = u32_value(schema, "nativeBridge");
    if envelope_bridge_version != native_bridge_version
        || payload_bridge_version != native_bridge_version
    {
        panic!(
            "native bridge schema artifacts disagree with version manifest: envelope={}, payload={}, manifest={}",
            envelope_bridge_version, payload_bridge_version, native_bridge_version
        );
    }

    let generated = format!(
        "pub const SCIENTIFIC_SCHEMA_VERSION: u32 = {};\n\
pub const NATIVE_BRIDGE_SCHEMA_VERSION: u32 = {};\n\
pub const SCIENTIFIC_EXPRESSION_SCHEMA_VERSION: u32 = {};\n\
pub const NUMERIC_POLICY_VERSION: u32 = {};\n\
pub const OBSERVABLE_MODEL_VERSION: u32 = {};\n\
pub const EXPRESSION_PRODUCER_VERSION: &str = {:?};\n",
        u32_value(schema, "scientific"),
        native_bridge_version,
        u32_value(schema, "scientificExpression"),
        u32_value(
            manifest
                .get("scientific")
                .expect("version manifest scientific section"),
            "numericPolicyVersion"
        ),
        u32_value(representation, "observableModel"),
        string_value(scientific, "expressionProducerVersion"),
    );

    let out_dir = PathBuf::from(env::var("OUT_DIR").unwrap());
    fs::write(out_dir.join("version_constants.rs"), generated)
        .unwrap_or_else(|error| panic!("failed to write generated version constants: {error}"));
    fs::write(
        out_dir.join("native_model_contract.rs"),
        native_contract_generated,
    )
    .unwrap_or_else(|error| panic!("failed to write native model contract constants: {error}"));
    fs::write(
        out_dir.join("native_schema_contract.rs"),
        format!(
            "pub const NATIVE_SCHEMA_BRIDGE_VERSION: u32 = {native_bridge_version};\n\
pub const NATIVE_ENVELOPE_SCHEMA_ARTIFACT: &str = \"native-solve-envelope.schema.json\";\n\
pub const NATIVE_PAYLOAD_SCHEMA_ARTIFACT: &str = \"native-backend-payload.schema.json\";\n"
        ),
    )
    .unwrap_or_else(|error| panic!("failed to write native schema contract constants: {error}"));
}
