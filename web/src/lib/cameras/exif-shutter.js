// Generic native-EXIF extractor — future-proofing.
import { register } from "../exif/registry.js";

export var extractor = register({
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
});
