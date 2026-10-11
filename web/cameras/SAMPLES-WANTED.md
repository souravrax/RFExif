# Samples wanted

No body ships without proof: **3+ consecutive original files** (`+1` per shot)
plus, ideally, a USB cross-check value. Have one of these bodies? You can
unlock it for everyone.

## How to contribute samples

1. Shoot 3+ consecutive **originals** (no edits, no messenger recompress —
   edited exports strip the MakerNote blob). If mirrorless, mix mechanical +
   electronic if you can.
2. Note the expected count per file (USB reading via DIRE ShutterCount /
   EOSMSG / gphoto2, or a previous trusted reading), or at least confirm
   they are consecutive with nothing shot in between.
3. Open an issue with body + firmware + vector table, or PR straight into
   `web/cameras/<id>/` per `CONTRIBUTING.md` (we never need your photos
   uploaded anywhere public — vectors reference filenames + expected counts;
   maintainers verify against privately shared files).

## Tier 1 — manifest-only (no research, just files)

ExifTool already decodes these; each needs only a `camera.toml` + vectors.
Highest value first:

| Body | Strategy | Needs |
|---|---|---|
| Nikon Z + DSLRs (any) | `exif-tag` MakerNote `0x00A7` — one manifest covers the brand | 3 NEFs + expected counts |
| Canon R5 / R6 / R3 | `exif-tag` (CameraInfo `0x0AF1`) | 3 CR3s + expected counts |
| Canon R6II / R8 / R50 | `exif-tag` (CameraInfo `0x0D29`) | 3 CR3s + expected counts |
| Canon R5II | `exif-tag` (CameraInfo `0x069C`) | 3 CR3s + expected counts |
| Canon R1 / R6III | `exif-tag` (`0x086D` ImageCount — resets on format, labeled as such) | 3 CR3s + expected counts |
| Pentax (any) | `exif-tag` (MakerNote `0x005D`, documented XOR) | 3 files + expected counts |
| Canon 1D / 1Ds series | `exif-tag` FileInfo `ShutterCount` (CR2) | 3 CR2s + expected counts |

## Tier 2 — needs the R10 playbook (consecutive-series research)

Same 4608-byte `0x000D` blob confirmed present, offset unknown. Needs a
volunteer shooting the full protocol (3+ mech + 3+ elec, CR3+JPG pairs):

- EOS R7 · EOS RP · EOS R · EOS R100 · EOS 90D

## Tier 3 — needs a custom strategy port

- **Sony** (`0x9050`, documented obfuscation) — port the known algorithm as a
  `decrypt-sony` strategy; needs ARW samples + USB values.
- **PowerShot G5 X II** (CR3 `0x0A95` / JPEG `0x0293` per ExifTool) — needs
  sample files to confirm.

## Known-impossible (do not bother)

Consumer Canon CR2 bodies (xxxD/xxxxD, xxD, pre-R6 xD): **no in-file counter
exists** — USB-PTP only. OM System / Panasonic / most Fujifilm: same story
as far as anyone has found. These stay out of the matrix on purpose.
