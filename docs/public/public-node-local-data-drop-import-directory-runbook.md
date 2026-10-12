# Public Node Local Data Drop Import Directory Runbook

Marker: VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_DIR_RUNBOOK_V1

This runbook shows an operator how to import a local folder into the public-node local data drop store.

## Import a folder

    cd "$HOME/dev/void-node"
    DATA_DIR="$HOME/dev/void-node/.runtime/mainnet0" \
      ops/mainnet0/public-node-local-data-drop-import-dir.sh /path/to/folder

## Start the node

    cd "$HOME/dev/void-node"
    DATA_DIR="$HOME/dev/void-node/.runtime/mainnet0" npm start

## Public read-only surfaces

After import, objects are exposed through the existing local data drop routes:

- /public-node/local-data-drop.json
- /public-node/local-data-drop/manifest.json
- /public-node/local-data-drop/:objectId
- /public-node/local-data-drop/by-sha256/:sha256
- /public-node/local-data-drop/proof/:sha256.json

## Policy

This is operator-local import only.

- public upload: false
- operator local import only: true
- public read only: true
- trusted as network truth: false

## Next layer: Data Weight Record v1

Marker: `VOID_PUBLIC_NODE_DATA_WEIGHT_RECORD_POINTER_DOC_V1`

Local Data Drop proves that an operator can place data into the node runtime and expose it through public read-only routes.

Data Weight Record v1 is the next layer after storage. It gives VOID a public schema for ranking stored data by verification, freshness, duplicate status, suspicion state, tombstone state, storage tier, AI visibility, trust score, and promotion eligibility.

Public route:

`/public-node/data-weight-record.json`

Doc:

`docs/public/public-node-data-weight-record.md`

Policy boundary: persistent does not mean equal priority. VOID can preserve data without treating every object as equally trusted, equally fresh, equally visible to AI, or equally eligible for promotion.
