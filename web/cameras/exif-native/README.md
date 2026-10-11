# Native-EXIF fallback

Catch-all camera with no `models` filter — the registry always tries it
**last**. It fires when the EXIF backend already decoded a shutter counter
into a plain `ShutterCount` field:

- **Desktop**: bundled ExifTool 13.59 decodes MakerNotes, so R5/R6 (`0xAF1`),
  R6II/R8/R50 (`0x0D29`), R3 and similar bodies resolve here with zero
  per-camera work.
- **Web**: fires via lazy-loaded ExifTool-WASM 13.42 (self-hosted
  `wasm/zeroperl.wasm`, no CDN), which decodes MakerNotes in-browser after
  the instant card renders. Until the WASM module loads, only the mini-EXIF
  reader feeds this strategy.

`experimental = false`: a native tag needs no USB cross-check — ExifTool's
decoding *is* the reference. Vectors use synthetic EXIF (no sample files).
