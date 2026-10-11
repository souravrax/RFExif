// RF EXIF web metadata helpers (pure, framework-free, Node-testable).
//
// The full EXIF map shape is { "Group:Tag": string, ... } as produced by
// $lib/wasm/exiftool.js parseFull(). These helpers never fetch, never touch
// the DOM, and never invent values: missing tags stay missing.

export function groupOf(key) {
  var k = String(key == null ? "" : key);
  var i = k.indexOf(":");
  return i < 0 ? "Other" : k.slice(0, i) || "Other";
}

export function tagOf(key) {
  var k = String(key == null ? "" : key);
  var i = k.indexOf(":");
  return i < 0 ? k : k.slice(i + 1);
}

// WASM source currently stringifies scalars but may hand back nested
// objects/arrays after upstream fixes. Keep them as JSON (never "[object]").
export function formatValue(v) {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean" || typeof v === "bigint") return String(v);
  try {
    return JSON.stringify(v);
  } catch (e) {
    return String(v);
  }
}

// [{ key, group, tag, value }] sorted by key for stable tables.
export function toEntries(map) {
  var src = map || {};
  var out = [];
  for (var k of Object.keys(src)) {
    out.push({ key: k, group: groupOf(k), tag: tagOf(k), value: formatValue(src[k]) });
  }
  out.sort(function (a, b) {
    return a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
  });
  return out;
}

export function groupEntries(map) {
  var grouped = {};
  for (var e of toEntries(map)) {
    if (!grouped[e.group]) grouped[e.group] = [];
    grouped[e.group].push(e);
  }
  return grouped;
}

function lower(s) {
  return String(s || "").toLowerCase();
}

// Category for the grouped inspector cards. Group-first (so MakerNotes and
// GPS keep their source identity), keyword fallback for generic EXIF.
export function categorize(entry) {
  var g = String(entry.group || "");
  var t = lower(entry.tag);
  if (g === "GPS" || t.indexOf("gps") === 0 || t.indexOf("gps") > 0) return "GPS";
  if (g === "MakerNotes") return "MakerNotes";
  if (t.indexOf("lens") >= 0 || t.indexOf("focal") >= 0 || t.indexOf("focus") >= 0) return "Lens";
  if (
    t === "iso" ||
    t.indexOf("exposure") >= 0 ||
    t.indexOf("shutter") >= 0 ||
    t.indexOf("aperture") >= 0 ||
    t.indexOf("fnumber") >= 0 ||
    t.indexOf("metering") >= 0 ||
    t === "flash" ||
    t.indexOf("shutterspeed") >= 0
  )
    return "Exposure";
  if (
    t.indexOf("whitebalance") >= 0 ||
    t.indexOf("white balance") >= 0 ||
    t.indexOf("colorspace") >= 0 ||
    t.indexOf("color space") >= 0 ||
    t.indexOf("picturestyle") >= 0 ||
    t.indexOf("picture style") >= 0 ||
    t === "saturation" ||
    t === "contrast" ||
    t === "sharpness"
  )
    return "Color";
  if (
    t === "model" ||
    t.indexOf("model") >= 0 ||
    t === "make" ||
    t.indexOf("serial") >= 0 ||
    t.indexOf("firmware") >= 0 ||
    t.indexOf("camera") >= 0 ||
    t.indexOf("body") >= 0
  )
    return "Camera";
  if (
    t.indexOf("imagewidth") >= 0 ||
    t.indexOf("imageheight") >= 0 ||
    t.indexOf("imagesize") >= 0 ||
    t.indexOf("dimension") >= 0 ||
    t.indexOf("megapixel") >= 0 ||
    t.indexOf("filetype") >= 0 ||
    t.indexOf("file type") >= 0 ||
    t.indexOf("filesize") >= 0 ||
    t.indexOf("file size") >= 0 ||
    t.indexOf("bitdepth") >= 0 ||
    t.indexOf("bit depth") >= 0 ||
    t.indexOf("compression") >= 0 ||
    t === "software" ||
    t.indexOf("filename") >= 0
  )
    return "Image";
  if (g === "File" || g === "System" || g === "Composite") return "File";
  if (g === "EXIF" || g === "IFD0" || g === "IFD1" || g === "XMP" || g === "ICC") return "Image";
  return "Other";
}

