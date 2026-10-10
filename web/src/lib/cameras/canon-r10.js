// Canon EOS R10 extractor — reverse-engineered, experimental.
import { register } from "../exif/registry.js";
import { findR10Shutter } from "../exif/r10.js";

var SHUTTER_NOTE = "Experimental R10 offset 0xC93 uint32 LE — total mechanical + electronic combined. Validated 22146→22165 on 14 consecutive shots.";

export var extractor = register({
  id: "canon-r10",
  label: "Canon EOS R10",
  models: [/\bEOS R10\b/i, /\bR10\b/i],
  ratedLife: 100000,
  needs: ["bytes"],
  read: function (ctx) {
    var hit = findR10Shutter(ctx.bytes);
    if (!hit) return null;
    return { value: hit.value >>> 0, source: "r10-blob", experimental: true, note: SHUTTER_NOTE };
  }
});
