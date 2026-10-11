# ShutterDrop [![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)

Drop CR3 / JPG / HIF — shutter count + full EXIF, 100% local. No uploads, originals are never modified (read-only).

**Web app:** https://souravrax.github.io/ShutterDrop/ · **Desktop:** [Releases](https://github.com/souravrax/ShutterDrop/releases) (Tauri, ExifTool bundled)

## Why it exists

ExifTool decodes `ShutterCount` for R5 / R6 (`0xAF1`) and R6II / R8 / R50 (`0x0D29`),
but the **EOS R10** (and R7 / RP) layout is unpublished — ExifTool reports
`Canon_CameraInfoUnknown` with no shutter.

ShutterDrop adds a fallback: the 4608-byte `CanonCameraInfo` blob (TIFF tag `0x000D`,
magic `BB CC 00 00`) holds a little-endian uint32 at byte **`0xC93` (3219)** that
behaves exactly like a total actuation counter:

- 14 consecutive shots: `22146 → 22165`, +1 per saved frame, zero skips
- CR3 and JPG of the same shot always agree
- increments on mechanical **and** electronic shutter (total, like R6)

Shown in the UI with an **experimental** badge until cross-checked against a USB
reading for your body.

## Install

- **Windows**: download `ShutterDrop_0.1.0_x64-setup.exe` (NSIS) or
  `ShutterDrop_0.1.0_x64_en-US.msi` from
  [Releases](https://github.com/souravrax/ShutterDrop/releases). ExifTool is
  bundled — no setup needed.
- **macOS**: clone and build locally (Apple Silicon or Intel):
  ```sh
  git clone https://github.com/souravrax/ShutterDrop.git
  cd ShutterDrop
  npm install
  # place the macOS exiftool binary at:
  #   src-tauri/binaries/exiftool-aarch64-apple-darwin  (Apple Silicon)
  #   src-tauri/binaries/exiftool-x86_64-apple-darwin   (Intel)
  # from https://exiftool.org ü then:
  npm run tauri build
  ```
  The `.dmg` lands in `src-tauri/target/release/bundle/dmg/`.

## Dev

```sh
npm install
npm run tauri dev
```

Needs Rust (MSVC + Windows 11 SDK on Windows) — see `src-tauri/`.

Run the blob regression test against sample files:

```powershell
$env:SHUTTERDROP_SAMPLES="C:\path\to\cr3s"
cargo test --manifest-path src-tauri/Cargo.toml --lib
```

## Bundling ExifTool (required at build time)

`src-tauri/binaries/` is git-ignored. Before `tauri build`, place per-platform
binaries there (ExifTool by Phil Harvey, Artistic License — https://exiftool.org):

| File | Source |
|---|---|
| `exiftool-x86_64-pc-windows-msvc.exe` + `exiftool_files/` | `ExifTool.exe` + `exiftool_files/` from the Windows zip |
| `exiftool-aarch64-apple-darwin` | macOS package |
| `exiftool-x86_64-unknown-linux-gnu` | Linux tarball |

The app resolves them via Tauri resources at runtime and falls back to dev paths
and system `PATH`. They are compiled into the installer through
`tauri.conf.json → bundle.resources`.

## Credits

- ExifTool © Phil Harvey — https://exiftool.org (own license, bundled with attribution)
- R6/R6II offsets: ExifTool forum + community research
- R10 `0xC93` offset: reverse-engineered from 14 consecutive R10 CR3/JPG pairs

## Adding your camera

Cameras are declarative plugins — one folder per body in `web/cameras/`
(`camera.toml` + `vectors.json` + `README.md`), consumed by both the web app
and the desktop build from the same files. Strategies (`blob-scan`,
`exif-tag`, `filename`) run in manifest order; ExifTool stays as the base
EXIF layer on desktop. Full SDK guide: [`web/cameras/CONTRIBUTING.md`](web/cameras/CONTRIBUTING.md).
Support matrix: [`web/cameras/README.md`](web/cameras/README.md).
Apache-2.0, see [LICENSE](LICENSE).
