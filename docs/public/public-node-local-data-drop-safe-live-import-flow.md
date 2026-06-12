# Public Node Local Data Drop Safe Live Import Flow v1

Marker: `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_SAFE_LIVE_IMPORT_FLOW_V1`

This is the safe operator flow for importing local files into the Public Node Local Data Drop that the live public route actually reads.

## Flow

1. Detect the running public node DATA_DIR.
2. Generate a no-mutation live import target plan.
3. Run the import against the detected live DATA_DIR.
4. Verify `/public-node/local-data-drop/weighted.json`.

## Commands

Detect route DATA_DIR:

    bash ops/mainnet0/public-node-local-data-drop-route-data-dir-detect.sh

Plan target:

    bash ops/mainnet0/public-node-local-data-drop-live-import-target-plan.sh /path/to/source-dir

Import only after reviewing the planned command:

    DATA_DIR="/detected/live/DATA_DIR" bash ops/mainnet0/public-node-local-data-drop-import-dir.sh "/path/to/source-dir"

Verify live weighted route:

    curl -fsS http://127.0.0.1:4100/public-node/local-data-drop/weighted.json

## Current Precision truth

- live route DATA_DIR: `/home/zoso/dev/void-node/data_a`
- current live weighted route object count after demo 001: `2`
- imported demo object: `live-import-demo-001.txt`
- seed object: `void-weighted-seed-v1.txt`

## Proof markers

- detector: `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_ROUTE_DATA_DIR_DETECT_V1_READY`
- planner: `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_LIVE_IMPORT_TARGET_PLAN_V1_READY`
- live demo proof: `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_LIVE_IMPORT_DEMO_001_V1_GREEN`
- status final: `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_LIVE_IMPORT_DEMO_001_STATUS_FINAL_GREEN`
