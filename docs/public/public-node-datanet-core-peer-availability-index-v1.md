# VOID DataNet Core Peer Availability Index v1

Marker: `VOID_DATANET_CORE_PEER_AVAILABILITY_INDEX_DOC_V1`

Route marker:

- `VOID_DATANET_CORE_PEER_AVAILABILITY_INDEX_V1`

Proof marker:

- `VOID_DATANET_CORE_PEER_AVAILABILITY_INDEX_PROOF_V1_GREEN`

## Purpose

DataNet Core Peer Availability Index v1 exposes a public-safe summary of what this node can currently serve.

It includes:

- operator-published datasets,
- locally mirrored datasets,
- object counts,
- total bytes,
- manifest hashes,
- content roots,
- mirror receipt hashes,
- serve capability flags.

## Public route

```txt
GET /public-node/datanet/core-peer-availability-index-v1.json
Safety boundary
read-only public route
no public upload
no public shell execution
no public mutation
no ledger write
no Work Credit award
no absolute path disclosure
no operator home path disclosure
no local storage root disclosure
Local proof
BASE=http://127.0.0.1:4100 ops/mainnet0/public-node-datanet-core-peer-availability-index-v1-proof.sh
Core direction

This turns the DataNet core lane into discoverable peer availability:

publish -> mirror -> serve -> advertise availability -> verify from peer

