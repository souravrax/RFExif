import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { equipmentSlug } from '../lenses/metadata.js';

const web = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(web, 'static/catalog');
const inventory = JSON.parse(fs.readFileSync(path.join(web, 'lenses/inventory.json')));
const manifest = JSON.parse(fs.readFileSync(path.join(web, 'static/art/equipment/individual/manifest.json')));
const images = manifest.images.filter(image => image.kind !== 'duplicate');
const artwork = new Map(images.map(image => [image.id, image]));
const records = [
  ...images.filter(image => image.kind === 'camera'),
  ...inventory.records.map(record => ({ ...record, equipmentType: 'lens' })),
];
const entries = [];
const ids = new Set();
for (const record of records) {
  if (ids.has(record.id)) throw new Error(`Duplicate equipment ID: ${record.id}`);
  ids.add(record.id);
  const type = record.equipmentType;
  const relative = `${type}s/${equipmentSlug(record.make)}/${record.mountCode}/${equipmentSlug(record.model)}.json`;
  const image = artwork.get(record.id);
  const imagePath = image ? `art/equipment/individual/${image.file}` : null;
  const detail = {
    schemaVersion: 1,
    ...record,
    image: image ? {
      path: imagePath, width: image.width, height: image.height,
      assetId: image.assetId, sourceSheet: image.sourceSheet,
      cell: image.cell, sourceBounds: image.sourceBounds, trimBounds: image.trimBounds,
      ...image.artwork,
      prompts: `art/equipment/${image.sourceSheet.startsWith('rf-lenses-') ? 'generation-prompts.json' : 'README.md'}`,
    } : null,
  };
  const destination = path.join(output, relative);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, JSON.stringify(detail, null, 2) + '\n');
  entries.push({
    id: record.id, type, make: record.make, model: record.model,
    label: record.label, mount: record.mount, series: record.series ?? null,
    aliases: record.aliases ?? [], image: imagePath, detail: relative,
  });
}
entries.sort((a, b) => a.id.localeCompare(b.id));
fs.writeFileSync(path.join(output, 'index.json'), JSON.stringify({
  schemaVersion: 1, verifiedAt: inventory.verifiedAt,
  scope: inventory.scope, count: entries.length, entries,
}, null, 2) + '\n');
console.log(`Built catalog: ${entries.length} equipment records; index ${fs.statSync(path.join(output, 'index.json')).size} bytes`);
