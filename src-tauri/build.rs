// Reads web/cameras/*/camera.toml and generates the desktop metadata table.
// Single source of truth with the web app for body identity (id, label,
// model matchers, rated life) plus declared USB counter descriptors.
// File-reading strategies ([[strategy]]) belong to the web app and are
// ignored here; USB descriptors ([[usb]]) are parsed and carried for
// future transports.
use std::path::PathBuf;

fn main() {
    tauri_build::build();

    let dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("..")
        .join("web")
        .join("cameras");
    let mut out = String::from(
        "// GENERATED from web/cameras/*/camera.toml — do not edit.\n\
         // (Included into crate::cameras, so CameraManifest etc. are in scope.)\n\
         pub fn generated_cameras() -> Vec<CameraManifest> {\n    let mut v = Vec::new();\n",
    );
    let mut count = 0;
    let mut entries: Vec<_> = std::fs::read_dir(&dir)
        .expect("web/cameras missing")
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().map(|t| t.is_dir()).unwrap_or(false))
        .filter(|e| {
            !e.file_name().to_string_lossy().starts_with('_')
        })
        .collect();
    entries.sort_by_key(|e| e.file_name());
    for entry in entries {
        let toml_path = entry.path().join("camera.toml");
        if !toml_path.exists() {
            continue;
        }
        println!("cargo:rerun-if-changed={}", toml_path.display());
        let text = std::fs::read_to_string(&toml_path).expect("read camera.toml");
        let doc: toml::Value = toml::from_str(&text).expect("parse camera.toml");
        let dir_name = entry.file_name().to_string_lossy().to_string();
        out.push_str(&emit_camera(&doc, &dir_name, &toml_path.to_string_lossy()));
        count += 1;
    }
    out.push_str("    v\n}\n");
    let out_path = PathBuf::from(std::env::var("OUT_DIR").unwrap()).join("cameras_generated.rs");
    std::fs::write(&out_path, out).expect("write cameras_generated.rs");
    println!("cargo:warning=ShutterDrop: generated {} cameras", count);
}

fn esc(s: &str) -> String {
    s.replace('\\', "\\\\").replace('"', "\\\"")
}

fn emit_camera(doc: &toml::Value, dir: &str, where_: &str) -> String {
    let c = doc.get("camera").expect("missing [camera]");
    let id = c.get("id").and_then(|v| v.as_str()).unwrap_or(dir);
    if id != dir {
        panic!("{where_}: id \"{id}\" must equal folder name \"{dir}\"");
    }
    if !id
        .chars()
        .all(|ch| ch.is_ascii_lowercase() || ch.is_ascii_digit() || ch == '-')
        || id.is_empty()
    {
        panic!("{where_}: id must be kebab-case");
    }
    let label = c.get("label").and_then(|v| v.as_str()).expect("label missing");
    let models = str_array(c.get("models"));
    let rated = c.get("rated_life").and_then(|v| v.as_integer()).unwrap_or(0) as u32;
    let version = c.get("version").and_then(|v| v.as_integer()).unwrap_or(1);
    let s = format!(
        "    v.push(CameraManifest {{ id: \"{id}\".into(), label: \"{label}\".into(), models: vec![{models}], rated_life: {rated}, version: {version}, usb: vec![{usb}] }});\n",
        id = esc(id),
        label = esc(label),
        models = models
            .iter()
            .map(|m| format!("\"{}\".to_string()", esc(m)))
            .collect::<Vec<_>>()
            .join(", "),
        rated = rated,
        version = version,
        usb = emit_usb(doc.get("usb"), where_),
    );
    s
}

fn str_array(v: Option<&toml::Value>) -> Vec<String> {
    match v {
        Some(toml::Value::Array(a)) => a
            .iter()
            .map(|x| x.as_str().unwrap_or("").to_string())
            .collect(),
        _ => vec![],
    }
}

fn emit_usb(v: Option<&toml::Value>, where_: &str) -> String {
    let empty = vec![];
    let descriptors = v.and_then(|v| v.as_array()).unwrap_or(&empty);
    descriptors
        .iter()
        .map(|d| {
            let transport = d.get("transport").and_then(|v| v.as_str()).unwrap_or("");
            if transport.is_empty() {
                panic!("{where_}: [[usb]] needs a transport");
            }
            let property = d.get("property").and_then(|v| v.as_str()).unwrap_or("");
            let experimental = d.get("experimental").and_then(|v| v.as_bool()).unwrap_or(true);
            let note = d.get("note").and_then(|v| v.as_str()).unwrap_or("");
            let source = d
                .get("source")
                .and_then(|v| v.as_str())
                .unwrap_or(transport);
            format!(
                "UsbDescriptor {{ transport: \"{transport}\".into(), property: \"{property}\".into(), experimental: {experimental}, note: \"{note}\".into(), source: \"{source}\".into() }}, ",
                transport = esc(transport),
                property = esc(property),
                experimental = experimental,
                note = esc(note),
                source = esc(source),
            )
        })
        .collect::<Vec<_>>()
        .join("")
}
