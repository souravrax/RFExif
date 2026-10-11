# Canon EOS R6 — shutter counter

## Where the counter lives

ExifTool decodes `CameraInfo` `0x0AF1` into a plain `ShutterCount` field —
no blob scan needed. The manifest claims it model-scoped (`EOS R6`, Mark
II/III excluded by regex) instead of relying on the generic fallback.

## What it counts

Lifetime shutter actuations as decoded by ExifTool. Open question is only
that 3+ consecutive originals from this exact body confirm the plumbing end
to end.

## Evidence

Synthetic vectors only so far. Wanted: 3+ consecutive CR3 originals with
expected counts per `SAMPLES-WANTED.md` Tier 1.

## USB status

Unconfirmed — needs DIRE ShutterCount / EOSMSG / gphoto2 cross-check.
Desktop is USB-only: declare a `[[usb]]` block once probed.

## Caveats

- File number (`IMG_xxxx`) ≠ shutter count.
