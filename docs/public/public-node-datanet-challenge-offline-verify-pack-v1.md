# VOID Public Node DataNet Challenge Offline Verify Pack v1

Marker: VOID_DATANET_CHALLENGE_OFFLINE_VERIFY_PACK_DOC_V1

## Route

GET /public-node/datanet/challenge-offline-verify-pack-v1.json

## Purpose

This route exposes a copy/paste offline verifier pack for the DataNet Challenge v1 lane.

It lets an outside tester fetch and verify:
- the DataNet challenge packet
- the Demo 003 folder manifest
- the public route index

## Dataset

demo003-folder-fixture-v1

## Safety boundary

This pack is public read-only.

It does not:
- build filesystem paths from dataset_id
- mutate runtime state
- write a ledger entry
- award Work Credits
- move money
- send wallet funds
- mutate validator state

Expected safety flags:
- public_read_only=true
- bounded_read_existing_public_routes_only=true
- registry_lookup_only=true
- path_from_dataset_id=false
- filesystem_path_built_from_dataset_id=false
- mutation=false
- live_runtime_write=false
- ledger_write=false
- wc_credit_award=false

## Expected proof marker

VOID_DATANET_CHALLENGE_OFFLINE_VERIFY_PACK_PROOF_V1_GREEN

## Proof

ops/mainnet0/public-node-datanet-challenge-offline-verify-pack-v1-proof.sh
