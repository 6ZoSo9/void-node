# Public Node Local Data Drop Human Demo Closeout v1

Marker: `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_HUMAN_DEMO_CLOSEOUT_V1`

## What closed

The Public Node page now has a complete human-facing local data demo.

A tester can open `/public-node` and see three connected pieces:

1. a live weighted local object count
2. a clickable object browser for the stored seed object
3. copy-paste instructions for importing their own local file

## Public page cards

The demo is made of these UI cards:

- `publicNodeLocalDataDropWeightedCard`
- `publicNodeLocalDataDropObjectBrowserCard`
- `publicNodeLocalDataDropImportOwnDataCard`

The cards expose these markers:

- `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_UI_V1`
- `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_STATUS_UI_V1`
- `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_OBJECT_BROWSER_CARD_UI_V1`
- `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_OWN_DATA_CARD_UI_V1`

## Live routes

The demo uses these public read-only routes:

- `/public-node/local-data-drop.json`
- `/public-node/local-data-drop/weighted.json`
- `/public-node/local-data-drop/proof/0b3b3284a47dd583f209008a9088c682c82af4609ee3dce222176b9617526a2d.json`
- `/public-node/local-data-drop/void-weighted-seed-v1.txt`
- `/public-node/local-data-drop/by-sha256/0b3b3284a47dd583f209008a9088c682c82af4609ee3dce222176b9617526a2d`

## Seed object

The current live seed object is:

- object id `void-weighted-seed-v1.txt`
- SHA-256 `0b3b3284a47dd583f209008a9088c682c82af4609ee3dce222176b9617526a2d`

The weighted route currently reports:

- `object_count=1`
- `weighted_records_len=1`

## Import command shown to node runners

    mkdir -p /tmp/void-local-data-drop-demo
    echo 'hello from my VOID node' > /tmp/void-local-data-drop-demo/my-first-void-object.txt
    DATA_DIR="$PWD/data_a" MAX_FILES=25 ops/mainnet0/public-node-local-data-drop-import-dir.sh /tmp/void-local-data-drop-demo

## Checkpoints

Weighted status card closeout:

- commit `3b230215`
- tag `ckpt-public-node-local-data-drop-weighted-status-card-closeout-green-20260612-005002`
- marker `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_STATUS_CARD_CLOSEOUT_V1_GREEN`

Object browser card closeout:

- commit `71bd92c1`
- tag `ckpt-public-node-local-data-drop-object-browser-card-closeout-green-20260612-073538`
- marker `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_OBJECT_BROWSER_CARD_CLOSEOUT_V1_GREEN`

Import own data card closeout:

- commit `51b49838`
- tag `ckpt-public-node-local-data-drop-import-own-data-card-closeout-green-20260612-075545`
- marker `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_OWN_DATA_CARD_CLOSEOUT_V1_GREEN`

## Why this matters

This is the first clean public-node human demo for local storage.

VOID can now show a tester that a node is storing real public data, weighting it for agents, serving proofs and content-addressed fetches, and giving the operator a direct path to import their own file into the same flow.
