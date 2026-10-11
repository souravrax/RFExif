import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { equipmentSlug } from '../lenses/metadata.js';
import { CAMERA_SPEC_DEFAULTS } from '../src/lib/camera-specs.js';
import { loadManifest } from '../cameras/_shared/manifest.js';

const web = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(web, 'static/catalog');
const inventory = JSON.parse(fs.readFileSync(path.join(web, 'lenses/inventory.json')));
const cameraSpecs = JSON.parse(fs.readFileSync(path.join(web, 'cameras/camera-specs.json')));
const manifest = JSON.parse(fs.readFileSync(path.join(web, 'static/art/equipment/individual/manifest.json')));
const images = manifest.images.filter(image => image.kind !== 'duplicate');
const artwork = new Map(images.map(image => [image.id, image]));

// Shutter-count support, single-sourced from web/cameras/*/camera.toml.
// Matched to catalog bodies by display label ("Canon EOS R10").
const shutterByLabel = new Map();
for (const dir of fs.readdirSync(path.join(web, 'cameras')).sort()) {
  if (dir.startsWith('_')) continue;
  const tomlPath = path.join(web, 'cameras', dir, 'camera.toml');
  if (!fs.existsSync(tomlPath)) continue;
  try {
    const parsed = loadManifest(fs.readFileSync(tomlPath, 'utf8'), dir);
    shutterByLabel.set(parsed.camera.label, parsed);
  } catch {
    // validate.js owns manifest correctness; the catalog skips broken ones.
  }
}

function enrichCameraRecord(record) {
  const researched = cameraSpecs.bodies[record.id] || {};
  const support = shutterByLabel.get(`${record.make} ${record.model}`) || null;
  return {
    ...record,
    series: researched.series ?? record.series ?? null,
    sensorFormat: researched.sensorFormat ?? null,
    source: researched.source ?? record.source ?? null,
    specifications: { ...CAMERA_SPEC_DEFAULTS, ...(researched.specifications || {}) },
    shutterSupport: support ? {
      manifestId: support.camera.id,
      ratedLife: support.camera.ratedLife || null,
      strategies: support.strategies.map(strategy => ({
        kind: strategy.kind,
        platforms: strategy.platforms,
        experimental: strategy.experimental,
        note: strategy.note,
        tag: strategy.tag || null,
      })),
    } : null,
    metadataProvenance: {
      ...(record.metadataProvenance || {}),
      sensorFormat: researched.sensorFormat ? 'canon-r-series-lineup' : null,
      shutterSupport: support ? `cameras/${support.camera.id}/camera.toml` : null,
      unknownSpecifications: 'not-yet-researched',
    },
  };
}
const records = [
  ...images.filter(image => image.kind === 'camera').map(enrichCameraRecord),
  ...inventory.records.map(record => ({ ...record, equipmentType: 'lens' })),
];
const entries = [];
const ids = new Set();
for (const record of records) {
  if (ids.has(record.id)) throw new Error(`Duplicate equipment ID: ${record.id}`);
  ids.add(record.id);
  const type = record.equipmentType;
  const group = type === 'lens' ? 'lenses' : 'cameras';
  const relative = `${group}/${equipmentSlug(record.make)}/${record.mountCode}/${equipmentSlug(record.model)}.json`;
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
