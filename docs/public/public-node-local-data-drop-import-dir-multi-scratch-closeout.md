# Public Node Local Data Drop Import Directory Multi Scratch Closeout v1

Marker: `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_DIR_MULTI_SCRATCH_CLOSEOUT_V1`

## What closed

The Local Data Drop directory import helper is now proven against a multi-file scratch directory.

This proves directory import handles more than one file and preserves nested path identity through object id sanitization.

## Scratch import

The proof imports three files:

- `alpha.txt`
- `beta.txt`
- `subdir/gamma.txt`

The nested file becomes object id:

- `subdir__gamma.txt`

## Proof result

The proof confirms:

- import directory marker `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_DIR_V1`
- imported count `3`
- operator-local import only
- public read-only policy
- trusted-as-network-truth is false
- live weighted object count remains `1`

## Checkpoint

- commit `009c7cce`
- tag `ckpt-public-node-local-data-drop-import-dir-multi-scratch-green-20260612-141244`
- marker `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_DIR_MULTI_SCRATCH_V1_GREEN`

## Why this matters

This proves the local data drop path is not only a one-object toy.

A node operator can point the helper at a local folder, import multiple files, preserve nested identity, and still avoid mutating the live Public Node demo unless intentionally using the live data directory.
