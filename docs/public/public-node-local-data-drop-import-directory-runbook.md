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
