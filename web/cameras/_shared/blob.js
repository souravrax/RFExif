// Generic raw-byte helpers for blob-scan strategies (ESM, browser + Node).
// Returns the offset of the first magic occurrence with at least
// minTrailing bytes after it, or -1.
export function findMagic(bytes, magic, minTrailing) {
  minTrailing = minTrailing || 0;
  var limit = bytes.length - magic.length - minTrailing;
  outer: for (var i = 0; i <= limit; i++) {
    for (var j = 0; j < magic.length; j++) {
      if (bytes[i + j] !== magic[j]) continue outer;
    }
    return i;
  }
  return -1;
}

// format: "u16le" | "u32le" | "u16be" | "u32be". Out-of-range -> null.
export function readInt(bytes, off, format) {
  var n = format[1] === "3" ? 4 : 2;
  if (off < 0 || off + n > bytes.length) return null;
  var b0 = bytes[off], b1 = bytes[off + 1];
  if (n === 2) {
    return format[3] === "l" ? b0 + b1 * 256 : b0 * 256 + b1;
  }
  var b2 = bytes[off + 2], b3 = bytes[off + 3];
  var v = format[3] === "l"
    ? b0 + b1 * 256 + b2 * 65536 + b3 * 16777216
    : b0 * 16777216 + b1 * 65536 + b2 * 256 + b3;
  return v >>> 0;
}

// "BBCC0000" -> [0xBB, 0xCC, 0x00, 0x00]. Returns null on bad input.
export function parseHex(s) {
  s = String(s).replace(/\s+/g, "");
  if (!/^[0-9a-fA-F]+$/.test(s) || s.length % 2 !== 0 || !s.length) return null;
  var out = [];
  for (var i = 0; i < s.length; i += 2) out.push(parseInt(s.slice(i, i + 2), 16));
  return out;
}
