# Native RF lens illustration inventory

`inventory.json` records the models verified on 2026-10-11, source URLs, focus type, historical status where known, and each illustration's sheet/cell. It includes autofocus, manual-focus, special-purpose and selected cine lenses.

This is a **verified lower bound**, not a claim to include every RF lens ever made. Canon's 49-model RF Lens World list is supplemented with five official product announcements/pages. Smaller brands, Laowa's wider catalog, AstrHori, Lensbaby and Meike still need further mount-specific verification. Canon's separate cinema catalog is not yet fully inventoried. Listings do not imply current availability or compatibility with every camera.

Count one optical model per generation. Exclude kits, filters, extenders, adapters, colors and duplicate regional listings. Samyang/Rokinon rebrands share one entry. Models that require an EF/PL/Leica M adapter are excluded. SIRUI Vision Prime entries support an interchangeable RF bayonet.

The initial collection had 16 Canon lens illustrations. The expanded inventory has 196 models across 12 brands and 180 new illustration assignments. Brand totals: Canon 54, Sigma 11, Tamron 2, Viltrox 1, Samyang 5, Yongnuo 8, TTArtisan 24, 7Artisans 35, Brightin Star 19, SIRUI 27, Mitakon 8, Laowa 2.

Art is generated, illustrative and not a product photograph or a guarantee of precise physical shape. It never establishes lens identity. The web inspector only displays an illustration when an explicit LensModel matches a catalog label or reviewed alias. Manual lenses often do not write LensModel; those images keep the generic icon rather than guessing from focal length.

`../scripts/build-lens-inventory.js` rebuilds the inventory and row-major prompt sets from the reviewed source snapshots in `sources/`. These manufacturer snapshots are build inputs, not UI design artifacts. Keep the manifest stable once images are generated: changing model order changes sprite assignments. New models should use new sheets rather than shifting existing cells.

## Inventory metadata

Schema version 2 retains mount-specific stable IDs, make/brand, canonical model, mount/series/coverage, focus type, aliases, catalog status and sources. Focal lengths, maximum apertures and categories are label-derived and record that provenance. Unresearched detailed specifications are explicit `null` values. RF-S coverage is separate from the physical Canon RF mount. The cutout manifest copies the complete catalog record and adds image hashes, dimensions, crop bounds and generation details.

For future researched facts, add overrides to `web/lenses/overrides.json` keyed by the exact catalog label. For example, an entry can provide `specifications` and `metadataProvenance` with the supporting URL. These overrides survive catalog rebuilds. Rebuild with `node scripts/build-lens-inventory.js` from `web/`, then run the splitting script to refresh the individual manifest. Do not derive product specifications from generated illustrations.

## Folder-based artwork fallback

Camera artwork can also live beside its counter manifest in `web/cameras/<camera>/`; independent lens artwork lives in `web/lenses/<lens>/`. Each folder has an `art.json` label, exact EXIF aliases and attribution. A local `product.png` or `product.jpg` enables the fallback. Licensed source images must retain their original source, credit and license files. Generated sprites take priority over these examples.

The existing Canon EOS R10 and RF-S18–45mm Wikimedia Commons examples remain bundled with attribution. Their grayscale/contrast treatment is applied by CSS. Unrecognized models and missing artwork keep the neutral icon. No remote product image requests occur, and focal ranges alone must never identify a specific lens.
