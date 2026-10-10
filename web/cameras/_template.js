// ============================================================================
// ShutterDrop camera extractor TEMPLATE.
//
// *** This file is documentation — it is never loaded. ***
// To add your camera:
//   1. Copy this file to `<your-id>.js` (e.g. `nikon-z6.js`).
//   2. Fill in id / label / models / ratedLife / read() below.
//   3. Add test vectors in `web/test/run.js` (see CONTRIBUTING.md —
//      minimum 3 consecutive original files + expected counts).
//   4. Load your file in `web/index.html` AFTER the specific extractors
//      it must lose to, and BEFORE `exif-shutter.js` (the generic
//      fallback must always run last).
//   5. Open a PR. By contributing you agree to license your work under
//      Apache-2.0 (see /LICENSE).
// ============================================================================
(function (root, factory) {
  function getRegistry() {
    if (typeof module !== "undefined" && module.exports) return require("./registry");
    return root.ShutterDropCameraRegistry;
  }
  // If you need shared byte helpers, require them the same way:
  //   var R10 = (typeof module !== "undefined") ? require("../r10") : root.ShutterDropR10;
  var ext = factory(getRegistry());
  if (typeof module !== "undefined" && module.exports) module.exports = ext;
})(typeof self !== "undefined" ? self : this, function (Registry) {
  var ext = {
    // Unique kebab-case id. Used in bug reports — keep it stable.
    id: "brand-model",

    // Display name shown on the result card.
    label: "Brand Model",

    // Match against (EXIF Model + " " + filename). First match wins,
    // so be specific: /\bEOS R7\b/i — NOT /R7/ (that also hits "R70"...).
    models: [/\bBrand Model\b/i],

    // Shutter rating for the "% used" bar. Omit or set 0 if unknown.
    ratedLife: 100000,

    // What your read() needs: any of ["bytes", "exif"].
    //   bytes — full file as Uint8Array (scan for magic, offsets, ...).
    //   exif  — base-EXIF tags from r10.js readJpegExif()
    //           ({Model, DateTime, ISO, ExposureTime, FNumber, FocalLength}).
    needs: ["bytes"],

    // ctx = { bytes, exif, fileName }.
    // Return { value, source, experimental, note } or null on miss.
    //   value        — uint32 actuation count.
    //   source       — short tag id, e.g. "makernote-0x00a7".
    //   experimental — true until confirmed against a USB reading
    //                  (DIRE ShutterCount / EOSMSG / gphoto2).
    //   note         — one line: offset, endianness, what it counts
    //                  (mechanical only? total incl. electronic?).
    // Must NEVER throw — return null and the registry tries the next one.
    read: function (ctx) {
      // Example: 4-byte LE counter at a fixed blob offset:
      // var o = 1234;
      // var v = (ctx.bytes[o] + ctx.bytes[o+1]*256 +
      //          ctx.bytes[o+2]*65536 + ctx.bytes[o+3]*16777216) >>> 0;
      // if (!v) return null;
      // return { value: v, source: "blob-0x1234", experimental: true,
      //          note: "…" };
      return null;
    }
  };
  Registry.register(ext);
  return ext;
});
