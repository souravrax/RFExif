import test from 'node:test';
import assert from 'node:assert/strict';
import { enrichLensRecord } from '../lenses/metadata.js';
const record = label => ({brand:'Canon',label,mount:'Canon RF',source:'https://example.com/catalog',aliases:[]});
test('RF-S series and coverage remain separate from mount; zoom aperture stays variable', () => {
  const r = enrichLensRecord(record('RF-S 18-150mm F3.5-6.3 IS STM'));
  assert.equal(r.mount, 'Canon RF');
  assert.equal(r.series, 'RF-S');
  assert.equal(r.sensorFormat, 'APS-C');
  assert.deepEqual([r.focalLength.minMm,r.focalLength.maxMm], [18,150]);
  assert.deepEqual([r.maximumAperture.wide,r.maximumAperture.tele,r.maximumAperture.unit], [3.5,6.3,'f-number']);
  assert.equal(r.specifications.weatherSealed, null);
});
test('cine T-stops stay distinct and unsupported specifications stay unknown', () => {
  const r = enrichLensRecord({...record('Sirui Night Walker 24mm T1.2 S35 Cine'),brand:'Sirui'});
  assert.equal(r.model,'Night Walker 24mm T1.2 S35 Cine');
  assert.equal(r.maximumAperture.unit, 'T-stop');
  assert.equal(r.focalLength.type, 'prime');
  assert.equal(r.specifications.opticalStabilization, null);
  assert(r.categories.includes('cine'));
});
test('mount-specific identities differ and future verified specification overrides survive', () => {
  const rf = enrichLensRecord({...record('50mm F1.8'),specifications:{weightG:100}});
  const ef = enrichLensRecord({...record('50mm F1.8'),mount:'Canon EF'});
  assert.notEqual(rf.id,ef.id);
  assert.equal(rf.specifications.weightG,100);
  assert.equal(rf.specifications.filterThreadMm,null);
});
