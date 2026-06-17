# VOID DataNet Core Mirror Serve v1

Marker: `VOID_DATANET_CORE_MIRROR_SERVE_DOC_V1`

Route markers:

- `VOID_DATANET_CORE_MIRROR_SERVE_REGISTRY_V1`
- `VOID_DATANET_CORE_MIRROR_SERVE_RECEIPT_V1`
- `VOID_DATANET_CORE_MIRROR_OBJECT_FETCH_V1`

Proof marker:

- `VOID_DATANET_CORE_MIRROR_SERVE_PROOF_V1_GREEN`

## Purpose

DataNet Core Mirror Serve v1 proves that a node can serve/prove its local mirrored DataNet copy.

This moves the core lane from:

`publish -> fetch -> mirror -> verify`

to:

`publish -> fetch -> mirror -> verify -> serve mirrored availability`

## Public routes

```txt
GET /public-node/datanet/core-mirror/registry-v1.json
GET /public-node/datanet/core-mirror/:mirror_node_label/:dataset_id/receipt-v1.json
GET /public-node/datanet/core-mirror/:mirror_node_label/:dataset_id/object/:sha256
Safety boundary
read-only public routes
no public upload
no public shell execution
no public mutation
no ledger write
no Work Credit award
no absolute path disclosure
no operator home path disclosure
no local mirror root disclosure
Local proof
BASE=http://127.0.0.1:4100 ops/mainnet0/public-node-datanet-core-mirror-serve-v1-proof.sh

