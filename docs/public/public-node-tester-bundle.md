# VOID Public Node Tester Bundle <!-- VOID_PUBLIC_NODE_TESTER_BUNDLE_DOC_V1 -->

Single outside-tester bundle for a VOID public node.

## Start here

    /public-node

## Bundle

    /public-node/tester-bundle.json

## Included public routes

    /public-node/quickstart.json
    /public-node/tester-handoff.json
    /public-node/tester-result-receipt.json
    /public-node/public-exposure-smoke-pack.json
    /public-node/route-index.json
    /proofs

## Smoke command

Replace the base URL with the public node URL.

    PUBLIC_NODE_BASE=https://your-domain.example
    for p in /public-node /public-node/tester-bundle.json /public-node/quickstart.json /public-node/tester-handoff.json /public-node/tester-result-receipt.json /public-node/public-exposure-smoke-pack.json /public-node/route-index.json /proofs; do
      curl -fsS "$PUBLIC_NODE_BASE$p" >/dev/null && echo "ok $p"
    done

## Expected success

The command should print `ok` for every public route.

## Safety boundary

This bundle checks public routes only.

It does not touch private APIs, wallet sends, WC to VOID swaps, Buy VOID fulfillment, validator mutation, money movement, or proof mutation.
## Proven live serving posture <!-- VOID_PUBLIC_NODE_TESTER_BUNDLE_LIVE_RUNTIME_QUARANTINE_POINTER_V1 -->

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
