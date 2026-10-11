# Canon EOS R5 Mark II — shutter counter

## Where the counter lives

ExifTool decodes `CameraInfo` `0x069C` into a plain `ShutterCount` field.
Model-scoped manifest; the plain-R5 regex explicitly excludes this body.

## Evidence

Synthetic vectors only. Wanted: 3+ consecutive CR3 originals with expected
counts per `SAMPLES-WANTED.md` Tier 1.

## USB status

Unconfirmed — needs DIRE ShutterCount / EOSMSG / gphoto2 cross-check.
Desktop is USB-only: declare a `[[usb]]` block once probed.

## Caveats

- File number (`IMG_xxxx`) ≠ shutter count.
