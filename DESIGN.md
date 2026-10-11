# RF EXIF design

RF EXIF is a free, independent camera and lens inspector focused on Canon EOS R
photographers. Photos are processed locally in the browser. This design applies
to the web app; the Rust desktop interface is separate.

## Visual direction

Bold editorial neo-brutalism: oversized newspaper-style headlines, solid color
panels, expressive typography, and playful ink illustrations. Use thin structural
lines where needed rather than thick borders or heavy offset shadows everywhere.

- Paper: `#f7f1e3`; ink: `#11110f`.
- Panels: pink `#ff98d0`, orange `#ff7829`, mint `#a9e5ce`, lavender `#a7b5fb`.
- Google Fonts, bundled locally: Anton for display lettering, Space Grotesk for
  body text, Space Mono for labels and technical values.
- Logo: lettering only, outlined Anton SVG; compact and aligned with the left
  edge of the main content. Use the RF favicon for small square placements.

## Layout and interaction

No sidebar or sticky navigation. Keep the small brand header, the “Small file.
Big story.” headline, and the camera doodle visible across views. Align scorecards
on a consistent responsive grid with clear label/value hierarchy.

Start with one original photo. After upload, expose Overview and Metadata plus
the + Compare action, which asks for one additional photo. Keep metadata searchable
and offer grouped and raw views. Missing fields and unavailable counters must
remain explicit rather than suggesting invented values.

Use Motion for subtle, interruptible transform/opacity feedback. The persistent
hero scales to 90% in Metadata and Comparison over 240 ms with an ease-out curve.
Keyboard navigation and reduced-motion preferences switch instantly.

## Assets and catalog

Production assets live in `web/static/art/`, logos in `web/static/brand/`, and
font files and licenses in `web/static/fonts/`. Generated equipment artwork is
illustrative, not a source of product specifications. Match exact model labels
or reviewed aliases; never infer lens identity from focal length alone.

The public catalog has a compact `web/static/catalog/index.json` and detailed
records grouped by equipment type, manufacturer, and physical mount. RF-S is
APS-C coverage on the Canon RF mount. Unknown specifications remain null.
Manufacturer research snapshots in `web/lenses/sources/` are inventory build
inputs. Asset manifests retain generation provenance and source credits.

Working mockups, discarded artwork, and verification screenshots belong outside
the repository. This file records the design decisions; avoid committing a new
design artifact folder. Keep production assets and reproducible build inputs.
