# Individual equipment illustrations

Generated from the existing local sheets by `web/scripts/split-equipment-sheets.py`.

- `cameras/`: 16 Canon camera bodies.
- `lenses/`: 196 distinct RF/RF-S lenses, named by brand, model and explicit physical mount.
- `duplicates/`: 12 repeated Canon lens illustrations from the final sheet; not additional models.
- `manifest.json`: versioned inventory metadata plus filename, source sheet, zero-based cell, crop/trim bounds, dimensions, file hashes, byte size, generation provenance and source-layout warnings. It retains all fields from the lens catalog rather than discarding them during splitting.

Filename convention: `<brand-and-model>--<mount>.png`, for example `canon-rf-s-18-150mm-f3.5-6.3-is-stm--canon-rf.png` and `sigma-18-50mm-f2.8-dc-dn-contemporary--canon-rf.png`. All current lenses use **Canon RF** mount. **RF-S** is recorded separately as the lens series and APS-C coverage. The camera set includes an EF-mount EOS-1D X Mark III, whose filename ends in `--canon-ef.png`.

Each lens retains its stable mount-specific `id`, `make`, `brand`, canonical `model` and `label`, `mount`, `mountCode`, `series`, `sensorFormat`, focus type, catalog status, aliases, source URL and catalog verification date. Focal length and maximum aperture are parsed from labels with explicit provenance; f-numbers and T-stops remain distinct. Macro/tilt/shift/cine/anamorphic categories are label-derived. Unknown researched specifications are `null`, including weight, physical dimensions, filter size, focus distance, magnification, stabilization, weather sealing, blade count, optical design and release date. Null does not mean zero or absent.

Use `web/lenses/overrides.json`, keyed by canonical catalog label, for future source-backed specification updates; rebuild the catalog before splitting again. `duplicateOf` links repeated artwork to the same equipment ID, while `assetId` identifies each physical sheet cell separately.

Run from the repository root with Python and Pillow installed:

```powershell
python -m pip install Pillow
python web/scripts/split-equipment-sheets.py
```

In the current Codex workspace, the bundled Python already has Pillow:

```powershell
& 'C:\Users\soura\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' web/scripts/split-equipment-sheets.py
```

Optional arguments: `--output PATH`, `--padding 12`, and `--strict-grid`. The default finds transparent gutters near grid boundaries, trims transparent margins, and centers the unscaled artwork on a padded transparent square. Strict-grid mode cuts exact quarters and can slice unevenly placed products. PNG alpha is preserved. Original sheets are unchanged. Rerunning overwrites matching generated cutouts and the manifest and removes superseded PNG names listed in the previous manifest. It does not enumerate or delete unrelated files.

Four original boundaries contain touching artwork and have no fully clear seam. The default chooses the least occupied line, reports the crossing-pixel count, and records the issue in the manifest. These cuts can contain clipped edges or neighboring fragments; cropping cannot reconstruct overlapped source artwork. Model labels follow the reviewed sheet assignments; generated illustrations are not precise product photographs.

The web UI still uses its existing sprite sheets. These individually named assets are ready for direct use or export.
