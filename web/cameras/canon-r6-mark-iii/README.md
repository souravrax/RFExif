# Canon EOS R6 Mark III — shutter counter

## Where the counter lives

No lifetime in-file counter is known. ExifTool exposes `CameraInfo`
`0x086D` as `ImageCount` — usable only with a big warning (below).

## What it counts

Frames since last card format — **not** lifetime actuations. Presented only
as an explicitly labeled experimental reading; lifetime tracking needs USB.

## Evidence

Synthetic vectors only. Wanted: confirmation that `ImageCount` behaves as
documented (resets on format), plus any lifetime-counter research.

## USB status

Unconfirmed — needs DIRE ShutterCount / EOSMSG / gphoto2 cross-check.
Desktop is USB-only: declare a `[[usb]]` block once probed.

## Caveats

- `ImageCount` resets on card format. Never mistake it for a shutter count.
- File number (`IMG_xxxx`) ≠ shutter count.
