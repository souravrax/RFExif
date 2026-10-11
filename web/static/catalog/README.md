# Public equipment catalog

Generated with `npm run catalog` from the web directory. The script also works
from any directory: `node web/scripts/build-equipment-catalog.js`.

`index.json` is the small discovery index. Details are grouped by equipment type,
manufacturer, and physical mount, for example:

`lenses/canon/canon-rf/rf-s-18-150mm-f3.5-6.3-is-stm.json`

RF-S describes APS-C coverage; its physical mount remains Canon RF.
Duplicate illustrations do not create duplicate equipment entries.
Unknown specifications remain null. Generated images are illustrative.

Fetch index.json first, then resolve each entry's `detail` relative to the index
URL. Resolve `image` relative to the site's static root (including its configured
base path, such as `/ShutterDrop/`). This supports same-origin hosting or a pinned
GitHub release on a CDN without embedding a hostname in the records.

Sources of truth remain `web/lenses/inventory.json` and the cutout manifest at
`web/static/art/equipment/individual/manifest.json`. Do not edit generated records.
After catalog metadata changes, rebuild the lens inventory, regenerate cutouts
using `scripts/split-equipment-sheets.py`, then run `npm run catalog`.
The full cutout manifest is retained for generation and audit; clients can use
the small index and individual details without downloading it.

No database is needed for this static catalog. Image bytes remain separate from
JSON metadata. Existing UI artwork lookup continues to use its current mapping.
