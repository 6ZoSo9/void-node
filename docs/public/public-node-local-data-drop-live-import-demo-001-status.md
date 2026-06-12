# Public Node Local Data Drop Live Import Demo 001 Status v1

Marker: `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_LIVE_IMPORT_DEMO_001_STATUS_V1`

## Status

The first intentional live Public Node Local Data Drop import is complete and proven on Precision.

## Live import result

- imported object: `live-import-demo-001.txt`
- seed object: `void-weighted-seed-v1.txt`
- live weighted route object count: `2`
- route marker: `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_V1`

## Live DATA_DIR

The running public node reads:

- `/home/zoso/dev/void-node/data_a`

The earlier visibility gap happened because an attempted import wrote to:

- `.runtime/mainnet0`

That path was valid local runtime storage, but it was not the DATA_DIR used by the running public node.

## Proof

- proof script: `ops/mainnet0/public-node-local-data-drop-live-import-demo-001-proof.sh`
- proof marker: `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_LIVE_IMPORT_DEMO_001_V1_GREEN`
- final marker: `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_LIVE_IMPORT_DEMO_001_FINAL_GREEN`

## Checkpoint

- commit `7d417893`
- tag `ckpt-public-node-local-data-drop-live-import-demo-001-green-20260612-161431`

## Current proof mode

- Precision-only green
- Alienware deferred
- cross-box pending

## Route DATA_DIR detector

Marker: `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_ROUTE_DATA_DIR_DETECT_POINTER_V1`

Before running a live import, detect the DATA_DIR used by the running public node:

- detector: `ops/mainnet0/public-node-local-data-drop-route-data-dir-detect.sh`
- detector marker: `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_ROUTE_DATA_DIR_DETECT_V1_READY`
- confirmed live route DATA_DIR on Precision: `/home/zoso/dev/void-node/data_a`

This prevents importing into `.runtime/mainnet0` when the live public route is reading `data_a`.
