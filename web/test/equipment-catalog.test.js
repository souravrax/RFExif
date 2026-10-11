import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const staticRoot = new URL('../static/', import.meta.url);
const catalogRoot = new URL('catalog/', staticRoot);
const read = url => JSON.parse(fs.readFileSync(url));

test('public catalog resolves unique mount-qualified details and image assets', () => {
  const index = read(new URL('index.json', catalogRoot));
  const inventory = read(new URL('../lenses/inventory.json', import.meta.url));
  const manifest = read(new URL('art/equipment/individual/manifest.json', staticRoot));
  assert.equal(index.count, inventory.records.length + manifest.images.filter(image => image.kind === 'camera').length);
  assert.equal(new Set(index.entries.map(entry => entry.id)).size, index.count);
  for (const entry of index.entries) {
    assert.ok(entry.detail.startsWith(`${entry.type}s/`));
    const detail = read(new URL(entry.detail, catalogRoot));
    assert.equal(detail.id, entry.id);
    assert.equal(detail.mount, entry.mount);
    assert.ok(entry.detail.includes(`/${detail.mountCode}/`));
    assert.equal(detail.image?.path ?? null, entry.image);
    if (entry.image) assert.ok(fs.existsSync(new URL(entry.image, staticRoot)));
    if (entry.type === 'lens') {
      const source = inventory.records.find(record => record.id === entry.id);
      for (const [key, value] of Object.entries(source)) assert.deepEqual(detail[key], value);
    }
  }
  const rfs = index.entries.find(entry => entry.label === 'RF-S 18-150mm F3.5-6.3 IS STM');
  assert.equal(rfs.mount, 'Canon RF');
  assert.ok(rfs.detail.includes('/canon-rf/rf-s-18-150mm'));
});
