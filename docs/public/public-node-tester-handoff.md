# VOID Public Node Tester Handoff <!-- VOID_PUBLIC_NODE_TESTER_HANDOFF_DOC_V1 -->

Send this to someone testing a VOID public node.

## Open first

    /public-node

## Machine-readable handoff

    /public-node/tester-handoff.json

## Quickstart

    /public-node/quickstart.json

## Smoke command

Replace the base URL with the node URL you were given.

    PUBLIC_NODE_BASE=https://your-domain.example
    for p in /public-node /public-node/quickstart.json /public-node/tester-handoff.json /public-node/route-index.json /public-node/external-base-url.json /public-node/public-exposure-smoke-pack.json /proofs; do
      curl -fsS "$PUBLIC_NODE_BASE$p" >/dev/null && echo "ok $p"
    done

## Expected success

The command should print `ok` for every public route.

## What this does not test

This does not touch private APIs, wallet sends, WC to VOID swaps, Buy VOID fulfillment, validator mutation, money movement, or proof mutation.

## Report back

    node_url=
    smoke_result=
    browser_result=
    notes=
## Proven live serving posture <!-- VOID_PUBLIC_NODE_TESTER_HANDOFF_LIVE_RUNTIME_QUARANTINE_POINTER_V1 -->

Current public-node Local Data Drop testing should use the quarantined live serving posture.

Checkpoint:

    08383516
    ckpt-public-node-live-runtime-quarantine-green-20260612-210820

Status pointer:

    4a49a8c9
    ckpt-public-node-live-runtime-quarantine-status-pointer-green-20260612-211330

Proof marker:

    VOID_PUBLIC_NODE_LIVE_RUNTIME_QUARANTINE_PROOF_V1_GREEN

Demo 002 public object proof:

    /public-node/local-data-drop/proof/264e0d3832fbad60f3a5bd574794148a0db313583717c4b6bedb94e7db75e871.json

This means the tester should see public HTTP routes stay responsive while the operator keeps hot runtime wrapper/txroot/saveblock/forensics/drift families quarantined and keeps legacy `void-node.service` inactive/disabled.
## Demo 002 one-command tester smoke <!-- VOID_PUBLIC_NODE_TESTER_HANDOFF_DEMO002_SMOKE_POINTER_V1 -->

Testers can verify the live Local Data Drop Demo 002 object, content-address route, and proof JSON with one command:

    PUBLIC_NODE_BASE=https://your-node.example \
      ops/mainnet0/public-node-local-data-drop-demo002-tester-smoke.sh

Local operator check:

    PUBLIC_NODE_BASE=http://127.0.0.1:4100 \
      ops/mainnet0/public-node-local-data-drop-demo002-tester-smoke.sh

Committed checkpoint:

    1a53883a
    ckpt-public-node-local-data-drop-demo002-tester-smoke-green-20260612-212707

Proof marker:

    VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_TESTER_SMOKE_PROOF_V1_GREEN

Smoke marker:

    VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_TESTER_SMOKE_V1_GREEN

Verified object:

    live-import-demo-002.txt
    264e0d3832fbad60f3a5bd574794148a0db313583717c4b6bedb94e7db75e871

The smoke is public-route-only, read-only, and does not touch wallet sends, money movement, WC swaps, Buy VOID fulfillment, validator mutation, or proof mutation.

## Tester handoff Demo 002 receipt verification <!-- VOID_PUBLIC_NODE_TESTER_HANDOFF_DEMO002_OFFLINE_RECEIPT_VERIFY_POINTER_V1 -->

Demo 002 now has a two-step tester receipt loop:

1. Tester runs the public read-only smoke:

       PUBLIC_NODE_BASE=https://your-node.example \
         ops/mainnet0/public-node-local-data-drop-demo002-tester-smoke.sh

2. Tester sends back the generated receipt:

       demo002-tester-smoke-receipt.json

3. Operator verifies the receipt offline without fetching the tester's node again:

       ops/mainnet0/public-node-local-data-drop-demo002-verify-smoke-receipt.sh \
         /path/to/demo002-tester-smoke-receipt.json

Expected verifier marker:

       VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_VERIFY_SMOKE_RECEIPT_V1_GREEN

Receipt marker:

       VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_TESTER_SMOKE_RECEIPT_V1

Proof marker:

       VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_VERIFY_SMOKE_RECEIPT_PROOF_V1_GREEN

Checkpoint:

       8f6b623e
       ckpt-public-node-local-data-drop-demo002-offline-receipt-verify-green-20260612-214402

Demo object:

       live-import-demo-002.txt
       sha256=264e0d3832fbad60f3a5bd574794148a0db313583717c4b6bedb94e7db75e871

Safety boundary: public routes only, read-only, no mutation, no wallet send, no money movement, no validator mutation.

## Tester handoff Demo 002 receipt intake <!-- VOID_PUBLIC_NODE_TESTER_HANDOFF_DEMO002_SMOKE_RECEIPT_INTAKE_POINTER_V1 -->

Demo 002 tester receipts can now be collected as local operator evidence.

Tester flow:

       PUBLIC_NODE_BASE=https://your-node.example \
         ops/mainnet0/public-node-local-data-drop-demo002-tester-smoke.sh

Tester sends back:

       demo002-tester-smoke-receipt.json

Operator verifies and imports the receipt:

       DATA_DIR=.runtime/mainnet0 \
         ops/mainnet0/public-node-local-data-drop-demo002-import-smoke-receipt.sh \
         /path/to/demo002-tester-smoke-receipt.json

The import helper first verifies the receipt offline using:

       ops/mainnet0/public-node-local-data-drop-demo002-verify-smoke-receipt.sh

Then it writes:

       .runtime/mainnet0/public-node/local-data-drop-demo002-tester-receipts/latest.json
       .runtime/mainnet0/public-node/local-data-drop-demo002-tester-receipts/archive/demo002-tester-smoke-receipt-*.json

Expected import marker:

       VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_SMOKE_RECEIPT_INTAKE_V1_IMPORTED

Expected proof marker:

       VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_SMOKE_RECEIPT_INTAKE_PROOF_V1_GREEN

Checkpoint:

       93d3402b
       ckpt-public-node-local-data-drop-demo002-smoke-receipt-intake-green-20260612-215003

Demo object:

       live-import-demo-002.txt
       sha256=264e0d3832fbad60f3a5bd574794148a0db313583717c4b6bedb94e7db75e871

Policy: the imported receipt is operator-local evidence, not automatic network truth. It records offline_verified=true, network_fetch_during_import=false, and trusted_as_network_truth=false.

