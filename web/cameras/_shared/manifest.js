// camera.toml interpreter (ESM, browser + Node).
// Turns a manifest into executable strategies. Custom-code escape hatch:
// a folder may also ship web.js default-exporting extra strategy objects
// { kind: "custom", read(ctx) } — appended after manifest strategies.
import { parseToml } from "./toml.js";
import { findMagic, readInt, parseHex } from "./blob.js";

var FORMATS = { u16le: 1, u32le: 1, u16be: 1, u32be: 1 };
var KINDS = { "blob-scan": 1, "exif-tag": 1, filename: 1 };

// Parse + validate. Returns { camera, strategies } or throws with reason.
export function loadManifest(text, dirName) {
  var doc = parseToml(text);
  var c = doc.camera || {};
  var id = c.id || dirName || "";
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) {
    throw new Error("camera.id must be kebab-case, got " + JSON.stringify(c.id));
  }
  if (!c.label) throw new Error("camera.label missing");
  var camera = {
    id: id,
    label: String(c.label),
    models: normStrArray(c.models, "models"),
    ratedLife: c.rated_life === undefined ? 0 : num(c.rated_life, "rated_life"),
    version: c.version === undefined ? 1 : num(c.version, "version"),
  };
  var raw = doc.strategy || [];
  if (!Array.isArray(raw) || !raw.length) throw new Error("need at least one [[strategy]]");
  var strategies = raw.map(function (s, i) { return normStrategy(s, i); });
  return { camera: camera, strategies: strategies };
}

function normStrArray(v, what) {
  if (v === undefined) return [];
  if (!Array.isArray(v)) throw new Error(what + " must be string array");
  return v.map(String);
}
function num(v, what) {
  if (typeof v !== "number" || isNaN(v)) throw new Error(what + " must be a number");
  return v;
}

function normStrategy(s, i) {
  var where = "strategy[" + i + "]";
  if (!KINDS[s.kind]) throw new Error(where + ": unknown kind " + JSON.stringify(s.kind));
  var st = {
    kind: s.kind,
    platforms: normStrArray(s.platforms, where + ".platforms"),
    experimental: s.experimental === undefined ? true : !!s.experimental,
    note: String(s.note || ""),
    source: String(s.source || (s.kind + "-" + i)),
  };
  if (st.kind === "blob-scan") {
    var magic = parseHex(s.magic || "");
    if (!magic) throw new Error(where + ": bad magic hex");
    st.magic = magic;
    st.offset = num(s.offset, where + ".offset");
    if (!FORMATS[s.format]) throw new Error(where + ": bad format");
    st.format = s.format;
  } else if (st.kind === "exif-tag") {
    if (!s.tag) throw new Error(where + ": tag missing");
    st.tag = String(s.tag);
  } else if (st.kind === "filename") {
    try { st.rx = new RegExp(String(s.pattern || "IMG_(\\d+)")); }
    catch (e) { throw new Error(where + ": bad pattern"); }
  }
  return st;
}

// Run strategies in manifest order for one platform ("web" | "desktop").
// ctx = { bytes:Uint8Array, exif:{Group:Tag->str...}, fileName }.
// Returns { value, source, experimental, note, fileNumber } | null.
export function interpret(manifest, ctx, platform, customStrategies) {
  var list = manifest.strategies.concat(customStrategies || []);
  for (var i = 0; i < list.length; i++) {
    var st = list[i];
    if (st.platforms && st.platforms.length && st.platforms.indexOf(platform) < 0) continue;
    var hit = runStrategy(st, ctx);
    if (hit) return hit;
  }
  return null;
}

function runStrategy(st, ctx) {
  try {
    if (st.kind === "custom") {
      return st.read ? st.read(ctx) : null;
    }
    if (st.kind === "blob-scan") {
      if (!ctx.bytes) return null;
      var at = findMagic(ctx.bytes, st.magic, st.offset + 4);
      if (at < 0) return null;
      var v = readInt(ctx.bytes, at + st.offset, st.format);
      if (v === null) return null;
      return base(st, v, false);
    }
    if (st.kind === "exif-tag") {
      var raw = ctx.exif ? (ctx.exif[st.tag] !== undefined ? ctx.exif[st.tag] : ctx.exif[shortTag(st.tag)]) : undefined;
      var n = parseInt(raw, 10);
      if (isNaN(n) || n < 0) return null;
      return base(st, n >>> 0, false);
    }
    if (st.kind === "filename") {
      var m = String(ctx.fileName || "").match(st.rx);
      if (!m) return null;
      return base(st, parseInt(m[1], 10), true);
    }
  } catch (e) { return null; }
  return null;
}

function shortTag(t) {
  var i = String(t).indexOf(":");
  return i < 0 ? t : String(t).slice(i + 1);
}

function base(st, value, fileNumber) {
  return {
    value: value >>> 0,
    source: st.source,
    experimental: !!st.experimental,
    note: st.note,
    fileNumber: !!fileNumber,
  };
}
