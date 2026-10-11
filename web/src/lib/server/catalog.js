import fs from 'node:fs';
import path from 'node:path';
import { error } from '@sveltejs/kit';

function catalog() {
  const root = path.resolve('static/catalog');
  return { root, index: JSON.parse(fs.readFileSync(path.join(root, 'index.json'), 'utf8')) };
}

export function detailEntries(type) {
  return catalog().index.entries.filter(entry => entry.type === type && entry.mount === 'Canon RF').map(entry => {
    const [group, make, mount, model] = entry.detail.replace(/\.json$/, '').split('/');
    return { make, mount, model };
  });
}

export function loadDetail(type, params) {
  const { root, index } = catalog();
  const group = type === 'lens' ? 'lenses' : 'cameras';
  const target = `${group}/${params.make}/${params.mount}/${params.model}.json`;
  const entry = index.entries.find(entry => entry.type === type && entry.mount === 'Canon RF' && entry.detail === target);
  if (!entry) error(404, 'Equipment not found');
  return { type, entry, record: JSON.parse(fs.readFileSync(path.join(root, entry.detail), 'utf8')) };
}

export function loadEquipment(type) {
  const root = path.resolve('static/catalog');
  const index = JSON.parse(fs.readFileSync(path.join(root, 'index.json'), 'utf8'));
  // The R-system directory excludes the EF DSLR in our illustration collection.
  const entries = index.entries.filter(entry => entry.type === type && entry.mount === 'Canon RF');
  return { type, verifiedAt: index.verifiedAt, entries: entries.map(entry => {
    const detail = JSON.parse(fs.readFileSync(path.join(root, entry.detail), 'utf8'));
    const specs = detail.specifications || {};
    const support = detail.shutterSupport || null;
    return { ...entry, focus: detail.focus ?? null, status: detail.status ?? null,
      sensorFormat: detail.sensorFormat ?? null, focalLength: detail.focalLength ?? null,
      maximumAperture: detail.maximumAperture ?? null, categories: detail.categories ?? [],
      source: detail.source ?? null,
      megapixels: specs.effectiveMegapixels ?? null,
      maxVideo: specs.maxVideoResolution ?? null,
      shutterStatus: !support ? 'unmapped'
        : support.strategies.some(strategy => !strategy.experimental) ? 'supported' : 'experimental' };
  }) };
}
