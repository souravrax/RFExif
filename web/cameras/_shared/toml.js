// Minimal TOML-subset parser for RF EXIF camera manifests.
// Supports exactly what camera.toml uses (nothing more):
//   - comments (# ...) and blank lines
//   - [table] and [[array-table]] headers (single level, e.g. [camera])
//   - key = value where value is:
//       "string" (double-quoted, \\ \" escapes), true/false,
//       decimal / 0x-hex integers, ["a", "b"] string arrays
// Throws with a line number on anything else — manifests must stay tiny.
export function parseToml(src) {
  var root = {};
  var ctx = root;
  var lines = String(src).split(/\r?\n/);
  for (var ln = 0; ln < lines.length; ln++) {
    var line = lines[ln].trim();
    if (!line || line[0] === "#") continue;
    var hm = line.match(/^\[\[\s*([A-Za-z0-9_]+)\s*\]\]$/);
    var tm = line.match(/^\[\s*([A-Za-z0-9_]+)\s*\]$/);
    if (hm) {
      var arr = root[hm[1]] || (root[hm[1]] = []);
      if (!Array.isArray(arr)) fail(ln, "not an array table");
      ctx = {};
      arr.push(ctx);
      continue;
    }
    if (tm) {
      ctx = root[tm[1]] || (root[tm[1]] = {});
      continue;
    }
    var km = line.match(/^([A-Za-z0-9_]+)\s*=\s*(.+)$/);
    if (!km) fail(ln, "bad line");
    ctx[km[1]] = parseValue(km[2].trim(), ln);
  }
  return root;
}

function fail(ln, why) {
  throw new Error("camera.toml line " + (ln + 1) + ": " + why);
}

function parseValue(s, ln) {
  if (s[0] === '"') return parseString(s, ln);
  if (s === "true") return true;
  if (s === "false") return false;
  if (/^0[xX][0-9a-fA-F]+$/.test(s)) return parseInt(s, 16);
  if (/^-?\d+$/.test(s)) return parseInt(s, 10);
  if (s[0] === "[") return parseArray(s, ln);
  fail(ln, "bad value " + JSON.stringify(s));
}

function parseString(s, ln) {
  var out = "", i = 1;
  while (i < s.length) {
    var c = s[i];
    if (c === '"') {
      if (s.slice(i + 1).trim() !== "") fail(ln, "trailing chars");
      return out;
    }
    if (c === "\\") {
      var n = s[i + 1];
      if (n === '"' || n === "\\") { out += n; i += 2; continue; }
      if (n === "n") { out += "\n"; i += 2; continue; }
      if (n === "t") { out += "\t"; i += 2; continue; }
      fail(ln, "bad escape");
    }
    out += c;
    i++;
  }
  fail(ln, "unterminated string");
}

function parseArray(s, ln) {
  if (!/^\[.*\]$/.test(s)) fail(ln, "bad array");
  var inner = s.slice(1, -1).trim();
  if (!inner) return [];
  // string-only arrays: split on quotes.
  var parts = inner.match(/"([^"\\]|\\.)*"/g);
  if (!parts) fail(ln, "only string arrays supported");
  return parts.map(function (p) { return parseString(p, ln); });
}