export var CATEGORY_ORDER = ["Camera", "Lens", "Exposure", "Image", "Color", "MakerNotes", "GPS", "File", "Other"];

export function categorizeEntries(map) {
  var out = {};
  for (var e of toEntries(map)) {
    var c = categorize(e);
    if (!out[c]) out[c] = [];
    out[c].push(e);
  }
  return out;
}

export function filterEntries(entries, query) {
  var q = lower(query).trim();
  if (!q) return entries;
  return entries.filter(function (e) {
    return lower(e.key).indexOf(q) >= 0 || lower(e.value).indexOf(q) >= 0;
  });
}

// First non-empty value across candidate full keys (ordered preference).
export function firstValue(map, names) {
  var src = map || {};
  for (var i = 0; i < names.length; i++) {
    var v = src[names[i]];
    if (v !== undefined && v !== null && String(v).trim() !== "") return String(v);
  }
  return "";
}

// Genuine native counter lookup: tries full "Group:Tag" keys AND short
// aliases without dropping source groups (returned key keeps its group).
// Scans any short name equal to "shuttercount" so future native tags work
// even if the manifest registry order would otherwise return an
// experimental blob hit first.
export function findNativeCount(map) {
  var src = map || {};
  function counter(raw) {
    if (raw === undefined || raw === null || !/^\d+$/.test(String(raw).trim())) return null;
    var n = Number(raw);
    return Number.isSafeInteger(n) && n >= 0 && n <= 0xffffffff ? n : null;
  }
  var preferred = [
    "MakerNotes:ShutterCount",
    "EXIF:ShutterCount",
    "IFD0:ShutterCount",
    "Composite:ShutterCount",
    "XMP:ShutterCount",
    "ShutterCount",
  ];
  for (var i = 0; i < preferred.length; i++) {
    var raw = src[preferred[i]];
    var n = counter(raw);
    if (n !== null) {
      return { key: preferred[i], value: n };
    }
  }
  var keys = Object.keys(src).sort();
  for (var j = 0; j < keys.length; j++) {
    if (lower(tagOf(keys[j])) === "shuttercount") {
      var m = counter(src[keys[j]]);
      if (m !== null) return { key: keys[j], value: m };
    }
  }
  return null;
}

// Keys whose values differ across cards (for the compare "differences" toggle).
export function diffKeys(maps) {
  var lists = (maps || []).map(function (m) {
    return m || {};
  });
  if (lists.length < 2) return [];
  var all = {};
  for (var m of lists) for (var k of Object.keys(m)) all[k] = true;
  var out = [];
  for (var key of Object.keys(all)) {
    var first = lists[0][key] === undefined ? null : String(lists[0][key]);
    var differs = false;
    for (var i = 1; i < lists.length; i++) {
      var v = lists[i][key] === undefined ? null : String(lists[i][key]);
      if (v !== first) {
        differs = true;
        break;
      }
    }
    if (differs) out.push(key);
  }
  out.sort();
  return out;
}

export function exportJsonText(card) {
  var map = (card && card.fullMap) || {};
  var ordered = {};
  for (var k of Object.keys(map).sort()) ordered[k] = map[k];
  return JSON.stringify(
    {
      file: card ? card.name : "",
      camera: card ? card.model : "",
      shutter: card ? card.shutter : null,
      source: card ? card.source : "",
      experimental: Boolean(card && card.experimental),
      fileNumber: Boolean(card && card.fileNumber),
      note: card ? card.note || "" : "",
      parseStatus: card ? card.parseStatus || "" : "",
      engine: card ? card.engine : "",
      tags: ordered,
    },
    null,
    2
  );
}

export function formatCount(n) {
  if (n === null || n === undefined) return "—";
  return Number(n).toLocaleString("en-US");
}
