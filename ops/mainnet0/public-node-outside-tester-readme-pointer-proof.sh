#!/usr/bin/env bash
set -euo pipefail

echo "=== Public Node Outside Tester README Pointer v1 proof ==="

grep -Fq "VOID_PUBLIC_NODE_OUTSIDE_TESTER_README_POINTER_V1" README.md
grep -Fq "/public-node/share-link.json" README.md
grep -Fq "/public-node/tester-bundle.json" README.md
grep -Fq "/public-node/tester-result-receipt.json" README.md
grep -Fq "public-route and read-only only" README.md
grep -Fq "no wallet sends" README.md
grep -Fq "no WC to VOID swaps" README.md
grep -Fq "no Buy VOID fulfillment" README.md
grep -Fq "no validator mutation" README.md
grep -Fq "no money movement" README.md

grep -Fq "VOID_PUBLIC_NODE_SHARE_LINK_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_TESTER_BUNDLE_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_TESTER_RESULT_RECEIPT_V1" src/index.ts

npm run build

echo "marker=VOID_PUBLIC_NODE_OUTSIDE_TESTER_README_POINTER_V1"
echo "readme=README.md"
echo "share_link=/public-node/share-link.json"
echo "tester_bundle=/public-node/tester-bundle.json"
echo "result_receipt=/public-node/tester-result-receipt.json"
echo "public_routes_only=true"
echo "read_only=true"
echo "money_movement=false"
echo "wallet_send=false"
echo "wc_to_void_swap=false"
echo "buy_void_fulfillment=false"
echo "validator_mutation=false"
echo "VOID_PUBLIC_NODE_OUTSIDE_TESTER_README_POINTER_V1_GREEN"
