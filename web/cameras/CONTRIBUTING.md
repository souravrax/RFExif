# Adding your camera to ShutterDrop

Cameras are **declarative plugins**: one folder per body in `web/cameras/`,
auto-discovered by both apps. The site is a static SvelteKit build — no
server, no auth, everything runs locally in the browser. By contributing you
agree to license your work under Apache-2.0 (see `/LICENSE`).

## 1. Copy the template

```
cp -r web/cameras/_template web/cameras/nikon-z6
```

A camera folder holds:

| File | Purpose |
|---|---|
| `camera.toml` | the whole camera: id/label/models/rated_life + `[[strategy]]` list |
| `vectors.json` | `[{file, expected}]` proof (or `{exif, expected}` synthetic) |
| `README.md` | where the counter lives, what it counts, evidence, USB status |
| `web.js` / `rust.rs` | **only if** declarative strategies can't express it (escape hatch) |

Strategies (`blob-scan`, `exif-tag`, `filename`) run in manifest order;
first hit wins. `cameras/_shared/` holds the reusable bits: manifest
parser/validator, strategy interpreter, model sniffer, base-EXIF reader.

## 2. Prove it with vectors

Minimum bar (what `canon-r10` did): **3+ consecutive original files** showing
`+1` per shot, e.g. `22146 → 22147 → 22148`, ideally across shutter modes
(mechanical + electronic) and across CR3 + JPG of the same shot.

Add rows to your `vectors.json` and run from `web/`:

```sh
cd web && npm run validate && npm test   # needs $SHUTTERDROP_SAMPLES
```

Mark the strategy `experimental = true` until someone confirms the offset
against a USB reading (DIRE ShutterCount / EOSMSG / gphoto2). Flip to
`false` with the USB value in your PR description. Desktop parity is free:
`cargo test` runs the same `vectors.json` (same env var).

## 3. Register (nothing to do)

Discovery is automatic: the web app globs `cameras/*/camera.toml`, the
desktop build code-generates from the same files. Specific cameras (with
`models`) always sort before the model-less generic fallback. Then:

```sh
cd web && npm run matrix   # regen cameras/README.md support table
npm run build              # SvelteKit static export still compiles
```

## 4. Open a PR

Include: body + firmware tested, vector table, USB-confirmed or not, and —
for custom `web.js`/`rust.rs` — why declarative strategies weren't enough.
CI runs `validate`, `matrix --check`, both vector harnesses.

## Engines (why web and desktop can differ)

- **Desktop**: bundled native ExifTool **13.59** — full MakerNotes, always.
- **Web instant path**: mini-EXIF + byte scans (zero deps, milliseconds).
- **Web enrichment**: lazy ExifTool-WASM **13.42** (`@uswriting/exiftool`
  1.0.9, self-hosted `wasm/zeroperl.wasm`) — full MakerNotes after first
  drop, ~1–2s. A native (non-experimental) count outranks an experimental
  fast-path hit; file-number results are never "upgraded".

Tag output can drift between ExifTool versions, so vectors record counts,
never raw engine output. Committed tests stay on the fast path: the WASM
package's Node entry is broken on Windows upstream (hardcoded CI path +
bad drive-letter handling), while its browser entry — the one we ship —
is verified working.
