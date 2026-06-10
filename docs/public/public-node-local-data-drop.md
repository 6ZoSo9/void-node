# VOID Public Node Local Data Drop <!-- VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DOC_V1 -->

Operator-local storage lane for serving files from a VOID public node.

## Index route

    /public-node/local-data-drop.json

## Object route

    /public-node/local-data-drop/:objectId

## Import helper

    DATA_DIR=.runtime/mainnet0 ops/mainnet0/public-node-local-data-drop-import.sh /path/to/file [object-id]

## Runtime storage path

    DATA_DIR/public-node/local-data-drop/objects

## Purpose

This is a simple public-node storage/serve lane:

1. Operator imports a local file.
2. Node indexes the file.
3. Public clients can fetch the file read-only.

## Safety boundary

There is no public upload endpoint.

This lane is operator-local import only and public-read-only fetch. It does not move money, send wallet transactions, execute WC to VOID swaps, fulfill Buy VOID requests, mutate validators, or treat dropped files as network truth.
