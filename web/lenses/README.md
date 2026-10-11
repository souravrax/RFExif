# Equipment artwork

Camera art lives alongside its existing manifest in `web/cameras/<camera>/`.
Lens art lives in `web/lenses/<lens>/` and is independent of shutter-counter support.

Each folder contains `art.json` with a label, exact EXIF model aliases, and image attribution in `credit`. Add a licensed transparent cutout named `product.png` (or `product.jpg`) to enable its illustration. Keep the complete product visible with modest transparent margins. Record the original source and permission/license in this folder before adding an image.

The web loader bundles local PNGs and applies a grayscale/contrast print treatment through CSS. No remote image requests occur. Unrecognized models and catalogs without a PNG use the existing neutral icon. Do not add broad substring aliases: focal ranges alone cannot identify a specific lens. Match aliases against actual EXIF LensModel values.

Starter catalogs include Canon EOS R10 and Canon RF-S 18–45mm. Wikimedia Commons JPEG examples are bundled for both starter models, with attribution and license files; generated equipment illustrations should be labelled illustrative and must not stand in for an accurate product photograph.
