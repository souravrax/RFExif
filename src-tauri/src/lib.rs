// ShutterDrop backend: ExifTool + reverse-engineered Canon R10 counter.
// R10 stores a 4608-byte CanonCameraInfo blob (TIFF tag 0x000D, header BB CC 00 00).
// Byte offset 0xC93 (3219) little-endian uint32 = total actuations (mech + EFCS + electronic).
// Validated 22146 -> 22165 across 14 consecutive CR3/JPG pairs.
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::process::Command;
use tauri::Manager;

const R10_BLOB_LEN: usize = 4608;
const R10_SHUTTER_OFF: usize = 3219; // 0xC93
const BLOB_MAGIC: [u8; 4] = [0xBB, 0xCC, 0x00, 0x00];

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
pub struct FileReport {
    pub path: String,
    pub file_name: String,
    pub shutter: ShutterInfo,
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

/// Locate the R10 CameraInfo blob and read the shutter counter. Read-only.
fn read_r10_blob(path: &Path) -> Result<R10Info, String> {
    let data = std::fs::read(path).map_err(|e| format!("read failed: {e}"))?;
    if data.len() < R10_BLOB_LEN + 4 {
        return Err("file too small for R10 blob".into());
    }
    // Sliding search for magic; blob must have 4608 bytes after it.
    let mut start: Option<usize> = None;
    for i in 0..=(data.len() - R10_BLOB_LEN - 4) {
        if data[i] == BLOB_MAGIC[0]
            && data[i + 1] == BLOB_MAGIC[1]
            && data[i + 2] == BLOB_MAGIC[2]
            && data[i + 3] == BLOB_MAGIC[3]
        {
            start = Some(i);
            break;
        }
    }
    let s = start.ok_or("R10 CameraInfo blob (BB CC) not found")?;
    let o = s + R10_SHUTTER_OFF;
    if o + 4 > data.len() {
        return Err("shutter offset out of range".into());
    }
    let b = [data[o], data[o + 1], data[o + 2], data[o + 3]];
    let value = u32::from_le_bytes(b);
    Ok(R10Info {
        value,
        bytes: b,
        blob_offset: s as u64,
    })
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
    // 3. System PATH.
    PathBuf::from("exiftool")
}

fn parse_u32(s: &str) -> Option<u32> {
    let t = s.trim();
    // ExifTool FileNumber prints like "101-4154"; take trailing run.
    let digits: String = t
        .chars()
        .rev()
        .take_while(|c| c.is_ascii_digit())
        .collect::<String>()
        .chars()
        .rev()
        .collect();
    if digits.is_empty() {
        return None;
    }
    digits.parse::<u32>().ok()
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
                // Native ShutterCount first (R5/R6/R6II etc.).
                if let Some(raw) = pick_tag(map, &["ShutterCount", "ImageCount"]) {
                    if let Some(v) = parse_u32(&raw) {
                        shutter = ShutterInfo {
                            value: Some(v),
                            source: "exif".into(),
                            experimental: false,
                            note: "Native EXIF ShutterCount.".into(),
                        };
                    }
                }
            } else {
                error = Some("ExifTool returned no data for this file.".into());
            }

            // R10 fallback: raw blob (works even where ExifTool has no map).
            let model = emap
                .and_then(|m| pick_tag(m, &["Model"]))
                .unwrap_or_default();
            let looks_like_r10 =
                model.contains("R10") || file_name.to_lowercase().ends_with(".cr3");
            if shutter.value.is_none() && looks_like_r10 {
                match read_r10_blob(path) {
                    Ok(info) => {
                        shutter = ShutterInfo {
                            value: Some(info.value),
                            source: "r10-blob".into(),
                            experimental: true,
                            note: "Experimental R10 offset 0xC93 uint32 LE — total mech + EFCS + electronic combined. Validated 22146→22165 on 14 consecutive shots.".into(),
                        };
                        r10 = Some(info);
                    }
                    Err(e) => {
                        if error.is_none() {
                            error = Some(format!("R10 blob: {e}"));
                        }
                    }
                }
            }

            FileReport {
                path: p,
                file_name,
                shutter,
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
        .invoke_handler(tauri::generate_handler![analyze_files])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    fn sample_dir() -> PathBuf {
        std::env::var("SHUTTERDROP_SAMPLES")
            .map(PathBuf::from)
            .unwrap_or_else(|_| {
                PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..").join("samples")
            })
    }

    #[test]
    fn r10_blob_vectors() {
        // (file, expected shutter) — validated series 22146 -> 22165.
        for (f, want) in [
            ("IMG_4154.CR3", 22146u32),
            ("IMG_4155.CR3", 22147u32),
            ("IMG_4162.CR3", 22154u32),
            ("IMG_4173.CR3", 22165u32),
        ] {
            let p = sample_dir().join(f);
            if !p.exists() {
                continue; // samples not vendored in CI
            }
            let info = read_r10_blob(&p).expect("blob read");
            assert_eq!(info.value, want, "{f}");
            assert_eq!(info.bytes[2], 0);
            assert_eq!(info.bytes[3], 0);
        }
    }
}
