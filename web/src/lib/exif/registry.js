// ShutterDrop camera registry — the plugin interface (ESM).
//
// An extractor is a plain object:
//   {
//     id: "canon-r10",            // unique kebab-case id
//     label: "Canon EOS R10",     // display name
//     models: [/\bEOS R10\b/i],   // matched against EXIF Model + filename
//     ratedLife: 100000,          // shutter rating for the % bar (optional)
//     needs: ["bytes"],           // subset of ["bytes", "exif"]
//     read(ctx) {}                // ctx = { bytes:Uint8Array, exif:{}, fileName }
//                                 // -> { value:uint32, source, experimental, note } | null
//   }
//
// read() tries extractors in registration order; the first whose models
// match (or which has no models filter) and whose read() returns non-null
// wins. read() must never throw — return null on miss.
var extractors = [];

export function register(ext) {
  if (!ext || !ext.id || typeof ext.read !== "function") {
    throw new Error("ShutterDrop: extractor needs {id, read}");
  }
  extractors.push(ext);
  return ext;
}

function matches(ext, exif, fileName) {
  if (!ext.models || !ext.models.length) return true;
  var hay = ((exif && exif.Model) || "") + " " + (fileName || "");
  for (var i = 0; i < ext.models.length; i++) {
    if (ext.models[i].test(hay)) return true;
  }
  return false;
}

// CR3/RAW files expose no base-EXIF Model to the web parser, but the model
// string sits as plain ASCII in the file header (Canon CMT boxes).
// Scan the first 64KB — fast, no full-file decode.
export function sniffModel(bytes) {
  if (!bytes) return "";
  var n = Math.min(bytes.length, 65536);
  var s = "";
  for (var i = 0; i < n; i++) {
    var c = bytes[i];
    s += (c >= 32 && c < 127) ? String.fromCharCode(c) : "\n";
  }
  var m = s.match(/Canon\s+EOS\s+[A-Za-z0-9][A-Za-z0-9 .\-]{0,14}/) ||
          s.match(/NIKON\s+[A-Z0-9][A-Z0-9 ]{1,11}/) ||
          s.match(/SONY\s+ILCE-[A-Z0-9]+/);
  return m ? m[0].replace(/\s+$/, "") : "";
}

export function read(ctx) {
  // Enrich Model for RAW files the base-EXIF parser can't identify.
  var exif = ctx.exif || {};
  if (!exif.Model && ctx.bytes) {
    var sniffed = sniffModel(ctx.bytes);
    if (sniffed) {
      var merged = { Model: sniffed };
      for (var k in ctx.exif) merged[k] = ctx.exif[k];
      exif = merged;
    }
  }
  for (var i = 0; i < extractors.length; i++) {
    var ext = extractors[i];
    if (!matches(ext, exif, ctx.fileName)) continue;
    try {
      var res = ext.read(ctx);
      if (res && typeof res.value === "number") {
        return { extractor: ext, result: res };
      }
    } catch (e) { /* extractor miss — try next */ }
  }
  return null;
}

export function list() { return extractors.slice(); }
