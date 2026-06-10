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
