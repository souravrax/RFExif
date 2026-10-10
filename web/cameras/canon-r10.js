// Canon EOS R10 extractor — reverse-engineered, experimental.
//
// The R10 publishes no EXIF ShutterCount. Its 4608-byte CanonCameraInfo blob
// (TIFF tag 0x000D, magic BB CC 00 00, present in CR3 CTMD and in JPG
// MakerNotes) holds a little-endian uint32 TOTAL actuation counter
// (mechanical + EFCS + electronic) at byte 0xC93.
//
// Evidence: 14 consecutive shots 22146 -> 22165, +1 per saved frame,
// CR3 == JPG of the same shot, increments on mechanical and electronic.
(function (root, factory) {
  function getRegistry() {
    if (typeof module !== "undefined" && module.exports) return require("./registry");
    return root.ShutterDropCameraRegistry;
  }
  function getR10() {
    if (typeof module !== "undefined" && module.exports) return require("../r10");
    return root.ShutterDropR10;
  }
  var ext = factory(getRegistry(), getR10());
  if (typeof module !== "undefined" && module.exports) module.exports = ext;
})(typeof self !== "undefined" ? self : this, function (Registry, R10) {
  var SHUTTER_NOTE = "Experimental R10 offset 0xC93 uint32 LE — total mechanical + electronic combined. Validated 22146→22165 on 14 consecutive shots.";
  var ext = {
    id: "canon-r10",
    label: "Canon EOS R10",
    models: [/\bEOS R10\b/i, /\bR10\b/i],
    ratedLife: 100000,
    needs: ["bytes"],
    read: function (ctx) {
      var hit = R10.findR10Shutter(ctx.bytes);
      if (!hit) return null;
      return { value: hit.value >>> 0, source: "r10-blob", experimental: true, note: SHUTTER_NOTE };
    }
  };
  Registry.register(ext);
  return ext;
});
