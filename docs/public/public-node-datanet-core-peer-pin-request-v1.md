# VOID DataNet Core Peer Pin Request v1

Marker: `VOID_DATANET_CORE_PEER_PIN_REQUEST_DOC_V1`

Policy route marker:

- `VOID_DATANET_CORE_PEER_PIN_REQUEST_POLICY_V1`

Tool marker:

- `VOID_DATANET_CORE_PEER_PIN_REQUEST_V1`

Proof marker:

- `VOID_DATANET_CORE_PEER_PIN_REQUEST_PROOF_V1_GREEN`

## Purpose

DataNet Core Peer Pin Request v1 creates a public-safe request packet asking an operator-reviewed node to pin or mirror a dataset advertised by a peer availability index.

This is not public mutation.

## Public route

```txt
GET /public-node/datanet/core-peer-pin-request-policy-v1.json
Tool
PEER_BASE=http://PEER_NODE:4100 SELECT_MODE=auto ops/mainnet0/datanet-core-peer-pin-request-v1.sh
Safety boundary
request packet only
public POST unsupported
automatic mirror unsupported
automatic pin unsupported
operator review required
no public mutation
no ledger write
no Work Credit award
no private path disclosure
Local proof
BASE=http://127.0.0.1:4100 ops/mainnet0/datanet-core-peer-pin-request-v1-proof.sh

