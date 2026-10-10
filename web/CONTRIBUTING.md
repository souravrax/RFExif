# Adding your camera to ShutterDrop

Cameras are plugins: one file per body in `web/cameras/`, auto-tried in order
by `registry.js`. No build step, no backend changes. By contributing you agree
to license your work under Apache-2.0 (see `/LICENSE`).

## 1. Copy the template

```
cp web/cameras/_template.js web/cameras/nikon-z6.js
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
`web/r10.js` has reusable byte helpers; `registry.js` exposes
`sniffModel()` behavior automatically for RAW files with no base EXIF.

## 2. Prove it with vectors

Minimum bar (what `canon-r10` did): **3+ consecutive original files** showing
`+1` per shot, e.g. `22146 → 22147 → 22148`, ideally across shutter modes
(mechanical + electronic) and across CR3 + JPG of the same shot.

Add them to `web/test/run.js` VECTORS as `[id, filename, expected]` and run:

```sh
node web/test/run.js          # needs $SHUTTERDROP_SAMPLES pointing at your files
```

Mark `experimental: true` until someone confirms the offset against a USB
reading (DIRE ShutterCount / EOSMSG / gphoto2). Flip to `false` with the
USB value in your PR description.

## 3. Register load order

- `web/index.html`: add your `<script>` **after** the specific extractors it
  must lose to, **before** `exif-shutter.js` (generic fallback always last).
- Registry tries in order; first non-null hit wins.

## 4. Open a PR

Include: body + firmware tested, vector table, and whether USB-confirmed.
