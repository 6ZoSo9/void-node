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

## Receipt ledger <!-- VOID_PUBLIC_NODE_LOCAL_DATA_DROP_RECEIPT_LEDGER_DOC_V1 -->

Each operator-local import writes a receipt JSON file:

    DATA_DIR/public-node/local-data-drop/receipts/<objectId>.json

Receipt marker:

    VOID_PUBLIC_NODE_LOCAL_DATA_DROP_RECEIPT_LEDGER_V1

The public index exposes receipt metadata and whether the receipt matches the currently served object bytes.

## Content-address fetch <!-- VOID_PUBLIC_NODE_LOCAL_DATA_DROP_CONTENT_ADDRESS_DOC_V1 -->

Objects can also be fetched by SHA-256:

    /public-node/local-data-drop/by-sha256/:sha256

This lets clients retrieve the object by content hash instead of object ID.

## Public object proof <!-- VOID_PUBLIC_NODE_LOCAL_DATA_DROP_OBJECT_PROOF_DOC_V1 -->

Clients can fetch a JSON proof bundle by SHA-256:

    /public-node/local-data-drop/proof/:sha256.json

The proof includes object ID, byte size, SHA-256, object fetch URL, content-address fetch URL, receipt metadata, and whether the receipt matches the currently served object.

## Client verifier <!-- VOID_PUBLIC_NODE_LOCAL_DATA_DROP_VERIFY_OBJECT_DOC_V1 -->

Clients can verify a public object by SHA-256:

    ops/mainnet0/public-node-local-data-drop-verify-object.sh <base-url> <sha256>

The verifier fetches the proof JSON, fetches bytes by SHA-256, hashes the bytes locally, and confirms the proof/receipt/fetched object all agree.

## Manifest root <!-- VOID_PUBLIC_NODE_LOCAL_DATA_DROP_MANIFEST_DOC_V1 -->

The node exposes a deterministic public manifest of locally dropped objects:

    /public-node/local-data-drop/manifest.json

The manifest includes object IDs, byte sizes, SHA-256 hashes, receipt metadata, public fetch links, proof links, and a deterministic manifest root:

    VOID_PUBLIC_NODE_LOCAL_DATA_DROP_MANIFEST_ROOT_V1

This gives the public storage lane a verifiable state root over the currently served object set.

## Manifest verifier <!-- VOID_PUBLIC_NODE_LOCAL_DATA_DROP_VERIFY_MANIFEST_DOC_V1 -->

Clients can verify the public storage manifest and every listed object:

    ops/mainnet0/public-node-local-data-drop-verify-manifest.sh <base-url>

The verifier fetches the manifest, recomputes the manifest root, then chains through object proof and object-byte verification for each listed SHA-256.

## Multi-object manifest proof <!-- VOID_PUBLIC_NODE_LOCAL_DATA_DROP_MULTI_OBJECT_MANIFEST_DOC_V1 -->

The proof lane imports multiple deterministic local objects and verifies that:

- the public manifest lists the full served object set,
- the manifest root recomputes from the public root payload,
- every object has a valid receipt,
- every object has proof JSON,
- and the client manifest verifier chains through object-byte verification for each SHA-256.

Marker:

    VOID_PUBLIC_NODE_LOCAL_DATA_DROP_MULTI_OBJECT_MANIFEST_V1

## Import directory helper <!-- VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_DIR_DOC_V1 -->

The import directory helper lets an operator import a local folder into the public-node local data drop store.

Marker:

    VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_DIR_V1

The helper is operator-local only. It does not enable public uploads. It walks regular files in a source directory, converts relative paths into safe object ids, imports each file with the existing local data drop import helper, and exposes the resulting objects through the same public read-only index, manifest, content-address, proof, receipt, and verifier routes.
