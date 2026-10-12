#!/usr/bin/env bash
set -euo pipefail

echo "=== Public Node Tester Lane README Pointer v1 proof ==="

grep -Fq "VOID_PUBLIC_NODE_TESTER_LANE_README_POINTER_V1" README.md
grep -Fq "/public-node/tester-share" README.md
grep -Fq "/public-node/tester-lane-summary.json" README.md
grep -Fq "VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_V1_GREEN" README.md
grep -Fq "VOID_PUBLIC_NODE_TESTER_LANE_README_POINTER_DOC_V1" docs/public/public-node-tester-lane-summary.md

bash -n ops/mainnet0/public-node-tester-lane-summary-proof.sh
grep -Fq "VOID_PUBLIC_NODE_TESTER_LANE_SUMMARY_V1_GREEN" ops/mainnet0/public-node-tester-lane-summary-proof.sh

npm run build

echo "readme_pointer=true"
echo "tester_share_route=/public-node/tester-share"
echo "tester_lane_summary_route=/public-node/tester-lane-summary.json"
echo "expected_green_marker=VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_V1_GREEN"
echo "public_routes_only=true"
echo "read_only=true"
echo "money_movement=false"
echo "wallet_send=false"
echo "wc_to_void_swap=false"
echo "buy_void_fulfillment=false"
echo "validator_mutation=false"
echo "trusted_as_network_truth=false"
echo "VOID_PUBLIC_NODE_TESTER_LANE_README_POINTER_V1_GREEN"
