# Canon EOS R10 — shutter counter

## Where the counter lives

The R10 publishes **no** EXIF `ShutterCount` (ExifTool decodes the blob as
`CanonCameraInfoUnknown`). The count lives in the 4608-byte `CanonCameraInfo`
blob (TIFF tag `0x000D`):

- **CR3**: `moov → CTMD rec.8 → TIFF 0x000D`, magic `BB CC 00 00`
- **JPG**: MakerNote tag `0x0D`, same blob, same magic

Little-endian **uint32 at blob-relative offset `0xC93` (3219)**.

## What it counts

**Total** actuations — mechanical + electronic-first-curtain + full
electronic. Proven by a mixed series: 2× Mechanical then 3× Electronic, each
step +1 with no divergence, plus a 6-file gap matching +6 counts.

## Evidence

| file | bytes 3219-3222 | value |
|---|---|---|
| IMG_4154.CR3 | 130, 86, 0, 0 | 22146 |
| … | … | … +1 per saved frame … |
| IMG_4173.CR3 | 149, 86, 0, 0 | 22165 |

14 consecutive shots, CR3 == JPG of the same shot every time.
Full table: `vectors.json`. Byte-level walkthrough in the project history.

## USB status

Unconfirmed — needs DIRE ShutterCount / EOSMSG / gphoto2 cross-check against
22165 (IMG_4173). Until then `experimental = true`.

## Caveats

- File number (`IMG_4173`) ≠ shutter count; numbering resets at 9999 and on
  card changes, the counter does not (factory resets don't touch it either).
- `b3220`–`b3222` are still zero below 65536 counts; the field must be read
  as uint32, not uint16, to survive rollover.
