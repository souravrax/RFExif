// Metadata helper tests — `node test/metadata.test.js` (no deps, no samples).
import test from "node:test";
import assert from "node:assert/strict";
import {
  groupOf,
  tagOf,
  formatValue,
  toEntries,
  categorize,
  categorizeEntries,
  filterEntries,
  firstValue,
  findNativeCount,
  diffKeys,
  exportJsonText,
} from "../src/lib/metadata.js";

test("group/tag split keeps source groups", function () {
  assert.equal(groupOf("MakerNotes:ShutterCount"), "MakerNotes");
  assert.equal(tagOf("MakerNotes:ShutterCount"), "ShutterCount");
  assert.equal(groupOf("ShutterCount"), "Other");
  assert.equal(tagOf("ShutterCount"), "ShutterCount");
});

test("formatValue keeps nested/array values as JSON (never [object])", function () {
  assert.equal(formatValue("a"), "a");
  assert.equal(formatValue(3), "3");
  assert.equal(formatValue(["a", "b"]), '["a","b"]');
  assert.equal(formatValue({ a: 1 }), '{"a":1}');
  assert.equal(formatValue(null), "");
});

test("toEntries sorts by full key and retains every field", function () {
  var entries = toEntries({ "EXIF:ISO": "400", "MakerNotes:SerialNumber": "123" });
  assert.equal(entries.length, 2);
  assert.equal(entries[0].key, "EXIF:ISO");
  assert.equal(entries[1].group, "MakerNotes");
});

test("categorize keeps GPS + MakerNotes identity, groups exposure/lens", function () {
  assert.equal(categorize({ group: "GPS", tag: "GPSLatitude", value: "1" }), "GPS");
  assert.equal(categorize({ group: "MakerNotes", tag: "ShutterCount", value: "5" }), "MakerNotes");
  assert.equal(categorize({ group: "EXIF", tag: "LensModel", value: "x" }), "Lens");
  assert.equal(categorize({ group: "EXIF", tag: "ISO", value: "400" }), "Exposure");
});

test("filterEntries searches keys and values", function () {
  var entries = toEntries({ "EXIF:ISO": "400", "EXIF:Model": "Canon EOS R10" });
  assert.equal(filterEntries(entries, "canon").length, 1);
  assert.equal(filterEntries(entries, "400").length, 1);
  assert.equal(filterEntries(entries, "").length, 2);
});

test("firstValue respects ordered preference, skips blanks", function () {
  assert.equal(firstValue({ a: "", b: "x" }, ["a", "b"]), "x");
  assert.equal(firstValue({}, ["a"]), "");
});

test("findNativeCount tries full group tags and short aliases", function () {
  var hit = findNativeCount({ "MakerNotes:ShutterCount": "22165" });
  assert.equal(hit.value, 22165);
  assert.equal(hit.key, "MakerNotes:ShutterCount");
  var alias = findNativeCount({ ShutterCount: "42" });
  assert.equal(alias.value, 42);
  assert.equal(findNativeCount({ "EXIF:ISO": "400" }), null);
  assert.equal(findNativeCount({}), null);
  for (const raw of ["4294967296", "-1", "123junk", "12.5", "1,234"]) {
    assert.equal(findNativeCount({ ShutterCount: raw }), null);
  }
  assert.equal(findNativeCount({ ShutterCount: "0" }).value, 0);
});

test("diffKeys reports only differing keys", function () {
  var d = diffKeys([{ a: "1", b: "x" }, { a: "2", b: "x" }]);
  assert.deepEqual(d, ["a"]);
  assert.deepEqual(diffKeys([{ a: "1" }]), []);
});

test("categorizeEntries + exportJsonText round-trip all fields", function () {
  var map = { "EXIF:Model": "Canon EOS R10", "GPS:GPSLatitude": "1" };
  var cats = categorizeEntries(map);
  assert.ok(cats.Camera.length >= 1);
  assert.ok(cats.GPS.length >= 1);
  var text = exportJsonText({ name: "f.CR3", model: "m", shutter: 5, source: "s", engine: "e", fullMap: map });
  var back = JSON.parse(text);
  assert.equal(back.tags["EXIF:Model"], "Canon EOS R10");
});
