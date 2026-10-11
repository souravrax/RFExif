# Canon EOS R3 — shutter counter

## Where the counter lives

ExifTool decodes the R3 counter into a plain `ShutterCount` field — no blob
scan needed. The manifest claims it model-scoped instead of relying on the
generic fallback.

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
