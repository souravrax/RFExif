// ============================================================================
// ShutterDrop camera escape hatch (ESM). Most cameras NEVER need this file —
// delete it unless a declarative strategy in camera.toml cannot express the
// counter (e.g. encrypted fields like Sony 0x9050).
//
// Default-export extra strategy objects appended AFTER the manifest's own:
//   { kind: "custom", platforms: ["web"], read(ctx) }
// ctx = { bytes: Uint8Array, exif: {...}, fileName }.
// Return { value, source, experimental, note, fileNumber? } or null.
// Must NEVER throw — return null and the registry tries the next strategy.
// ============================================================================
// export default [
//   {
//     kind: "custom",
//     platforms: ["web"],
//     read: function (ctx) { return null; }
//   }
// ];
export default [];
