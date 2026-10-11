// RF EXIF camera contract check — `node cameras/validate.js` (CI).
// Every cameras/<id>/ must hold camera.toml + README.md + vectors.json,
// ids unique + kebab-case, strategies well-formed, vectors non-empty.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseToml } from "./_shared/toml.js";
import { loadManifest } from "./_shared/manifest.js";

const CAMS = path.join(path.dirname(fileURLToPath(import.meta.url)));
const errors = [];
const seen = new Set();

for (const dir of fs.readdirSync(CAMS)) {
  const full = path.join(CAMS, dir);
  if (!fs.statSync(full).isDirectory() || dir.startsWith("_")) continue;
  for (const f of ["camera.toml", "README.md", "vectors.json"]) {
    if (!fs.existsSync(path.join(full, f))) errors.push(`${dir}: missing ${f}`);
  }
  const tomlPath = path.join(full, "camera.toml");
  if (!fs.existsSync(tomlPath)) continue;
  let m;
  try {
    m = loadManifest(fs.readFileSync(tomlPath, "utf8"), dir);
  } catch (e) { errors.push(`${dir}: ${e.message}`); continue; }
  if (seen.has(m.camera.id)) errors.push(`${dir}: duplicate id ${m.camera.id}`);
  seen.add(m.camera.id);
  if (m.camera.id !== dir) errors.push(`${dir}: id "${m.camera.id}" must equal folder name`);
  let vec;
  try { vec = JSON.parse(fs.readFileSync(path.join(full, "vectors.json"), "utf8")); }
  catch (e) { errors.push(`${dir}: vectors.json unparsable`); continue; }
  if (!Array.isArray(vec) || !vec.length) errors.push(`${dir}: vectors.json empty`);
  // regexes must compile
  for (const p of m.camera.models || []) {
    try { new RegExp(p, "i"); } catch (e) { errors.push(`${dir}: bad model regex ${p}`); }
  }
}

if (errors.length) {
  console.log("CONTRACT FAIL:\n- " + errors.join("\n- "));
  process.exit(1);
}
console.log(`contract OK (${seen.size} cameras: ${[...seen].join(", ")})`);
