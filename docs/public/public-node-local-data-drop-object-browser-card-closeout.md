# Public Node Local Data Drop Object Browser Card Closeout v1

Marker: `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_OBJECT_BROWSER_CARD_CLOSEOUT_V1`

## What closed

The Public Node page now exposes a human-clickable Local Data Drop Object Browser card.

The card lets a tester open the live weighted local seed object through four public read-only paths:

- weighted records JSON
- seed object proof
- fetch by object id
- fetch by SHA-256

## UI surface

The Public Node page includes:

- card id `publicNodeLocalDataDropObjectBrowserCard`
- marker `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_OBJECT_BROWSER_CARD_UI_V1`
- link id `publicNodeWeightedObjectBrowserWeightedLink`
- link id `publicNodeWeightedObjectBrowserProofLink`
- link id `publicNodeWeightedObjectBrowserObjectLink`
- link id `publicNodeWeightedObjectBrowserShaLink`

## Live object

Object:

- id `void-weighted-seed-v1.txt`
- SHA-256 `0b3b3284a47dd583f209008a9088c682c82af4609ee3dce222176b9617526a2d`

Live paths:

- `/public-node/local-data-drop/weighted.json`
- `/public-node/local-data-drop/proof/0b3b3284a47dd583f209008a9088c682c82af4609ee3dce222176b9617526a2d.json`
- `/public-node/local-data-drop/void-weighted-seed-v1.txt`
- `/public-node/local-data-drop/by-sha256/0b3b3284a47dd583f209008a9088c682c82af4609ee3dce222176b9617526a2d`

## Checkpoints

Source checkpoint:

- commit `b10d4ceb`
- tag `ckpt-public-node-local-data-drop-object-browser-card-source-green-20260612-005519`
- marker `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_OBJECT_BROWSER_CARD_SOURCE_V1_GREEN`

Live checkpoint:

- commit `ee0fb44b`
- tag `ckpt-public-node-local-data-drop-object-browser-card-live-green-20260612-073134`
- marker `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_OBJECT_BROWSER_CARD_V1_GREEN`

## Why this matters

The first real local public object is no longer hidden behind JSON-only discovery.

A human tester can open `/public-node`, see that the node has weighted local data, and click directly into the record, proof, object fetch, and content-address fetch.
