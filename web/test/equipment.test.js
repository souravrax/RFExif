import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { findLensIllustration } from '../src/lib/equipment-match.js';
const inventory = JSON.parse(fs.readFileSync(new URL('../lenses/inventory.json', import.meta.url)));
const find = model => findLensIllustration(inventory.records, model);

test('requested RF-S zoom tolerates manufacturer, spacing and f/ notation', () => {
  const lens = find('Canon RF-S18–150mm f/3.5-6.3 IS STM');
  assert.equal(lens?.label, 'RF-S 18-150mm F3.5-6.3 IS STM');
  assert.equal(lens.sheet, 'rf-lenses-02-4x4.png');
  assert.equal(lens.index, 0);
});
test('brands and lens variants remain distinct', () => {
  const standard = find('RF 85mm F1.2 L USM');
  const ds = find('RF 85mm F1.2 L USM DS');
  assert.notEqual(`${standard.sheet}:${standard.index}`, `${ds.sheet}:${ds.index}`);
  assert.equal(find('Sigma 18-50mm F2.8 DC DN')?.brand, 'Sigma');
  assert.equal(find('Viltrox AF85/1.8RF')?.status, 'historical');
  assert.equal(find('50mm F1.8'), null);
  assert.equal(find('Sigma 50mm F1.8'), null);
  assert.equal(find(''), null);
  assert.equal(find('EF-S 18-150mm F3.5-6.3 IS STM'), null);
});
test('ambiguous aliases do not choose an arbitrary illustration', () => {
  assert.equal(findLensIllustration([{label:'A',aliases:['lens']},{label:'B',aliases:['lens']}], 'lens'), null);
});
test('inventory has unique cell assignments and valid committed PNG sheets', () => {
  const cells = new Set();
  for (const record of inventory.records) {
    assert(record.source.startsWith('https://'));
    assert(record.index >= 0 && record.index < 16);
    const cell = `${record.sheet}:${record.index}`;
    assert(!cells.has(cell), `duplicate cell ${cell}`);
    cells.add(cell);
    const png = fs.readFileSync(new URL(`../static/art/equipment/${record.sheet}`, import.meta.url));
    assert.equal(png.subarray(1,4).toString(), 'PNG');
    assert.equal(png.readUInt32BE(16), png.readUInt32BE(20));
    assert.equal(png[25], 6, 'PNG must preserve RGBA transparency');
    assert.equal(find(record.label), record);
  }
});
