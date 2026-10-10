// Shared Canon R10 shutter reader — works in browser and Node.
// The 4608-byte CanonCameraInfo blob (TIFF tag 0x000D, magic BB CC 00 00)
// holds a little-endian uint32 total-actuation counter at byte 0xC93.
// Validated 22146 -> 22165 across 14 consecutive R10 CR3/JPG pairs.
(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) module.exports = factory();
  else root.ShutterDropR10 = factory();
})(typeof self !== "undefined" ? self : this, function () {
  var MAGIC_0 = 0xbb, MAGIC_1 = 0xcc;
  var BLOB_LEN = 4608;
  var SHUTTER_OFF = 3219; // 0xC93

  function findR10Shutter(bytes) {
    // bytes: Uint8Array (or Buffer)
    var limit = bytes.length - BLOB_LEN - 4;
    for (var i = 0; i <= limit; i++) {
      if (bytes[i] === MAGIC_0 && bytes[i + 1] === MAGIC_1 &&
          bytes[i + 2] === 0 && bytes[i + 3] === 0) {
        var o = i + SHUTTER_OFF;
        var b0 = bytes[o], b1 = bytes[o + 1], b2 = bytes[o + 2], b3 = bytes[o + 3];
        var value = (b0 + b1 * 256 + b2 * 65536 + b3 * 16777216) >>> 0;
        return { value: value, bytes: [b0, b1, b2, b3], blobOffset: i };
      }
    }
    return null;
  }

  // Minimal JPEG APP1/EXIF reader for the common display tags.
  // Returns {} for non-JPEG or on any parse failure (never throws).
  function readJpegExif(bytes) {
    try {
      var out = {};
      if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return out;
      var pos = 2;
      while (pos + 4 < bytes.length) {
        if (bytes[pos] !== 0xff) break;
        var marker = bytes[pos + 1];
        if (marker === 0xda || marker === 0xd9) break; // SOS / EOI
        var segLen = (bytes[pos + 2] << 8) + bytes[pos + 3];
        if (segLen < 2 || pos + segLen > bytes.length) break;
        if (marker === 0xe1 && segLen > 8 &&
            bytes[pos + 4] === 0x45 && bytes[pos + 5] === 0x78 &&
            bytes[pos + 6] === 0x69 && bytes[pos + 7] === 0x66) {
          parseTiff(bytes, pos + 10, segLen - 8, out);
          return out;
        }
        pos += 2 + segLen;
      }
      return out;
    } catch (e) { return {}; }
  }

  function u16(b, o, le) { return le ? b[o] + b[o + 1] * 256 : b[o] * 256 + b[o + 1]; }
  function u32(b, o, le) {
    return le
      ? (b[o] + b[o + 1] * 256 + b[o + 2] * 65536 + b[o + 3] * 16777216) >>> 0
      : (b[o] * 16777216 + b[o + 1] * 65536 + b[o + 2] * 256 + b[o + 3]) >>> 0;
  }

  function ascii(b, o, n) {
    var s = "";
    for (var i = 0; i < n; i++) {
      var c = b[o + i];
      if (c === 0) break;
      s += String.fromCharCode(c);
    }
    return s.trim();
  }

  function rational(b, o, le) {
    var n = u32(b, o, le), d = u32(b, o + 4, le);
    if (!d) return "";
    var v = n / d;
    return (Math.round(v * 100) / 100).toString();
  }

  function ifdValue(b, tiff, entry, le, out, tagId) {
    var type = u16(b, entry + 2, le);
    var count = u32(b, entry + 4, le);
    var valOff = entry + 8;
    function field(off) {
      if (type === 2) return ascii(b, (count > 4 ? tiff + u32(b, valOff, le) : valOff), Math.min(count, 64));
      if (type === 3 && count === 1) return String(u16(b, valOff + (le ? 0 : 2), le));
      if (type === 4 && count === 1) return String(u32(b, valOff, le));
      if (type === 5 && count === 1) return rational(b, tiff + u32(b, valOff, le), le);
      if (type === 7 && count === 1) return String(b[valOff]);
      void off;
      return "";
    }
    if (tagId === 0x0110) out.Model = field();
    else if (tagId === 0x9003 || tagId === 0x9004) { if (!out.DateTime) out.DateTime = field().replace(/^(\d{4}):(\d{2}):(\d{2})/, "$1-$2-$3"); }
    else if (tagId === 0x8827) out.ISO = field();
    else if (tagId === 0x829a) out.ExposureTime = field();
    else if (tagId === 0x829d) out.FNumber = field();
    else if (tagId === 0x920a) out.FocalLength = field() + (field() ? " mm" : "");
  }

  function parseTiff(bytes, tiff, len, out) {
    if (tiff + 8 > bytes.length) return;
    var le = bytes[tiff] === 0x49 && bytes[tiff + 1] === 0x49;
    if (!le && !(bytes[tiff] === 0x4d && bytes[tiff + 1] === 0x4d)) return;
    var ifd0 = tiff + u32(bytes, tiff + 4, le);
    var n = u16(bytes, ifd0, le);
    var exifPtr = 0;
    for (var i = 0; i < n; i++) {
      var e = ifd0 + 2 + i * 12;
      if (e + 12 > bytes.length) break;
      var tag = u16(bytes, e, le);
      if (tag === 0x8769 && u16(bytes, e + 2, le) === 4 && u32(bytes, e + 4, le) === 1) {
        exifPtr = tiff + u32(bytes, e + 8, le); // ExifIFD offset (LONG, count 1)
      }
      ifdValue(bytes, tiff, e, le, out, tag);
    }
    if (exifPtr) {
      var m = u16(bytes, exifPtr, le);
      for (var j = 0; j < m; j++) {
        var f = exifPtr + 2 + j * 12;
        if (f + 12 > bytes.length) break;
        ifdValue(bytes, tiff, f, le, out, u16(bytes, f, le));
      }
    }
  }

  return { findR10Shutter: findR10Shutter, readJpegExif: readJpegExif };
});
