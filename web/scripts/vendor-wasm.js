// Vendors zeroperl.wasm from @6over3/zeroperl-ts into web/static/wasm/.
// Runs via npm predev/prebuild. Keeps the 25MB binary out of git while the
// shipped site stays fully self-hosted (no CDN). Pinned by package-lock.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const candidates = [
  // npm flat layout: web/node_modules/...
  path.join(here, "..", "node_modules", "@6over3", "zeroperl-ts", "dist", "esm", "zeroperl.wasm"),
  // cjs twin as fallback
  path.join(here, "..", "node_modules", "@6over3", "zeroperl-ts", "dist", "cjs", "zeroperl.wasm"),
];
const src = candidates.find((p) => fs.existsSync(p));
if (!src) {
  console.error("vendor-wasm: zeroperl.wasm not found under node_modules/@6over3/zeroperl-ts — run npm install");
  process.exit(1);
}
const dir = new URL("../static/wasm/", import.meta.url);
fs.mkdirSync(dir, { recursive: true });
fs.copyFileSync(src, new URL("zeroperl.wasm", dir + "/"));
const mb = (fs.statSync(new URL("zeroperl.wasm", dir + "/")).size / 1048576).toFixed(1);
console.log(`vendored zeroperl.wasm (${mb} MB) -> static/wasm/`);
