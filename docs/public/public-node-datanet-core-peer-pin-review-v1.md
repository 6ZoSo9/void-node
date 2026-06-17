# VOID DataNet Core Peer Pin Review v1

Marker: `VOID_DATANET_CORE_PEER_PIN_REVIEW_DOC_V1`

Tool marker:

- `VOID_DATANET_CORE_PEER_PIN_REVIEW_V1`

Proof marker:

- `VOID_DATANET_CORE_PEER_PIN_REVIEW_PROOF_V1_GREEN`

## Purpose

DataNet Core Peer Pin Review v1 reviews a peer pin request packet before any operator approval or mirror/pin execution.

It verifies:

- request marker/schema,
- request ID hash,
- request safety flags,
- requested dataset metadata,
- advertised peer content via Peer Select Verify,
- public-safe review packet output.

## Safety boundary

- operator review required
- operator approval not recorded
- mirror not executed
- pin not executed
- no public mutation
- no ledger write
- no Work Credit award
- no private path disclosure

## Local proof

```bash
BASE=http://127.0.0.1:4100 ops/mainnet0/datanet-core-peer-pin-review-v1-proof.sh

