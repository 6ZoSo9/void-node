# DataNet Chain-2050 receipt binding for peer reconstruction v1

Marker: `VOID_DATANET_CHAIN_PEER_RECONSTRUCTION_RECEIPT_V1`

Status: source-only evidence composition; operational HOLD.

This bridge composes the merged Chain-2050 commitment receipt verifier with
#1464's reference-only peer reconstruction planner without upgrading any
operational authority.

## Verified overlap

The bridge invokes
`verifyDatanetChain2050CommitmentReceiptV1` itself and requires its verified
observation to match the planner's module-validated reference commitment on
exactly six fields:

1. `chain_id`
2. `object_id`
3. `content_sha256`
4. `byte_length`
5. `commitment_transaction_hash`
6. `commitment_log_index`

A successful composition reports source-backed receipt/event membership,
receipt revalidation and canonical receipt-block identity.

## Deliberate non-binding

The receipt block is **not** a DataNet checkpoint. The bridge never derives or
overwrites:

- `checkpoint_height`
- `checkpoint_block_hash`
- `accepted_checkpoint_id`

Durable checkpoint binding, accepted-checkpoint membership, fork choice, peer
quorum and chain finality therefore remain false.

The underlying planner continues to return
`DATANET_RECONSTRUCTION_HOLD` with
`evidence_scope=UNVERIFIED_REFERENCE_INPUTS`. Its authority object is reused
unchanged, so reconstruction, publication, local-replica admission,
retirement, repair execution, network/filesystem action and chain/peer mutation
all remain unauthorized.

## Receipt ingress

Receipt evidence is accepted only as a plain, non-Proxy Node Buffer. The bridge
copies bytes before decoding and applies a 4 MiB envelope bound plus bounded
depth, node count, array cardinality, object keys and scalar bytes before the
receipt verifier is invoked. No network, filesystem, credential, wallet,
signing, transaction construction/broadcast or funds action is performed.

## Acceptance proof

`scripts/prove_void_datanet_chain_peer_reconstruction_receipt_v1.mjs` proves:

- a valid receipt binds only the six overlapping facts;
- receipt block height does not replace checkpoint height;
- a receipt/event mismatch remains HOLD;
- a valid receipt bound to a different commitment transaction remains HOLD;
- Proxy receipt input is rejected without executing Proxy traps;
- oversized receipt evidence is rejected before parsing;
- invalid reconstruction requests remain the original planner HOLD; and
- every #1464 operational authority flag remains false.
