# Public Node Weighted Local Data Drop Closeout v1

Marker: `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_CLOSEOUT_V1`

## What closed

Weighted Local Data Drop v1 is closed as a public read-only surface.

It adds:

- `/public-node/local-data-drop/weighted.json`
- route-index entry marker `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_V1`
- route-manifest entry marker `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_V1`
- public-node UI card marker `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_UI_V1`
- source proof `ops/mainnet0/public-node-local-data-drop-weighted-source-proof.sh`
- live proof `ops/mainnet0/public-node-local-data-drop-weighted-proof.sh`

## Current live result

The current canonical service owner is `void-node.service`.

`void-node-live.service` is intentionally inactive during this closeout.

The live route returns:

- marker: `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_V1`
- status: `weighted_local_data_drop_ready`
- object count: `0`
- empty state: `no_operator_local_data_drop_objects_present`

That is correct because no operator-local public data drop objects are currently present.

## Why this matters

This is the first live bridge from storage into weighting.

Data Weight Record v1 defined the doctrine:

> persistent does not mean equal priority

Weighted Local Data Drop v1 applies that doctrine to real operator-local public data drop objects.

When objects exist, this route gives clients and agents a weighted view of what the node is carrying without allowing public mutation or treating local presence as network truth.

## Checkpoints

Source checkpoint:

- commit `0675df70`
- tag `ckpt-public-node-local-data-drop-weighted-source-green-20260611-235924`
- marker `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_SOURCE_V1_GREEN`

Live checkpoint:

- commit `ebed5041`
- tag `ckpt-public-node-local-data-drop-weighted-live-green-20260612-001906`
- marker `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_V1_GREEN`

## Safety posture

- public upload: false
- public mutation: false
- operator-local import only: true
- public read-only: true
- trusted as network truth: false
