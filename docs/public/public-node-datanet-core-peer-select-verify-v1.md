# VOID DataNet Core Peer Select Verify v1

Marker: `VOID_DATANET_CORE_PEER_SELECT_VERIFY_DOC_V1`

Tool marker:

- `VOID_DATANET_CORE_PEER_SELECT_VERIFY_V1`

Proof marker:

- `VOID_DATANET_CORE_PEER_SELECT_VERIFY_PROOF_V1_GREEN`

## Purpose

DataNet Core Peer Select Verify v1 consumes a peer availability index, selects an advertised dataset entry, and independently verifies that the peer can serve the advertised content.

It supports:

- operator-published availability entries,
- mirrored availability entries,
- manifest verification,
- mirror receipt verification,
- object fetch by SHA-256,
- byte/hash verification,
- public-safe verification receipts.

## Local proof

```bash
BASE=http://127.0.0.1:4100 ops/mainnet0/datanet-core-peer-select-verify-v1-proof.sh
Cross-box use
PEER_BASE=http://PEER_NODE:4100 SELECT_MODE=auto ops/mainnet0/datanet-core-peer-select-verify-v1.sh
Safety boundary
no public mutation
no ledger write
no Work Credit award
no private path disclosure in receipt
no shell execution from peer data
peer data is selected only from public-safe advertised availability
