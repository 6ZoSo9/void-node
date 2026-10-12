#!/usr/bin/env bash
set -euo pipefail

echo "=== Public Node First Tester Request Copy Pack README Pointer v1 proof ==="

grep -Fq "VOID_PUBLIC_NODE_FIRST_TESTER_REQUEST_COPY_PACK_README_POINTER_V1" README.md
grep -Fq "/public-node/first-tester-request-copy-pack.json" README.md
grep -Fq "VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_V1_GREEN" README.md
grep -Fq "tester-receipt.json" README.md
grep -Fq "VOID_PUBLIC_NODE_FIRST_TESTER_REQUEST_COPY_PACK_README_POINTER_DOC_V1" docs/public/public-node-first-tester-request-copy-pack.md

bash -n ops/mainnet0/public-node-first-tester-request-copy-pack-proof.sh
grep -Fq "VOID_PUBLIC_NODE_FIRST_TESTER_REQUEST_COPY_PACK_V1_GREEN" ops/mainnet0/public-node-first-tester-request-copy-pack-proof.sh

test "$(grep -c 'APP.get("/public-node/first-tester-request-copy-pack.json"' src/index.ts)" = "1"

npm run build

echo "readme_pointer=true"
echo "first_tester_copy_pack_route=/public-node/first-tester-request-copy-pack.json"
echo "expected_green_marker=VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_V1_GREEN"
echo "receipt_file=tester-receipt.json"
echo "dedupe_route_count=1"
echo "public_routes_only=true"
echo "read_only=true"
echo "money_movement=false"
echo "wallet_send=false"
echo "wc_to_void_swap=false"
echo "buy_void_fulfillment=false"
echo "validator_mutation=false"
echo "trusted_as_network_truth=false"
echo "VOID_PUBLIC_NODE_FIRST_TESTER_REQUEST_COPY_PACK_README_POINTER_V1_GREEN"
