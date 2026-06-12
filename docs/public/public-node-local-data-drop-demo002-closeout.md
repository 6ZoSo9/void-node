# Public Node Local Data Drop Demo 002 Closeout

Marker: VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_CLOSEOUT_CARD_V1

Status: green

Checkpoint:

       73a08335
       ckpt-public-node-local-data-drop-demo002-verify-evidence-pack-pointer-green-20260612-225042

Demo object:

       live-import-demo-002.txt
       sha256=264e0d3832fbad60f3a5bd574794148a0db313583717c4b6bedb94e7db75e871

## What this proves

Demo 002 proves the public node can expose a local data-drop object through read-only public routes, let a tester fetch and verify it, create a receipt, import that receipt locally, inspect intake state, package the evidence, and verify the packaged evidence offline.

Compact chain:

       public read
       -> tester smoke
       -> tester receipt
       -> offline receipt verifier
       -> local receipt intake
       -> intake status
       -> full evidence roundtrip
       -> shareable evidence pack
       -> offline evidence-pack verifier
       -> public docs / tester handoff pointers

## Green markers

       VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_TESTER_SMOKE_V1_GREEN
       VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_VERIFY_SMOKE_RECEIPT_V1_GREEN
       VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_SMOKE_RECEIPT_INTAKE_V1_IMPORTED
       VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_RECEIPT_INTAKE_STATUS_V1_GREEN=true
       VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_EVIDENCE_ROUNDTRIP_V1_GREEN
       VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_EVIDENCE_PACK_V1_GREEN
       VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_EVIDENCE_PACK_PROOF_V1_GREEN
       VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_VERIFY_EVIDENCE_PACK_V1_GREEN
       VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_VERIFY_EVIDENCE_PACK_PROOF_V1_GREEN
       VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_VERIFY_EVIDENCE_PACK_POINTER_PROOF_V1_GREEN

## Public read routes

       /public-node/local-data-drop/live-import-demo-002.txt
       /public-node/local-data-drop/by-sha256/264e0d3832fbad60f3a5bd574794148a0db313583717c4b6bedb94e7db75e871
       /public-node/local-data-drop/proof/264e0d3832fbad60f3a5bd574794148a0db313583717c4b6bedb94e7db75e871.json

## Operator commands

Create a shareable evidence pack:

       DATA_DIR=.runtime/mainnet0 \
         ops/mainnet0/public-node-local-data-drop-demo002-evidence-pack.sh

Verify a received evidence pack offline:

       ops/mainnet0/public-node-local-data-drop-demo002-verify-evidence-pack.sh \
         /path/to/demo002-evidence-pack.tar.gz

Inspect local receipt intake status:

       DATA_DIR=.runtime/mainnet0 \
         ops/mainnet0/public-node-local-data-drop-demo002-receipt-intake-status.sh

## Trust boundary

Expected preserved flags:

       offline_verified=true
       network_fetch_during_import=false
       network_fetch=false
       trusted_as_network_truth=false

Policy: Demo 002 evidence is operator-local proof material. It is useful for public-node testing and handoff, but importing or verifying receipts does not automatically promote local evidence into network truth.

## Safety boundary

Expected safe flags:

       public_routes_only=true
       read_only=true
       mutation=false
       money_movement=false
       wallet_send=false
       validator_mutation=false

This lane is public-read/tester-evidence only. It does not move money, send wallet transactions, mutate validator state, or make receipt evidence authoritative by default.
