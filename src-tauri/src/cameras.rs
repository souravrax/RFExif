// Camera registry generated from web/cameras/*/camera.toml (see build.rs).
// Same manifests, same vectors, same behavior as the web app.
use regex::Regex;
use std::collections::HashMap;
use std::sync::LazyLock;

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum StrategyKind {
    BlobScan,
    ExifTag,
    Filename,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum ImgFormat {
    U16Le,
    U32Le,
    U16Be,
    U32Be,
}

#[derive(Debug, Clone)]
#[allow(dead_code)]
pub struct Strategy {
    pub kind: StrategyKind,
    pub magic: Vec<u8>,
    pub offset: usize,
    pub format: ImgFormat,
    pub tag: String,
    pub pattern: String,
    pub platforms: Vec<String>,
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
    pub strategies: Vec<Strategy>,
}

#[derive(Debug, Clone)]
pub struct Hit {
    pub camera_id: String,
    pub camera_label: String,
    pub value: u32,
    pub source: String,
    pub experimental: bool,
    pub note: String,
    pub file_number: bool,
    pub blob: Option<(u64, [u8; 4])>,
}

include!(concat!(env!("OUT_DIR"), "/cameras_generated.rs"));

fn cameras_sorted() -> Vec<CameraManifest> {
    let mut v = generated_cameras();
    // Specific cameras (with models) before the model-less generic fallback.
    v.sort_by(|a, b| {
        (!a.models.is_empty())
            .cmp(&(!b.models.is_empty()))
            .reverse()
            .then(a.id.cmp(&b.id))
    });
    v
}

static CAMERAS: LazyLock<Vec<CameraManifest>> = LazyLock::new(cameras_sorted);

/// Model sniffing for RAW files: plain-ASCII model string in the header.
fn sniff_model(bytes: &[u8]) -> String {
    let n = bytes.len().min(65536);
    let mut s = String::with_capacity(n);
    for &c in &bytes[..n] {
        s.push(if (32..127).contains(&c) { c as char } else { '\n' });
    }
    for pat in [
        r"Canon\s+EOS\s+[A-Za-z0-9][A-Za-z0-9 .\-]{0,14}",
        r"NIKON\s+[A-Z0-9][A-Z0-9 ]{1,11}",
        r"SONY\s+ILCE-[A-Z0-9]+",
    ] {
        if let Ok(rx) = Regex::new(pat) {
            if let Some(m) = rx.find(&s) {
                return m.as_str().trim_end().to_string();
            }
        }
    }
    String::new()
}

fn find_magic(bytes: &[u8], magic: &[u8], min_trailing: usize) -> Option<usize> {
    if magic.is_empty() || bytes.len() < magic.len() + min_trailing {
        return None;
    }
    let limit = bytes.len() - magic.len() - min_trailing;
    (0..=limit).find(|&i| &bytes[i..i + magic.len()] == magic)
}

fn read_int(bytes: &[u8], off: usize, format: ImgFormat) -> Option<u32> {
    let n = match format {
        ImgFormat::U16Le | ImgFormat::U16Be => 2,
        ImgFormat::U32Le | ImgFormat::U32Be => 4,
    };
    let s = bytes.get(off..off + n)?;
    Some(match format {
        ImgFormat::U16Le => u16::from_le_bytes([s[0], s[1]]) as u32,
        ImgFormat::U32Le => u32::from_le_bytes([s[0], s[1], s[2], s[3]]),
        ImgFormat::U16Be => u16::from_be_bytes([s[0], s[1]]) as u32,
        ImgFormat::U32Be => u32::from_be_bytes([s[0], s[1], s[2], s[3]]),
    })
}

fn short_tag(t: &str) -> &str {
    t.find(':').map(|i| &t[i + 1..]).unwrap_or(t)
}

fn trailing_digits(s: &str) -> Option<u32> {
    let digits: String = s
        .trim()
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

pub struct Ctx<'a> {
    pub bytes: Option<&'a [u8]>,
    pub exif: &'a HashMap<String, String>,
    pub file_name: &'a str,
}

/// Run all camera manifests for the desktop platform. First hit wins.
pub fn read_shutter(ctx: &Ctx) -> Option<Hit> {
    let mut model = ctx.exif.get("Model").cloned().unwrap_or_default();
    if model.is_empty() {
        if let Some(b) = ctx.bytes {
            model = sniff_model(b);
        }
    }
    for cam in CAMERAS.iter() {
        if !cam.models.is_empty() {
            let hay = format!("{model} {}", ctx.file_name);
            let mut ok = false;
            for pat in &cam.models {
                if Regex::new(pat).map(|rx| rx.is_match(&hay)).unwrap_or(false) {
                    ok = true;
                    break;
                }
            }
            if !ok {
                continue;
            }
        }
        for st in &cam.strategies {
            if !st.platforms.is_empty() && !st.platforms.iter().any(|p| p == "desktop") {
                continue;
            }
            if let Some(hit) = run_strategy(cam, st, ctx) {
                return Some(hit);
            }
        }
    }
    None
}

fn run_strategy(cam: &CameraManifest, st: &Strategy, ctx: &Ctx) -> Option<Hit> {
    let base = |value: u32, file_number: bool, blob: Option<(u64, [u8; 4])>| Hit {
        camera_id: cam.id.clone(),
        camera_label: cam.label.clone(),
        value,
        source: st.source.clone(),
        experimental: st.experimental,
        note: st.note.clone(),
        file_number,
        blob,
    };
    match st.kind {
        StrategyKind::BlobScan => {
            let bytes = ctx.bytes?;
            let at = find_magic(bytes, &st.magic, st.offset + 4)?;
            let o = at + st.offset;
            let v = read_int(bytes, o, st.format)?;
            let mut b = [0u8; 4];
            b.copy_from_slice(bytes.get(o..o + 4)?);
            Some(base(v, false, Some((at as u64, b))))
        }
        StrategyKind::ExifTag => {
            let raw = ctx
                .exif
                .get(&st.tag)
                .or_else(|| ctx.exif.get(short_tag(&st.tag)))?;
            let v = trailing_digits(raw)?;
            Some(base(v, false, None))
        }
        StrategyKind::Filename => {
            let rx = Regex::new(&st.pattern).ok()?;
            let caps = rx.captures(ctx.file_name)?;
            let v: u32 = caps.get(1)?.as_str().parse().ok()?;
            Some(base(v, true, None))
        }
    }
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

    fn sample_dir() -> PathBuf {
        std::env::var("SHUTTERDROP_SAMPLES")
            .map(PathBuf::from)
            .unwrap_or_else(|_| {
                PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..").join("samples")
            })
    }

    #[test]
    fn manifest_vectors() {
        // Every cameras/*/vectors.json, run through the desktop registry.
        let cams = cameras_dir();
        let samples = sample_dir();
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
            let vec_path = entry.path().join("vectors.json");
            if !vec_path.exists() {
                continue;
            }
            let text = std::fs::read_to_string(&vec_path).unwrap();
            let vectors: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap();
            for v in vectors {
                let expected = v.get("expected").and_then(|x| x.as_u64()).unwrap() as u32;
                let file = v.get("file").and_then(|x| x.as_str()).unwrap_or("synthetic");
                let (bytes_owned, exif_owned, fname): (Vec<u8>, HashMap<String, String>, String) =
                    if let Some(inline) = v.get("exif") {
                        let mut m = HashMap::new();
                        for (k, val) in inline.as_object().cloned().unwrap_or_default() {
                            m.insert(k, val.as_str().unwrap_or("").to_string());
                        }
                        (vec![], m, file.to_string())
                    } else {
                        let p = samples.join(file);
                        if !p.exists() {
                            continue; // samples not vendored in CI
                        }
                        (std::fs::read(&p).unwrap(), HashMap::new(), file.to_string())
                    };
                let synthetic = v.get("exif").is_some();
                let ctx = Ctx {
                    bytes: if synthetic { None } else { Some(&bytes_owned) },
                    exif: &exif_owned,
                    file_name: &fname,
                };
                let hit = read_shutter(&ctx)
                    .unwrap_or_else(|| panic!("{name} {file}: no hit"));
                assert_eq!(hit.camera_id, name, "{file}: wrong camera");
                assert_eq!(hit.value, expected, "{name} {file}");
                ran += 1;
            }
        }
        // Synthetic vectors always run; file vectors need samples on disk.
        // A zero-run with vectors present means the harness is broken.
        assert!(ran >= 1, "no vectors executed");
    }
}
