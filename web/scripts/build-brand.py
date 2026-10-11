"""Build portable, font-independent RF EXIF wordmarks from bundled Google font Anton."""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen

web = Path(__file__).resolve().parents[1]
output = web / 'static' / 'brand'
output.mkdir(parents=True, exist_ok=True)
font = TTFont(web / 'static/fonts/anton-0.ttf')
glyphs = font.getGlyphSet()
cmap = font.getBestCmap()

def lettering(text, fill):
    position = 0
    paths = []
    bounds = []
    for character in text:
        glyph = glyphs[cmap[ord(character)]]
        pen = SVGPathPen(glyphs)
        glyph.draw(pen)
        box = BoundsPen(glyphs)
        glyph.draw(box)
        if box.bounds:
            x0, y0, x1, y1 = box.bounds
            bounds.append((position + x0, y0, position + x1, y1))
        paths.append(f'<path transform="translate({position} 0)" d="{pen.getCommands()}"/>')
        position += glyph.width - 28
    left = min(b[0] for b in bounds)
    right = max(b[2] for b in bounds)
    bottom = min(b[1] for b in bounds)
    top = max(b[3] for b in bounds)
    width, height = right - left, top - bottom
    return width, height, f'<g fill="{fill}" transform="translate({-left} {top}) scale(1 -1)">{"".join(paths)}</g>'

for name, color in [('wordmark', '#111111'), ('wordmark-light', '#ffe0c9')]:
    width, height, content = lettering('RF EXIF', color)
    (output / f'{name}.svg').write_text(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" role="img" aria-labelledby="title"><title id="title">RF EXIF</title>{content}</svg>\n')
width, height, content = lettering('RF', '#111111')
scale = min(48 / width, 48 / height)
x, y = (64 - width * scale) / 2, (64 - height * scale) / 2
(output / 'favicon.svg').write_text(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><title>RF EXIF</title><rect width="64" height="64" rx="12" fill="#ff98d0"/><g transform="translate({x} {y}) scale({scale})">{content}</g></svg>\n')
print('Built RF EXIF outlined wordmarks and RF favicon')
