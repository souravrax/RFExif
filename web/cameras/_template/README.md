# Brand Model — shutter counter

## Where the counter lives

(Container path, tag/offset, endianness. Delete this template text and write
yours. Example: CR3 CTMD rec.8 → TIFF 0x000D, magic `BB CC 00 00`, LE uint32
at blob-relative `0xC93`.)

## What it counts

(Mechanical only? Total incl. electronic? How you proved it — e.g. mixed
mechanical + electronic series with no divergence.)

## Evidence

| file | value |
|---|---|
| IMG_0001.CR3 | 12345 |
| IMG_0002.CR3 | 12346 |

(Consecutive, no skips. Full table: `vectors.json`.)

## USB status

Unconfirmed — needs DIRE ShutterCount / EOSMSG / gphoto2 cross-check.
(Or: confirmed at N on DATE with TOOL.)

Desktop is USB-only: once probed, declare the counter in a `[[usb]] block
in `camera.toml` (see the template) and record fixtures in
`usb-vectors.json`. File strategies above are web-only.

## Caveats

(File number ≠ shutter; resets don't touch the counter; rollover notes…)
