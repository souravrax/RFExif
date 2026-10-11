// ShutterDrop backend: ExifTool JSON + per-camera manifests generated from
// web/cameras/*/camera.toml (see src-tauri/build.rs). Same manifests, same
// vectors, same behavior as the web app.
mod cameras;

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::process::Command;
use tauri::Manager;
use tauri::window::{Effect, EffectsBuilder};
#[cfg(target_os = "macos")]
use tauri::window::EffectState;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct R10Info {
    pub value: u32,
    pub bytes: [u8; 4],
    pub blob_offset: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ShutterInfo {
    pub value: Option<u32>,
    pub source: String, // "exif" | "r10-blob" | "none"
    pub experimental: bool,
    pub note: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CameraRef {
    pub id: String,
    pub label: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileReport {
    pub path: String,
    pub file_name: String,
    pub shutter: ShutterInfo,
    pub camera: Option<CameraRef>,
    pub r10: Option<R10Info>,
    pub key_tags: HashMap<String, String>,
    pub error: Option<String>,
}

fn pick_tag(map: &serde_json::Map<String, serde_json::Value>, names: &[&str]) -> Option<String> {
    for group in ["EXIF", "MakerNotes", "Composite", "File", "QuickTime"] {
        for n in names {
            let key = format!("{}:{}", group, n);
            if let Some(v) = map.get(&key).or_else(|| map.get(*n)) {
                let s = match v {
                    serde_json::Value::String(s) => s.clone(),
                    _ => v.to_string().trim_matches('"').to_string(),
                };
                if !s.is_empty() && s != "null" {
                    return Some(s);
                }
            }
        }
    }
    None
}

fn exiftool_bin(app: &tauri::AppHandle) -> PathBuf {
    // 1. Bundled resource (prod builds).
    if let Ok(res) = app.path().resource_dir() {
        for name in [
            "binaries/exiftool-x86_64-pc-windows-msvc.exe",
            "binaries/exiftool-aarch64-apple-darwin",
            "binaries/exiftool-x86_64-apple-darwin",
            "binaries/exiftool-x86_64-unknown-linux-gnu",
        ] {
            let p = res.join(name);
            if p.exists() {
                return p;
            }
        }
    }
    // 2. Dev fallback next to src-tauri.
    let dev = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("binaries")
        .join("exiftool-x86_64-pc-windows-msvc.exe");
    if dev.exists() {
        return dev;
    }
    // 3. Portable fallback: binaries/ next to the running exe
    //    (release zip layout: ShutterDrop.exe + binaries/).
    if let Ok(exe) = std::env::current_exe() {
        if let Some(dir) = exe.parent() {
            for name in [
                "binaries/exiftool-x86_64-pc-windows-msvc.exe",
                "binaries/exiftool-aarch64-apple-darwin",
                "binaries/exiftool-x86_64-unknown-linux-gnu",
            ] {
                let p = dir.join(name);
                if p.exists() {
                    return p;
                }
            }
        }
    }
    // 4. System PATH.
    PathBuf::from("exiftool")
}

/// Flatten one ExifTool JSON object into "Group:Tag" -> value, plus short
/// "Tag" aliases for manifest exif-tag strategies.
fn flatten_exif(
    emap: Option<&serde_json::Map<String, serde_json::Value>>,
) -> HashMap<String, String> {
    let mut flat = HashMap::new();
    if let Some(map) = emap {
        for (k, v) in map {
            let s = match v {
                serde_json::Value::String(s) => s.clone(),
                _ => v.to_string().trim_matches('"').to_string(),
            };
            if s.is_empty() || s == "null" {
                continue;
            }
            if let Some(i) = k.find(':') {
                flat.entry(k[i + 1..].to_string()).or_insert_with(|| s.clone());
            }
            flat.insert(k.clone(), s);
        }
    }
    flat
}

/// Read a file with a sanity cap. Returns None on any failure.
fn read_capped(path: &Path, cap: u64) -> Option<Vec<u8>> {
    let md = std::fs::metadata(path).ok()?;
    if md.len() > cap {
        return None;
    }
    std::fs::read(path).ok()
}

#[tauri::command]
fn analyze_files(app: tauri::AppHandle, paths: Vec<String>) -> Vec<FileReport> {
    // One ExifTool call for all files (fast).
    let mut exif_maps: HashMap<String, serde_json::Map<String, serde_json::Value>> = HashMap::new();
    if !paths.is_empty() {
        let bin = exiftool_bin(&app);
        let out = Command::new(&bin)
            .args(["-j", "-G", "-a", "-u", "-ee"])
            .args(&paths)
            .output();
        if let Ok(o) = out {
            if o.status.success() {
                if let Ok(v) = serde_json::from_slice::<serde_json::Value>(&o.stdout) {
                    if let Some(arr) = v.as_array() {
                        for item in arr {
                            if let Some(obj) = item.as_object() {
                                if let Some(src) = obj
                                    .get("SourceFile")
                                    .and_then(|x| x.as_str())
                                {
                                    exif_maps.insert(src.to_string(), obj.clone());
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    paths
        .into_iter()
        .map(|p| {
            let path = Path::new(&p);
            let file_name = path
                .file_name()
                .map(|s| s.to_string_lossy().to_string())
                .unwrap_or_else(|| p.clone());
            let mut key_tags = HashMap::new();
            let mut shutter = ShutterInfo {
                value: None,
                source: "none".into(),
                experimental: false,
                note: "No shutter counter found in metadata.".into(),
            };
            let mut r10: Option<R10Info> = None;
            let mut error: Option<String> = None;
            let mut camera: Option<CameraRef> = None;

            // Match exif map by exact path or file name suffix (exiftool abs/rel paths vary).
            let emap = exif_maps.get(&p).or_else(|| {
                exif_maps
                    .iter()
                    .find(|(k, _)| k.ends_with(&file_name))
                    .map(|(_, v)| v)
            });

            if let Some(map) = emap {
                for k in [
                    "Model",
                    "Make",
                    "CreateDate",
                    "DateTimeOriginal",
                    "ShutterMode",
                    "SerialNumber",
                    "InternalSerialNumber",
                    "LensModel",
                    "RFLensType",
                    "ISO",
                    "ExposureTime",
                    "FNumber",
                    "FocalLength",
                    "ImageSize",
                    "FileType",
                    "ShutterSpeed",
                    "FirmwareVersion",
                ] {
                    if let Some(v) = pick_tag(map, &[k]) {
                        key_tags.insert(k.to_string(), v);
                    }
                }
            } else {
                error = Some("ExifTool returned no data for this file.".into());
            }

            // Shutter via the shared camera registry (web/cameras/*/camera.toml):
            // native exif-tag strategies read the ExifTool JSON, blob-scan
            // strategies read raw bytes. Read-only, one read per file.
            let flat = flatten_exif(emap);
            let bytes = read_capped(path, 1 << 30);
            let ctx = cameras::Ctx {
                bytes: bytes.as_deref().filter(|b| !b.is_empty()),
                exif: &flat,
                file_name: &file_name,
            };
            match cameras::read_shutter(&ctx) {
                Some(hit) => {
                    shutter = ShutterInfo {
                        value: Some(hit.value),
                        source: hit.source.clone(),
                        experimental: hit.experimental,
                        note: hit.note.clone(),
                    };
                    camera = Some(CameraRef {
                        id: hit.camera_id.clone(),
                        label: hit.camera_label.clone(),
                    });
                    // Back-compat bytes line for blob hits (desktop UI).
                    if hit.source == "r10-blob" {
                        if let Some((off, b)) = hit.blob {
                            r10 = Some(R10Info {
                                value: hit.value,
                                bytes: b,
                                blob_offset: off,
                            });
                        }
                    }
                    if hit.file_number {
                        shutter.note = format!(
                            "File number from filename — not a shutter count. ({})",
                            hit.note
                        );
                    }
                }
                None => {
                    if error.is_none() {
                        error = Some("No readable counter in this file.".into());
                    }
                }
            }

            FileReport {
                path: p,
                file_name,
                shutter,
                camera,
                r10,
                key_tags,
                error,
            }
        })
        .collect()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            // Without this, `transparent: true` is just a see-through hole.
            // The OS compositor must be told to blur behind the window:
            // Mica on Windows 11, vibrancy on macOS.
            if let Some(window) = app.get_webview_window("main") {
                #[cfg(target_os = "macos")]
                window.set_effects(
                    EffectsBuilder::new()
                        .effects([Effect::Sidebar])
                        .state(EffectState::Active)
                        .radius(12.0)
                        .build(),
                )?;
                #[cfg(target_os = "windows")]
                window.set_effects(EffectsBuilder::new().effect(Effect::Mica).build())?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![analyze_files])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

