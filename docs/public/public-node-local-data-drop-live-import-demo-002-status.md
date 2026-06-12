# Public Node Local Data Drop Live Import Demo 002 Status

Marker: `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_LIVE_IMPORT_DEMO_002_STATUS_V1`

Demo 002 proves the safe live import flow can repeatedly add operator-local files into the DATA_DIR that the public weighted route actually reads.

## Current Precision truth

- live route DATA_DIR: `/home/zoso/dev/void-node/data_a`
- source directory: `/tmp/void-live-import-demo-002-src`
- imported object: `live-import-demo-002.txt`
- imported sha256: `264e0d3832fbad60f3a5bd574794148a0db313583717c4b6bedb94e7db75e871`
- weighted route: `/public-node/local-data-drop/weighted.json`
- before object count: `2`
- after object count: `3`

## Route exposure

The public weighted route exposes Demo 002 as a weighted record, not as raw body text inside `weighted.json`.

Required route fields:

- `object_id=live-import-demo-002.txt`
- `sha256=264e0d3832fbad60f3a5bd574794148a0db313583717c4b6bedb94e7db75e871`
- `verification_state=verified`
- `freshness_state=fresh`
- `suspicion_state=clean`
- `object_href=/public-node/local-data-drop/live-import-demo-002.txt`
- `content_address_href=/public-node/local-data-drop/by-sha256/264e0d3832fbad60f3a5bd574794148a0db313583717c4b6bedb94e7db75e871`
- `proof_href=/public-node/local-data-drop/proof/264e0d3832fbad60f3a5bd574794148a0db313583717c4b6bedb94e7db75e871.json`

## Proof markers

- route import marker: `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_DIR_V1_IMPORTED`
- target planner marker: `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_LIVE_IMPORT_TARGET_PLAN_V1_READY`
- status proof marker: `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_LIVE_IMPORT_DEMO_002_STATUS_V1_GREEN`

## Public endpoint verification

Marker: `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_LIVE_IMPORT_DEMO_002_PUBLIC_ENDPOINTS_V1`

Demo 002 public endpoints were verified:

- object route: `/public-node/local-data-drop/live-import-demo-002.txt`
- content-address route: `/public-node/local-data-drop/by-sha256/264e0d3832fbad60f3a5bd574794148a0db313583717c4b6bedb94e7db75e871`
- proof route: `/public-node/local-data-drop/proof/264e0d3832fbad60f3a5bd574794148a0db313583717c4b6bedb94e7db75e871.json`
- object route SHA matched content-address route SHA.
- proof JSON exposed `object_id`, `sha256`, `object_href`, `content_address_href`, `proof_href`, and `receipt_sha256`.
