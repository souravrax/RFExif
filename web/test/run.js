// ShutterDrop web extractor tests — `node web/test/run.js`.
// Reads real sample files from $SHUTTERDROP_SAMPLES (never vendored).
// Contributors: add your camera's consecutive-file vectors to VECTORS.
"use strict";
const fs = require("fs");
const path = require("path");

const SAMPLES = process.env.SHUTTERDROP_SAMPLES || path.join(__dirname, "..", "samples");

// [extractorId, filename, expectedValue]
const VECTORS = [
  ["canon-r10", "IMG_4154.CR3", 22146],
  ["canon-r10", "IMG_4155.CR3", 22147],
  ["canon-r10", "IMG_4156.CR3", 22148],
  ["canon-r10", "IMG_4157.CR3", 22149],
  ["canon-r10", "IMG_4158.CR3", 22150],
  ["canon-r10", "IMG_4159.CR3", 22151],
  ["canon-r10", "IMG_4160.CR3", 22152],
  ["canon-r10", "IMG_4161.CR3", 22153],
  ["canon-r10", "IMG_4162.CR3", 22154],
  ["canon-r10", "IMG_4169.CR3", 22161],
  ["canon-r10", "IMG_4170.CR3", 22162],
  ["canon-r10", "IMG_4171.CR3", 22163],
  ["canon-r10", "IMG_4172.CR3", 22164],
  ["canon-r10", "IMG_4173.CR3", 22165],
  ["canon-r10", "IMG_4154.JPG", 22146],
  ["canon-r10", "IMG_4173.JPG", 22165],
];

const R10 = require("../r10");
const Registry = require("../cameras/registry");
require("../cameras/canon-r10");
require("../cameras/exif-shutter");

let pass = 0, fail = 0, skip = 0;
for (const [id, file, want] of VECTORS) {
  const p = path.join(SAMPLES, file);
  if (!fs.existsSync(p)) { skip++; continue; }
  const bytes = new Uint8Array(fs.readFileSync(p));
  const exif = /\.jpe?g$/i.test(file) ? R10.readJpegExif(bytes) : {};
  const hit = Registry.read({ bytes, exif, fileName: file });
  if (!hit) { fail++; console.log(`FAIL ${file}: no extractor hit`); continue; }
  if (hit.extractor.id !== id || hit.result.value !== want) {
    fail++;
    console.log(`FAIL ${file}: got ${hit.extractor.id}=${hit.result.value}, want ${id}=${want}`);
  } else pass++;
}
console.log(`\n${pass} passed, ${fail} failed, ${skip} skipped (missing samples)`);
process.exit(fail ? 1 : 0);
