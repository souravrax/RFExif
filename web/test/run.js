// RF EXIF extractor tests — `npm test` (runs `node test/run.js`).
// Manifest-driven: every web/cameras/*/camera.toml + vectors.json.
// Real sample files come from $SHUTTERDROP_SAMPLES (never vendored);
// entries may instead carry inline "exif" for synthetic cases.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadManifest } from "../cameras/_shared/manifest.js";
import { createRegistry } from "../cameras/_shared/registry.js";
import { readJpegExif } from "../cameras/_shared/exif.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const CAMS = path.join(here, "..", "cameras");
const SAMPLES = process.env.SHUTTERDROP_SAMPLES || path.join(here, "..", "samples");

function loadAll() {
  const manifests = [];
  for (const dir of fs.readdirSync(CAMS).sort()) {
    if (dir.startsWith("_")) continue;
    const tomlPath = path.join(CAMS, dir, "camera.toml");
    if (!fs.existsSync(tomlPath)) continue;
    manifests.push(loadManifest(fs.readFileSync(tomlPath, "utf8"), dir));
  }
  return createRegistry(manifests);
}

const registry = loadAll();
let pass = 0, fail = 0, skip = 0;

for (const cam of registry.list()) {
  const vecPath = path.join(CAMS, cam.id, "vectors.json");
  if (!fs.existsSync(vecPath)) { console.log(`WARN ${cam.id}: no vectors.json`); continue; }
  const vectors = JSON.parse(fs.readFileSync(vecPath, "utf8"));
  for (const v of vectors) {
    let bytes = new Uint8Array(0), exif = v.exif || {}, fileName = v.file || "synthetic";
    if (v.file && !v.exif) {
      const p = path.join(SAMPLES, v.file);
      if (!fs.existsSync(p)) { skip++; continue; }
      bytes = new Uint8Array(fs.readFileSync(p));
      if (/\.jpe?g$/i.test(v.file)) exif = readJpegExif(bytes);
    }
    const hit = registry.read({ bytes, exif, fileName }, "web");
    if (!hit) { fail++; console.log(`FAIL ${cam.id} ${fileName}: no hit`); continue; }
    if (hit.camera.id !== cam.id || hit.result.value !== v.expected) {
      fail++;
      console.log(`FAIL ${cam.id} ${fileName}: got ${hit.camera.id}=${hit.result && hit.result.value}, want ${v.expected}`);
    } else pass++;
  }
}

// Guard the shared EXIF parser itself (card rows depend on it).
{
  const p = path.join(SAMPLES, "IMG_4154.JPG");
  if (fs.existsSync(p)) {
    const e = readJpegExif(new Uint8Array(fs.readFileSync(p)));
    const ok = e.Model === "Canon EOS R10" && e.ISO === "6400" && e.DateTime === "2026-10-11 00:35:08";
    ok ? pass++ : (fail++, console.log("FAIL exif parse: " + JSON.stringify(e)));
  } else skip++;
}

console.log(`\n${pass} passed, ${fail} failed, ${skip} skipped (missing samples)`);
process.exit(fail ? 1 : 0);
