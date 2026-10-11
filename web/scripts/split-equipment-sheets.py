#!/usr/bin/env python3
"""Split the reviewed equipment sheets into named, transparent PNG cutouts.

Requires Pillow: python -m pip install Pillow
Run from anywhere: python web/scripts/split-equipment-sheets.py
"""
import argparse
import hashlib
import json
import re
from pathlib import Path

from PIL import Image

WEB = Path(__file__).resolve().parents[1]
SHEETS = WEB / "static/art/equipment"


def slug(label):
    return re.sub(r"[^a-z0-9.]+", "-", label.lower()).strip("-.")


def full_label(brand, label):
    return label if label.lower().startswith(brand.lower()) else f"{brand} {label}"


def boundaries(alpha, axis, strict=False, warnings=None, context=""):
    """Seek a clear gutter within 40% of a cell of each quarter line.

    Minor antialias pixels do not drive gap detection; crops retain RGBA pixels.
    If products touch, choose the least occupied seam and record the limitation.
    """
    width, height = alpha.size
    length = width if axis == "x" else height
    if strict:
        return [0, *(round(length * n / 4) for n in range(1, 4)), length]
    pixels = alpha.load()
    coverage = [
        sum(pixels[i, j] > 32 for j in range(height)) if axis == "x"
        else sum(pixels[j, i] > 32 for j in range(width))
        for i in range(length)
    ]
    cuts = [0]
    radius = round(length / 10)
    for n in range(1, 4):
        target = round(length * n / 4)
        candidates = range(max(cuts[-1] + 1, target - radius), min(length, target + radius + 1))
        clear = [i for i in candidates if coverage[i] == 0]
        if not clear:
            seam = min(candidates, key=lambda i: (coverage[i], abs(i - target)))
            warning = f"{context}: touching artwork near {axis} quarter {n}; least-ink seam {seam} crosses {coverage[seam]} visible pixels"
            print(f"Warning: {warning}")
            if warnings is not None:
                warnings.append(warning)
            cuts.append(seam)
            continue
        # Select the clear run closest to the intended boundary, then its center.
        nearest = min(clear, key=lambda i: abs(i - target))
        left = right = nearest
        while left > target - radius and left > cuts[-1] + 1 and coverage[left - 1] == 0:
            left -= 1
        while right < target + radius and right < length - 1 and coverage[right + 1] == 0:
            right += 1
        cuts.append((left + right) // 2)
    return [*cuts, length]


def entries():
    generated = json.loads((WEB / "src/lib/generated-equipment.json").read_text(encoding="utf-8"))
    inventory = json.loads((WEB / "lenses/inventory.json").read_text(encoding="utf-8"))
    rows = []
    for i, label in enumerate(generated["camera"]):
        mount = "Canon EF" if label == "EOS-1D X Mark III" else "Canon RF"
        rows.append(dict(kind="camera", brand="Canon", make="Canon", model=label, label=label,
                         mount=mount, mountCode=slug(mount),
                         id=f"camera:canon:{slug(mount)}:{slug(label)}",
                         source="https://cam.start.canon/en/C001/manual/html/UG-09_Reference_0100.html" if mount == "Canon EF" else None,
                         aliases=[], metadataProvenance={"mount": "Canon product manual" if mount == "Canon EF" else "EOS R series"},
                         sheet="canon-cameras-4x4.png", index=i))
    rows.extend(dict(kind="lens", catalogVerifiedAt=inventory["verifiedAt"], **record) for record in inventory["records"])
    # The final sheet repeats twelve original Canon lenses to enforce grid spacing.
    # Export these too, but clearly mark them as duplicate illustrations.
    final = inventory["sheets"][-1]
    remaining = 16 - len(final["models"])
    for i in range(remaining):
        canonical = next(r for r in inventory["records"] if r["label"] == generated["lens"][i])
        rows.append({**canonical, "kind": "duplicate", "duplicateOf": canonical["id"],
                     "catalogVerifiedAt": inventory["verifiedAt"],
                     "sheet": final["file"], "index": len(final["models"]) + i})
    return rows


def split(output, strict_grid=False, padding=12):
    records = entries()
    by_sheet = {}
    for record in records:
        by_sheet.setdefault(record["sheet"], []).append(record)
    output = output.resolve()
    output.mkdir(parents=True, exist_ok=True)
    old_manifest_path = output / "manifest.json"
    previous = json.loads(old_manifest_path.read_text(encoding="utf-8")) if old_manifest_path.exists() else {"images": []}
    results, filenames, warnings = [], set(), []
    for filename, models in by_sheet.items():
        source_hash = hashlib.sha256((SHEETS / filename).read_bytes()).hexdigest()
        with Image.open(SHEETS / filename) as source:
            source = source.convert("RGBA")
            alpha = source.getchannel("A")
            xs = boundaries(alpha, "x", strict_grid, warnings, filename)
            # Each column has different lens heights. Find row gutters per column.
            ys = [boundaries(alpha.crop((xs[col], 0, xs[col + 1], source.height)), "y", strict_grid, warnings, f"{filename} column {col + 1}")
                  for col in range(4)]
            for record in sorted(models, key=lambda r: r["index"]):
                index = record["index"]
                row, col = divmod(index, 4)
                box = (xs[col], ys[col][row], xs[col + 1], ys[col][row + 1])
                tile = source.crop(box)
                bounds = tile.getchannel("A").getbbox()
                if not bounds:
                    raise ValueError(f"Empty cell {index} in {filename}")
                tile = tile.crop(bounds)
                side = max(tile.size) + padding * 2
                canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
                # Copy RGBA pixels directly: using an alpha mask would multiply alpha.
                canvas.paste(tile, ((side - tile.width) // 2, (side - tile.height) // 2))
                if not record.get("mount"):
                    raise ValueError(f"Missing mount for {record['label']}")
                name = slug(full_label(record["brand"], record["label"])) + "--" + slug(record["mount"]) + ".png"
                folder = "cameras" if record["kind"] == "camera" else "lenses"
                if record["kind"] == "duplicate":
                    folder = f"duplicates/{Path(filename).stem}"
                relative = Path(folder) / name
                if relative.as_posix() in filenames:
                    raise ValueError(f"Filename collision: {relative}")
                filenames.add(relative.as_posix())
                destination = output / relative
                destination.parent.mkdir(parents=True, exist_ok=True)
                canvas.save(destination, optimize=True)
                with Image.open(destination) as check:
                    assert check.mode == "RGBA" and check.size == canvas.size
                    assert check.getchannel("A").getextrema()[0] == 0
                results.append({**record,
                    "equipmentType": "camera" if record["kind"] == "camera" else "lens",
                    "catalogVerifiedAt": record.get("catalogVerifiedAt"),
                    "assetId": f"{Path(filename).stem}:{index}",
                    "file": relative.as_posix(), "sourceSheet": filename, "cell": index,
                    "row": row, "column": col, "sourceBounds": list(box),
                    "trimBounds": list(bounds), "width": side, "height": side,
                    "artwork": {
                        "type": "ai-generated-illustration", "generator": "ImageGen",
                        "accuracy": "illustrative-not-product-accurate",
                        "prompts": "../generation-prompts.json" if filename.startswith("rf-lenses-") else "../README.md",
                        "format": "PNG", "colorMode": "RGBA", "transparent": True,
                        "sha256": hashlib.sha256(destination.read_bytes()).hexdigest(),
                        "sourceSha256": source_hash,
                        "bytes": destination.stat().st_size,
                    },
                })
        print(f"{filename}: {len(models)} named cutouts")
    for record in results:
        record["artwork"]["cropWarnings"] = [w for w in warnings if w.startswith(record["sourceSheet"])]
    manifest = dict(schemaVersion=2, catalogSource="web/lenses/inventory.json",
                    notes="All current lens entries use Canon RF mount. RF-S is a lens series with APS-C coverage, not a separate physical mount. Camera bodies include an EF-mount EOS-1D X Mark III. Null specifications mean unresearched, not absent. Label-derived values are not independently measured specifications.",
                    grid="4x4 row-major", method="equal grid" if strict_grid else "transparent gutters",
                    padding=padding, count=len(results), warnings=warnings, images=results)
    (output / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    # Remove only superseded PNG names explicitly owned by the previous manifest.
    # Never enumerate or recursively delete arbitrary files in the output directory.
    for record in previous["images"]:
        if record["file"] in filenames:
            continue
        old = (output / record["file"]).resolve()
        if not old.is_relative_to(output) or old.suffix.lower() != ".png":
            raise ValueError(f"Unsafe previous output path: {record['file']}")
        if old.is_file():
            old.unlink()
    unique = sum(record["kind"] != "duplicate" for record in results)
    print(f"Saved {len(results)} PNGs ({unique} unique models) to {output}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=SHEETS / "individual")
    parser.add_argument("--strict-grid", action="store_true", help="Use exact quarter cuts instead of transparent gutters")
    parser.add_argument("--padding", type=int, default=12, help="Transparent padding around each square cutout")
    args = parser.parse_args()
    if args.padding < 0:
        parser.error("--padding must be nonnegative")
    split(args.output, args.strict_grid, args.padding)
