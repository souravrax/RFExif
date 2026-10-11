// Exact aliases keep similar camera bodies and lens variants distinct.
const cameraCatalogs = import.meta.glob('../../cameras/*/art.json', { eager: true, import: 'default' });
const lensCatalogs = import.meta.glob('../../lenses/*/art.json', { eager: true, import: 'default' });
const images = import.meta.glob(['../../cameras/*/product.{png,jpg}', '../../lenses/*/product.{png,jpg}'], {
  eager: true, query: '?url', import: 'default',
});

function normalize(value) {
  return String(value || '').toLowerCase().replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim();
}

export function equipmentArt(kind, model) {
  const catalogs = kind === 'camera' ? cameraCatalogs : lensCatalogs;
  for (const [path, catalog] of Object.entries(catalogs)) {
    if (!catalog.aliases?.some(alias => normalize(alias) === normalize(model))) continue;
    const image = images[path.replace(/art\.json$/, 'product.png')] || images[path.replace(/art\.json$/, 'product.jpg')];
    return image ? { image, label: catalog.label, credit: catalog.credit || '', source: catalog.source, license: catalog.license, licenseUrl: catalog.licenseUrl } : null;
  }
  return null;
}
