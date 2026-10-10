// Generic native-EXIF extractor — future-proofing.
//
// Some bodies DO publish a shutter counter in plain EXIF/MakerNote-derived
// tags (R5/R6 family via ExifTool today). Our minimal web EXIF reader does
// not parse MakerNotes yet, so this extractor only fires when a parser
// supplies exif.ShutterCount — but the slot is here so any contributor who
// adds MakerNote support gets native counts for free with zero UI changes.
(function (root, factory) {
  function getRegistry() {
    if (typeof module !== "undefined" && module.exports) return require("./registry");
    return root.ShutterDropCameraRegistry;
  }
  var ext = factory(getRegistry());
  if (typeof module !== "undefined" && module.exports) module.exports = ext;
})(typeof self !== "undefined" ? self : this, function (Registry) {
  var ext = {
    id: "exif-native",
    label: "Native EXIF",
    models: [], // catch-all: runs when nothing model-specific matched first
    ratedLife: 0,
    needs: ["exif"],
    read: function (ctx) {
      var v = ctx.exif && ctx.exif.ShutterCount;
      var n = parseInt(v, 10);
      if (isNaN(n) || n < 0) return null;
      return { value: n >>> 0, source: "exif", experimental: false, note: "Native EXIF ShutterCount." };
    }
  };
  Registry.register(ext);
  return ext;
});
