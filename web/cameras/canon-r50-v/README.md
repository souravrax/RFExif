# Canon EOS R50 V — shutter counter

## Where the counter lives

Unknown. This manifest assumes the `0x0D29`-generation `ShutterCount`, but
that is **unconfirmed** — the strategy only fires if an EXIF backend
actually decodes the tag for this body.

## Evidence

Synthetic vectors only. Wanted: 3 CR3 originals to confirm (or refute) the
tag family, then expected counts per `SAMPLES-WANTED.md`.

## USB status

Unconfirmed — needs DIRE ShutterCount / EOSMSG / gphoto2 cross-check.
Desktop is USB-only: declare a `[[usb]]` block once probed.

## Caveats

- File number (`IMG_xxxx`) ≠ shutter count.
- Until confirmed, files from this body keep resolving through the generic
  fallback (if any backend decodes the tag).
