# Canon EOS R8 — shutter counter

## Where the counter lives

ExifTool decodes `CameraInfo` `0x0D29` into a plain `ShutterCount` field.
Model-scoped manifest; generic fallback no longer the only path.

## Evidence

Synthetic vectors only. Wanted: 3+ consecutive CR3 originals with expected
counts per `SAMPLES-WANTED.md` Tier 1.

## USB status

Unconfirmed — needs DIRE ShutterCount / EOSMSG / gphoto2 cross-check.
Desktop is USB-only: declare a `[[usb]]` block once probed.

## Caveats

- File number (`IMG_xxxx`) ≠ shutter count.
