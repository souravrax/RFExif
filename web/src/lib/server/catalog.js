import fs from 'node:fs';
import path from 'node:path';

export function loadEquipment(type) {
  const root = path.resolve('static/catalog');
  const index = JSON.parse(fs.readFileSync(path.join(root, 'index.json'), 'utf8'));
  // The R-system directory excludes the EF DSLR in our illustration collection.
  const entries = index.entries.filter(entry => entry.type === type && entry.mount === 'Canon RF');
  return { type, verifiedAt: index.verifiedAt, entries: entries.map(entry => {
    const detail = JSON.parse(fs.readFileSync(path.join(root, entry.detail), 'utf8'));
    return { ...entry, focus: detail.focus ?? null, status: detail.status ?? null,
      sensorFormat: detail.sensorFormat ?? null, focalLength: detail.focalLength ?? null,
      maximumAperture: detail.maximumAperture ?? null, categories: detail.categories ?? [],
      source: detail.source ?? null };
  }) };
}
