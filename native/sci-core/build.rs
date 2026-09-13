use std::{env, fs, path::PathBuf};

fn main() {
    let manifest_path = PathBuf::from(env::var("CARGO_MANIFEST_DIR").unwrap())
        .join("..")
        .join("..")
        .join("contracts")
        .join("version-manifest.json");
    println!("cargo:rerun-if-changed={}", manifest_path.display());

    let manifest_text = fs::read_to_string(&manifest_path)
        .unwrap_or_else(|error| panic!("failed to read version manifest: {error}"));
    let manifest: serde_json::Value = serde_json::from_str(&manifest_text)
        .unwrap_or_else(|error| panic!("failed to parse version manifest: {error}"));

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

    let generated = format!(
        "pub const SCIENTIFIC_SCHEMA_VERSION: u32 = {};\n\
pub const NATIVE_BRIDGE_SCHEMA_VERSION: u32 = {};\n\
pub const SCIENTIFIC_EXPRESSION_SCHEMA_VERSION: u32 = {};\n\
pub const NUMERIC_POLICY_VERSION: u32 = {};\n\
pub const OBSERVABLE_MODEL_VERSION: u32 = {};\n\
pub const MODEL_ID: &str = {:?};\n\
pub const MODEL_VERSION: &str = {:?};\n\
pub const EXPRESSION_PRODUCER_VERSION: &str = {:?};\n",
        u32_value(schema, "scientific"),
        u32_value(schema, "nativeBridge"),
        u32_value(schema, "scientificExpression"),
        u32_value(
            manifest
                .get("scientific")
                .expect("version manifest scientific section"),
            "numericPolicyVersion"
        ),
        u32_value(representation, "observableModel"),
        string_value(scientific, "id"),
        string_value(scientific, "nativeVersion"),
        string_value(scientific, "expressionProducerVersion"),
    );

    let out_dir = PathBuf::from(env::var("OUT_DIR").unwrap());
    fs::write(out_dir.join("version_constants.rs"), generated)
        .unwrap_or_else(|error| panic!("failed to write generated version constants: {error}"));
}
