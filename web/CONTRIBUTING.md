# Adding your camera to ShutterDrop

Cameras are plugins: one ESM file per body in `web/src/lib/cameras/`,
auto-tried in order by the registry. The site is a static SvelteKit build —
no server, no auth, everything runs locally in the browser. By contributing
you agree to license your work under Apache-2.0 (see `/LICENSE`).

## 1. Copy the template

```
cp web/src/lib/cameras/_template.js web/src/lib/cameras/nikon-z6.js
```

`_template.js` is documentation — it is never loaded. Fill in:

| Field | Meaning |
|---|---|
| `id` | unique kebab-case, e.g. `nikon-z6` |
| `label` | display name for the result card |
| `models` | regexes tested against `EXIF Model + filename` — be specific (`/\bZ 6\b/` not `/Z6/`) |
| `ratedLife` | shutter rating for the % bar, `0` if unknown |
| `needs` | `["bytes"]`, `["exif"]`, or both |
| `read(ctx)` | return `{ value, source, experimental, note }` or `null`. **Never throw.** |

`ctx` = `{ bytes: Uint8Array, exif: {Model, DateTime, ISO, …}, fileName }`.
`src/lib/exif/r10.js` has reusable byte helpers; the registry auto-sniffs
the model string from RAW headers (`sniffModel()`) for files with no
parsable base EXIF.

## 2. Prove it with vectors

Minimum bar (what `canon-r10` did): **3+ consecutive original files** showing
`+1` per shot, e.g. `22146 → 22147 → 22148`, ideally across shutter modes
(mechanical + electronic) and across CR3 + JPG of the same shot.

Add them to `web/test/run.js` VECTORS as `[filename, expected, id]` and run
from `web/`:

```sh
cd web && npm test          # needs $SHUTTERDROP_SAMPLES pointing at your files
```

Mark `experimental: true` until someone confirms the offset against a USB
reading (DIRE ShutterCount / EOSMSG / gphoto2). Flip to `false` with the
USB value in your PR description.

## 3. Register load order

- `web/src/lib/cameras/index.js`: import your file **after** the specific
  extractors it must lose to, **before** `exif-shutter.js`
  (generic fallback always last).
- Registry tries in order; first non-null hit wins. Rebuild + retest:
  `npm run build && npm test`.

## 4. Open a PR

Include: body + firmware tested, vector table, and whether USB-confirmed.
