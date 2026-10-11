// Regenerate the support matrix in web/cameras/README.md from manifests.
// `node cameras/matrix.js` writes it; `--check` exits 1 if stale (CI).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseToml } from "./_shared/toml.js";
import { loadManifest } from "./_shared/manifest.js";

const CAMS = path.join(path.dirname(fileURLToPath(import.meta.url)));
const README = path.join(CAMS, "README.md");
const checkOnly = process.argv.includes("--check");

function rows() {
  const out = [];
  for (const dir of fs.readdirSync(CAMS).sort()) {
    const tomlPath = path.join(CAMS, dir, "camera.toml");
    if (dir.startsWith("_") || !fs.existsSync(tomlPath)) continue;
    const m = loadManifest(fs.readFileSync(tomlPath, "utf8"), dir);
    const kinds = m.strategies.map((s) => s.kind).join(" + ");
    const plats = [...new Set(m.strategies.flatMap((s) => s.platforms))].join(", ") || "—";
    const exp = m.strategies.every((s) => !s.experimental) ? "yes" : "experimental";
    out.push(`| ${m.camera.label} | \`${m.camera.id}\` | ${kinds} | ${plats} | ${exp} | ${m.camera.ratedLife || "—"} |`);
  }
  return out;
}

const table = [
  "# Supported cameras",
  "",
  "Generated from manifests — do not edit by hand (`node cameras/matrix.js`).",
  "Add a body: copy `cameras/_template/`, see `cameras/CONTRIBUTING.md`.",
  "",
  "| Body | id | Strategies | Platforms | USB-confirmed | Rated |",
  "|---|---|---|---|---|---|",
  ...rows(),
  "",
].join("\n");

const cur = fs.existsSync(README) ? fs.readFileSync(README, "utf8") : "";
if (checkOnly) {
  if (cur !== table) { console.log("matrix stale — run: node cameras/matrix.js"); process.exit(1); }
  console.log("matrix fresh");
} else {
  fs.writeFileSync(README, table);
  console.log("matrix written (" + (rows().length) + " bodies)");
}
