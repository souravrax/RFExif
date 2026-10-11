# Native-EXIF fallback

Catch-all camera with no `models` filter — the registry always tries it
**last**. It fires when the EXIF backend already decoded a shutter counter
into a plain `ShutterCount` field:

- **Desktop**: USB-only since the interface split — it never reads files, so
  this fallback does not apply there. R5/R6 (`0xAF1`), R6II/R8/R50 (`0x0D29`),
  R3 and similar bodies each need their own folder with a `[[usb]]`
  descriptor; until then desktop reports them unmapped.
- **Web**: fires via lazy-loaded ExifTool-WASM 13.42 (self-hosted
  `wasm/zeroperl.wasm`, no CDN), which decodes MakerNotes in-browser after
  the instant card renders. Until the WASM module loads, only the mini-EXIF
  reader feeds this strategy.

`experimental = false`: a native tag needs no USB cross-check — ExifTool's
decoding *is* the reference. Vectors use synthetic EXIF (no sample files).
