#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/dev/void-node" || exit 1

echo "=== participant Run Once WC delta proof v2 ==="
echo "mode=isolated_verified_receipt_acceptance_runtime"
echo "live_node_mutation=false"

npx tsx scripts/prove_wc_verified_receipt_acceptance_v1.ts
npx tsx scripts/prove_economic_activation_wc_capability_runtime_v1.ts

echo "VOID_PARTICIPANT_RUN_ONCE_WC_DELTA_PROOF_V2_GREEN"
