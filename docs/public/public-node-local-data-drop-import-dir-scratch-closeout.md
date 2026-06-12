# Public Node Local Data Drop Import Directory Scratch Closeout v1

Marker: `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_DIR_SCRATCH_CLOSEOUT_V1`

## What closed

The Local Data Drop directory import helper is now proven in a scratch data directory.

This proves operator-local import behavior without mutating the live Precision runtime.

## Scratch proof

The scratch proof imports:

- object id `void-import-scratch-v1.txt`
- SHA-256 `b851165cc2ba6722881d245892a39186eb42c3c84d54fa86300d424a094f6e35`

The proof confirms:

- import directory marker `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_DIR_V1`
- imported count `1`
- operator-local import only
- public read-only policy
- trusted-as-network-truth is false
- live weighted object count remains `1`

## Checkpoint

- commit `cd9dbdbd`
- tag `ckpt-public-node-local-data-drop-import-dir-scratch-green-20260612-140648`
- marker `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_DIR_SCRATCH_V1_GREEN`

## Why this matters

We proved the node can ingest another local file path safely, but did not disturb the current live Public Node one-object demo or its existing green proofs.
