// Multi-camera registry over camera.toml manifests (ESM, browser + Node).
import { loadManifest, interpret } from "./manifest.js";

// CR3/RAW files expose no base-EXIF Model to the web parser, but the model
// string sits as plain ASCII in the file header (Canon CMT boxes).
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

function compileModels(patterns) {
  return (patterns || []).map(function (p) { return new RegExp(p, "i"); });
}

// manifests: [{ id(dir), camera, strategies }] as produced by loadManifest.
// Specific cameras (with models) sort before the model-less generic fallback.
export function createRegistry(manifests) {
  var cams = manifests.map(function (m) {
    return { camera: m.camera, strategies: m.strategies, rx: compileModels(m.camera.models) };
  });
  cams.sort(function (a, b) {
    return (b.rx.length ? 1 : 0) - (a.rx.length ? 1 : 0) || (a.camera.id < b.camera.id ? -1 : 1);
  });

  function read(ctx, platform) {
    var exif = ctx.exif || {};
    if (!exif.Model && ctx.bytes) {
      var sniffed = sniffModel(ctx.bytes);
      if (sniffed) {
        exif = { Model: sniffed };
        for (var k in ctx.exif) exif[k] = ctx.exif[k];
      }
    }
    for (var i = 0; i < cams.length; i++) {
      var cam = cams[i];
      if (cam.rx.length) {
        var hay = (exif.Model || "") + " " + (ctx.fileName || "");
        var ok = false;
        for (var j = 0; j < cam.rx.length; j++) {
          if (cam.rx[j].test(hay)) { ok = true; break; }
        }
        if (!ok) continue;
      }
      var hit = interpret({ camera: cam.camera, strategies: cam.strategies }, ctx, platform, ctx.custom);
      if (hit) return { camera: cam.camera, result: hit };
    }
    return null;
  }

  function list() {
    return cams.map(function (c) { return c.camera; });
  }

  return { read: read, list: list };
}
