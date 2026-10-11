# Canon EOS-1D X Mark III — shutter counter

## Where the counter lives

1-series CR3 files are natively decoded: ExifTool exposes a plain
`ShutterCount`. Model-scoped manifest instead of the generic fallback.

## Evidence

Synthetic vectors only. Wanted: 3+ consecutive CR3 originals with expected
counts per `SAMPLES-WANTED.md` Tier 1.

## USB status

Unconfirmed — needs DIRE ShutterCount / EOSMSG / gphoto2 cross-check
(built-in GPS body; USB should be straightforward). Desktop is USB-only:
declare a `[[usb]]` block once probed.

## Caveats

- File number (`IMG_xxxx`) ≠ shutter count.
