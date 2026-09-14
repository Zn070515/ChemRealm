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
pub const MODEL_ID: &str = {:?};\n\
pub const MODEL_VERSION: &str = {:?};\n\
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
        string_value(scientific, "id"),
        string_value(scientific, "nativeVersion"),
        string_value(scientific, "expressionProducerVersion"),
    );

    let out_dir = PathBuf::from(env::var("OUT_DIR").unwrap());
    fs::write(out_dir.join("version_constants.rs"), generated)
        .unwrap_or_else(|error| panic!("failed to write generated version constants: {error}"));
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
