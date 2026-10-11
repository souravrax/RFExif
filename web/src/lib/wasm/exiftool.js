// Full-EXIF enrichment via ExifTool-WASM (lazy, progressive).
//
// The fast path (blob-scan + mini EXIF in $lib/exif + cameras/) always
// renders first — instant, zero dependencies. This module loads the ~25MB
// zeroperl runtime on first use (vendored locally at /wasm/zeroperl.wasm,
// see web/scripts/vendor-wasm.js — no CDN) and returns the full
// MakerNotes-decoded tag map, powering native exif-tag strategies on web.
//
// Engine: ExifTool 13.42 via @uswriting/exiftool 1.0.9 (pinned).
// Desktop bundles native ExifTool 13.59; tag output can drift between the
// two — vectors record counts, not engine output.
//
// NOTE: @uswriting/exiftool's Node entry ignores the custom fetch hook on
// Windows (upstream path bug) and its CJS entry hardcodes a CI path, so
// committed tests stay on the fast path. Browser path verified manually:
// 440-tag JPG in ~0.8s, 504-tag 35MB CR3 in ~0.8s including cold start.
export var ENGINE = "exiftool-wasm 13.42 (pkg @uswriting/exiftool 1.0.9)";

var modPromise = null;

function load() {
  if (!modPromise) modPromise = import("@uswriting/exiftool");
  return modPromise;
}

// file: browser File. Returns { map: {Group:Tag -> string}, tagCount }.
// Throws on failure — callers must keep the fast-path card regardless.
export async function parseFull(file) {
  var ns = await load();
  var wasmUrl = (import.meta.env.BASE_URL || "/") + "wasm/zeroperl.wasm";
  var r = await ns.parseMetadata(file, {
    args: ["-json", "-G", "-a", "-u"],
    fetch: function () { return fetch(wasmUrl); },
    transform: function (d) { return JSON.parse(d); },
  });
  if (!r || !r.success) {
    throw new Error((r && r.error) || "ExifTool-WASM parse failed");
  }
  var obj = (r.data && r.data[0]) || {};
  var map = {};
  for (var k of Object.keys(obj)) {
    var v = obj[k];
    map[k] = Array.isArray(v) ? v.join(", ") : String(v);
  }
  return { map: map, tagCount: Object.keys(map).length };
}

// Pick display fields out of a full Group:Tag map.
export function pickEnrichment(map) {
  function first(names) {
    for (var i = 0; i < names.length; i++) {
      if (map[names[i]] !== undefined && map[names[i]] !== "") return map[names[i]];
    }
    return "";
  }
  return {
    serial: first(["MakerNotes:SerialNumber", "EXIF:SerialNumber", "SerialNumber"]),
    lens: first(["EXIF:LensModel", "MakerNotes:LensModel", "Composite:Lens", "LensModel"]),
    body: first(["EXIF:Model", "IFD0:Model", "MakerNotes:CanonModelID", "Model"]),
  };
}
