import generated from './generated-equipment.json';
import lenses from './generated-lenses.json';
import { normalizeEquipment as normalize, findLensIllustration } from './equipment-match.js';
import { base } from '$app/paths';
// Exact aliases keep similar camera bodies and lens variants distinct.
const cameraCatalogs = import.meta.glob('../../cameras/*/art.json', { eager: true, import: 'default' });
const lensCatalogs = import.meta.glob('../../lenses/*/art.json', { eager: true, import: 'default' });
const images = import.meta.glob(['../../cameras/*/product.{png,jpg}', '../../lenses/*/product.{png,jpg}'], {
  eager: true, query: '?url', import: 'default',
});

export function equipmentArt(kind, model) {
  if (!model) return null;
  if (kind === 'lens') {
    const record = findLensIllustration(lenses, model);
    if (record) return {
      image: `${base}/art/equipment/${record.sheet}`, label: record.label, sprite: true,
      position: `${(record.index % 4) * 100 / 3}% ${Math.floor(record.index / 4) * 100 / 3}%`,
    };
  }
  const catalogs = kind === 'camera' ? cameraCatalogs : lensCatalogs;
  let index = (generated[kind] || []).findIndex(label => normalize(label) === normalize(model));
  if (index < 0) {
    for (const catalog of Object.values(catalogs)) {
      if (catalog.aliases?.some(alias => normalize(alias) === normalize(model))) {
        index = (generated[kind] || []).findIndex(label => normalize(label) === normalize(catalog.label));
        break;
      }
    }
  }
  if (index >= 0) return {
    image: `${base}/art/equipment/canon-${kind === 'camera' ? 'cameras' : 'lenses'}-4x4.png`,
    label: generated[kind][index], sprite: true,
    position: `${(index % 4) * 100 / 3}% ${Math.floor(index / 4) * 100 / 3}%`,
  };
  for (const [path, catalog] of Object.entries(catalogs)) {
    if (!catalog.aliases?.some(alias => normalize(alias) === normalize(model))) continue;
    const image = images[path.replace(/art\.json$/, 'product.png')] || images[path.replace(/art\.json$/, 'product.jpg')];
    return image ? { image, label: catalog.label, credit: catalog.credit || '', source: catalog.source, license: catalog.license, licenseUrl: catalog.licenseUrl } : null;
  }
  return null;
}
