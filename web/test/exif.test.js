import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readJpegExif } from '../cameras/_shared/exif.js';

// A minimal JPEG APP1 segment with an EXIF IFD and an exposure rational.
function fixture(littleEndian) {
  const tiff = new Uint8Array(64);
  const view = new DataView(tiff.buffer);
  tiff.set(littleEndian ? [73, 73] : [77, 77]);
  const short = (offset, value) => view.setUint16(offset, value, littleEndian);
  const long = (offset, value) => view.setUint32(offset, value, littleEndian);
  short(2, 42); long(4, 8);
  short(8, 1);
  short(10, 0x8769); short(12, 4); long(14, 1); long(18, 26);
  short(26, 2);
  short(28, 0x8827); short(30, 3); long(32, 1); short(36, 400);
  short(40, 0x829a); short(42, 5); long(44, 1); long(48, 56);
  long(56, 1); long(60, 250);
  const jpeg = new Uint8Array(78);
  jpeg.set([255,216,255,225,0,72,69,120,105,102,0,0]);
  jpeg.set(tiff, 12); jpeg.set([255,217], 76);
  return jpeg;
}

for (const littleEndian of [true, false]) {
  test(`${littleEndian ? 'little' : 'big'} endian exposure preserves 1/250 and inline ISO`, () => {
    const tags = readJpegExif(fixture(littleEndian));
    assert.equal(tags.ExposureTime, '0.004');
    assert.equal(tags.ISO, '400');
  });
}

test('non-JPEG and truncated input return no metadata', () => {
  assert.deepEqual(readJpegExif(new Uint8Array([1, 2, 3])), {});
  assert.deepEqual(readJpegExif(fixture(true).slice(0, 15)), {});
});
