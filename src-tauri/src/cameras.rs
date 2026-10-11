// Camera metadata generated from web/cameras/*/camera.toml (see build.rs).
//
// Desktop is USB-only: this table carries per-body identity (id, label,
// model matchers, rated life) plus declared USB counter descriptors for
// future transports. File-reading strategies (blob-scan, exif-tag,
// filename) belong to the web app and are not executed here.
use regex::Regex;
use std::sync::LazyLock;

#[derive(Debug, Clone)]
#[allow(dead_code)]
pub struct UsbDescriptor {
    pub transport: String,
    pub property: String,
    pub experimental: bool,
    pub note: String,
    pub source: String,
}

#[derive(Debug, Clone)]
#[allow(dead_code)]
pub struct CameraManifest {
    pub id: String,
    pub label: String,
    pub models: Vec<String>,
    pub rated_life: u32,
    pub version: i64,
    pub usb: Vec<UsbDescriptor>,
}

include!(concat!(env!("OUT_DIR"), "/cameras_generated.rs"));

fn cameras_sorted() -> Vec<CameraManifest> {
    let mut v = generated_cameras();
    // Specific cameras (with models) before model-less entries.
    v.sort_by(|a, b| {
        (!a.models.is_empty())
            .cmp(&(!b.models.is_empty()))
            .reverse()
            .then(a.id.cmp(&b.id))
    });
    v
}

static CAMERAS: LazyLock<Vec<CameraManifest>> = LazyLock::new(cameras_sorted);

/// Match a device-reported model string (e.g. "Canon EOS R10") against
/// manifest model regexes. First hit wins in registry order.
pub fn match_camera(model: &str) -> Option<&'static CameraManifest> {
    for cam in CAMERAS.iter() {
        if cam.models.is_empty() {
            continue;
        }
        for pat in &cam.models {
            if Regex::new(pat).map(|rx| rx.is_match(model)).unwrap_or(false) {
                return Some(cam);
            }
        }
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    fn cameras_dir() -> PathBuf {
        PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("..")
            .join("web")
            .join("cameras")
    }

    #[test]
    fn manifest_metadata_loads() {
        // Every cameras/*/camera.toml parses into the generated table.
        assert!(!CAMERAS.is_empty(), "no camera manifests generated");
        let ids: Vec<&str> = CAMERAS.iter().map(|c| c.id.as_str()).collect();
        assert!(ids.contains(&"canon-r10"), "canon-r10 missing: {ids:?}");
    }

    #[test]
    fn model_matching_hits_r10_not_fallback() {
        let hit = match_camera("Canon EOS R10").expect("R10 should match");
        assert_eq!(hit.id, "canon-r10");
        assert_eq!(hit.rated_life, 100000);
    }

    #[test]
    fn model_matching_avoids_r5_mark_ii_collision() {
        // "EOS R5 Mark II" must not match a plain R5 pattern; unknown bodies
        // return None until they get a manifest.
        assert!(match_camera("Canon EOS BRICK2000").is_none());
    }

    #[test]
    fn usb_fixture_harness_loads() {
        // web/cameras/*/usb-vectors.json device fixtures, once contributed.
        // Zero fixtures today: the harness must scan cleanly regardless.
        let cams = cameras_dir();
        let mut ran = 0;
        for entry in std::fs::read_dir(&cams).expect("cameras dir") {
            let entry = entry.unwrap();
            if !entry.file_type().map(|t| t.is_dir()).unwrap_or(false) {
                continue;
            }
            let name = entry.file_name().to_string_lossy().to_string();
            if name.starts_with('_') {
                continue;
            }
            let vec_path = entry.path().join("usb-vectors.json");
            if !vec_path.exists() {
                continue;
            }
            let text = std::fs::read_to_string(&vec_path).unwrap();
            let vectors: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap();
            for v in vectors {
                let model = v.get("model").and_then(|x| x.as_str()).unwrap_or("");
                let expected_id = v.get("camera").and_then(|x| x.as_str()).unwrap_or(&name);
                let hit = match_camera(model)
                    .unwrap_or_else(|| panic!("{name}: no manifest match for {model}"));
                assert_eq!(hit.id, expected_id, "{name}: wrong camera");
                ran += 1;
            }
        }
        println!("usb fixtures executed: {ran}");
    }
}
