// Reads web/cameras/*/camera.toml and generates a static strategy table.
// Single source of truth with the web app: same manifests, same vectors,
// same behavior. Fails the build on contract violations.
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
    let mut s = format!(
        "    v.push(CameraManifest {{ id: \"{id}\".into(), label: \"{label}\".into(), models: vec![{models}], rated_life: {rated}, version: {version}, strategies: vec![",
        id = esc(id),
        label = esc(label),
        models = models
            .iter()
            .map(|m| format!("\"{}\".to_string()", esc(m)))
            .collect::<Vec<_>>()
            .join(", "),
        rated = rated,
        version = version,
    );
    let empty = vec![];
    let strategies = doc.get("strategy").and_then(|v| v.as_array()).unwrap_or(&empty);
    if strategies.is_empty() {
        panic!("{where_}: need at least one [[strategy]]");
    }
    for st in strategies {
        s.push_str(&emit_strategy(st, where_));
    }
    s.push_str("] });\n");
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

fn emit_strategy(st: &toml::Value, where_: &str) -> String {
    let kind = st.get("kind").and_then(|v| v.as_str()).unwrap_or("");
    let platforms = str_array(st.get("platforms"))
        .iter()
        .map(|p| format!("\"{p}\".to_string()"))
        .collect::<Vec<_>>()
        .join(", ");
    let experimental = st.get("experimental").and_then(|v| v.as_bool()).unwrap_or(true);
    let note = st.get("note").and_then(|v| v.as_str()).unwrap_or("");
    let source = st
        .get("source")
        .and_then(|v| v.as_str())
        .unwrap_or(kind);
    let base = format!(
        "Strategy {{ kind: {kind}, platforms: vec![{platforms}], experimental: {experimental}, note: \"{note}\".into(), source: \"{source}\".into(), ",
        kind = match kind {
            "blob-scan" => "StrategyKind::BlobScan",
            "exif-tag" => "StrategyKind::ExifTag",
            "filename" => "StrategyKind::Filename",
            _ => panic!("{where_}: unknown strategy kind \"{kind}\""),
        },
        platforms = platforms,
        experimental = experimental,
        note = esc(note),
        source = esc(source),
    );
    let tail = match kind {
        "blob-scan" => {
            let magic = st.get("magic").and_then(|v| v.as_str()).unwrap_or("");
            let bytes = parse_hex(magic)
                .unwrap_or_else(|| panic!("{where_}: bad magic hex"));
            let offset = st.get("offset").and_then(|v| v.as_integer()).unwrap_or(-1);
            if offset < 0 {
                panic!("{where_}: bad offset");
            }
            let format = match st.get("format").and_then(|v| v.as_str()).unwrap_or("") {
                "u16le" => "ImgFormat::U16Le",
                "u32le" => "ImgFormat::U32Le",
                "u16be" => "ImgFormat::U16Be",
                "u32be" => "ImgFormat::U32Be",
                f => panic!("{where_}: bad format \"{f}\""),
            };
            format!(
                "magic: vec![{magic}], offset: {offset}usize, format: {format}, tag: String::new(), pattern: String::new() }}, ",
                magic = bytes.iter().map(|b| b.to_string()).collect::<Vec<_>>().join(", "),
                offset = offset,
                format = format,
            )
        }
        "exif-tag" => {
            let tag = st.get("tag").and_then(|v| v.as_str()).expect("tag missing");
            format!(
                "magic: vec![], offset: 0, format: ImgFormat::U32Le, tag: \"{tag}\".into(), pattern: String::new() }}, ",
                tag = esc(tag),
            )
        }
        _ => {
            let pattern = st.get("pattern").and_then(|v| v.as_str()).unwrap_or("IMG_(\\d+)");
            format!(
                "magic: vec![], offset: 0, format: ImgFormat::U32Le, tag: String::new(), pattern: \"{pattern}\".into() }}, ",
                pattern = esc(pattern),
            )
        }
    };
    base + &tail
}

fn parse_hex(s: &str) -> Option<Vec<u8>> {
    let s: String = s.chars().filter(|c| !c.is_whitespace()).collect();
    if s.len() % 2 != 0 || s.is_empty() {
        return None;
    }
    (0..s.len())
        .step_by(2)
        .map(|i| u8::from_str_radix(&s[i..i + 2], 16).ok())
        .collect()
}
