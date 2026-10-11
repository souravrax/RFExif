<div align="center">
  <img src="icon-src.png" width="128" alt="ShutterDrop icon" />
  <h1>ShutterDrop</h1>
  <p><strong>Find your camera's shutter count from a photo — 100% local.</strong><br />
  Drop a CR3, JPG, or HIF. No uploads, no accounts, originals never modified.</p>

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![CI](https://github.com/souravrax/ShutterDrop/actions/workflows/ci.yml/badge.svg)](https://github.com/souravrax/ShutterDrop/actions/workflows/ci.yml)
[![Pages](https://github.com/souravrax/ShutterDrop/actions/workflows/pages.yml/badge.svg)](https://github.com/souravrax/ShutterDrop/actions/workflows/pages.yml)
[![Release](https://img.shields.io/github/v/release/souravrax/ShutterDrop)](https://github.com/souravrax/ShutterDrop/releases)
</div>

- **Web app (no install):** https://souravrax.github.io/ShutterDrop/
- **Desktop app (Windows):** [Releases](https://github.com/souravrax/ShutterDrop/releases) — NSIS + MSI installers, ExifTool bundled

## Why ShutterDrop

Most shutter-count tools either upload your photos, paywall your own data, or
simply don't support your body. Canon's **EOS R10** (like the R7 / RP) publishes
no EXIF shutter count at all — ExifTool reports `CanonCameraInfoUnknown` and
stops there.

ShutterDrop reverse-engineered it: the 4608-byte `CanonCameraInfo` blob (TIFF
tag `0x000D`, magic `BB CC 00 00`) holds a little-endian uint32 total-actuation
counter at byte **`0xC93` (3219)** — proven across 14 consecutive shots
(`22146 → 22165`): +1 per saved frame, zero skips, CR3 == JPG of the same
shot, incrementing on mechanical **and** electronic shutter. Details and full
evidence table: [`web/cameras/canon-r10/README.md`](web/cameras/canon-r10/README.md).

## Features

- 📸 **Drag-and-drop reading** — CR3, JPG, HIF; single files or batches
- 🔒 **Private by design** — desktop and web parse everything on-device
- 📷 **Multi-camera SDK** — one declarative folder per body (`camera.toml` +
  vectors + docs), shared by web and desktop; see [Adding your camera](#adding-your-camera)
- 🧪 **Honest counters** — reverse-engineered offsets carry an *experimental*
  badge until USB-confirmed; file numbers are labeled as file numbers, never
  as shutter counts
- 📊 **Health context** — % of rated shutter life per body where known

## Supported cameras

| Body | Strategies | Web | Desktop | USB-confirmed | Rated |
|---|---|---|---|---|---|
| Canon EOS R10 | `blob-scan` | ✅ | ✅ | experimental | 100,000 |
| Native EXIF fallback | `exif-tag` | ✅¹ | ✅ | yes | — |

¹ Web resolves native tags once a fuller EXIF backend is present; desktop
ExifTool decodes them today (R5/R6/R6II/R8/R50/R3 family).

Full matrix (generated from manifests): [`web/cameras/README.md`](web/cameras/README.md).

## Install

**No-install option:** open the [web app](https://souravrax.github.io/ShutterDrop/)
and drop files in. Works offline after first load.

**Windows desktop:** download `ShutterDrop_*_x64-setup.exe` (NSIS) or the `.msi`
from [Releases](https://github.com/souravrax/ShutterDrop/releases). ExifTool is
bundled — no setup needed.

**macOS desktop:** clone and build locally (Apple Silicon or Intel):

```sh
git clone https://github.com/souravrax/ShutterDrop.git
cd ShutterDrop
npm install
# place the macOS exiftool binary at:
#   src-tauri/binaries/exiftool-aarch64-apple-darwin  (Apple Silicon)
#   src-tauri/binaries/exiftool-x86_64-apple-darwin   (Intel)
# from https://exiftool.org, then:
npm run tauri build -- --config src-tauri/tauri.macos.json
```

The `.dmg` lands in `src-tauri/target/release/bundle/dmg/`.

## Adding your camera

Cameras are declarative plugins — no Rust or Svelte required for the common
case. Copy `web/cameras/_template/`, fill in `camera.toml` + `vectors.json` +
`README.md`, prove the offset with 3+ consecutive originals:

```sh
cd web
npm run validate   # manifest contract
npm test           # vector harness (needs $SHUTTERDROP_SAMPLES)
npm run matrix     # regen the support table above
```

Full SDK guide: [`web/cameras/CONTRIBUTING.md`](web/cameras/CONTRIBUTING.md).

## Development

**Desktop (Tauri v2 + Rust):**

```sh
npm install
npm run tauri dev
```

Requires Rust (MSVC + Windows 11 SDK on Windows) and Node 24+. Camera logic
lives in `web/cameras/` — the Rust side code-generates from the same
`camera.toml` manifests at build time (`src-tauri/build.rs`), so both apps
stay in lockstep by construction.

```powershell
$env:SHUTTERDROP_SAMPLES="C:\path\to\cr3s"
cargo test --manifest-path src-tauri/Cargo.toml --lib   # same vectors.json
```

**Web (SvelteKit, static export):**

```sh
cd web
npm install
npm run dev      # local preview
npm run build    # static output in web/build (what Pages serves)
```

**Bundling ExifTool** (desktop installers only; `src-tauri/binaries/` is
git-ignored):

| File | Source |
|---|---|
| `exiftool-x86_64-pc-windows-msvc.exe` + `exiftool_files/` | `ExifTool.exe` + `exiftool_files/` from the Windows zip |
| `exiftool-aarch64-apple-darwin` | macOS package |
| `exiftool-x86_64-unknown-linux-gnu` | Linux tarball |

The app resolves them via Tauri resources with dev-path and `PATH` fallbacks.
Resources are per-platform overlays (Tauri validates every listed file at
build time, so one shared list would break all other OSes):

| Build | Command |
|---|---|
| Windows | `npm run tauri build -- --config src-tauri/tauri.windows.json` |
| macOS | `npm run tauri build -- --config src-tauri/tauri.macos.json` |
| Linux | `npm run tauri build -- --config src-tauri/tauri.linux.json` |

## License & credits

Apache-2.0 — see [LICENSE](LICENSE).

- ExifTool © Phil Harvey — https://exiftool.org (own license, bundled with attribution)
- R5/R6-family offsets: ExifTool forum + community research
- R10 `0xC93` offset: reverse-engineered from 14 consecutive R10 CR3/JPG pairs
