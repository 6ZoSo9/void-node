# Public Node Local Data Drop Import Own Data Card Closeout v1

Marker: `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_OWN_DATA_CARD_CLOSEOUT_V1`

## What closed

The Public Node page now tells a node runner how to import their own local file into the public Local Data Drop flow.

The card turns the previous read-only demo into an operator action path:

1. create a small local folder
2. write a local file
3. run the import helper
4. refresh `/public-node`
5. inspect the local drop index and weighted route

## UI surface

The Public Node page includes:

- card id `publicNodeLocalDataDropImportOwnDataCard`
- marker `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_OWN_DATA_CARD_UI_V1`
- heading `Import Your Own Local Data`
- copy-paste command using `ops/mainnet0/public-node-local-data-drop-import-dir.sh`
- pointer to `docs/public/public-node-local-data-drop-import-directory-runbook.md`

## Command shown

    mkdir -p /tmp/void-local-data-drop-demo
    echo 'hello from my VOID node' > /tmp/void-local-data-drop-demo/my-first-void-object.txt
    DATA_DIR="$PWD/data_a" MAX_FILES=25 ops/mainnet0/public-node-local-data-drop-import-dir.sh /tmp/void-local-data-drop-demo

After import, operators check:

- `/public-node/local-data-drop.json`
- `/public-node/local-data-drop/weighted.json`

## Checkpoints

Source checkpoint:

- commit `99be1f8e`
- tag `ckpt-public-node-local-data-drop-import-own-data-card-source-green-20260612-074224`
- marker `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_OWN_DATA_CARD_SOURCE_V1_GREEN`

Copy cleanup checkpoint:

- commit `6a81d8d7`
- tag `ckpt-public-node-local-data-drop-import-own-data-card-copy-green-20260612-074637`
- marker `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_OWN_DATA_CARD_SOURCE_V1_GREEN`

Live checkpoint:

- commit `d9859423`
- tag `ckpt-public-node-local-data-drop-import-own-data-card-live-green-20260612-075012`
- marker `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_OWN_DATA_CARD_V1_GREEN`

## Why this matters

A tester no longer has to infer how to feed local data into VOID.

The public page now shows:

- the node is storing real public data
- the node weights that data
- the node exposes object proof/fetch links
- the node tells operators how to add their own local file into the same flow
