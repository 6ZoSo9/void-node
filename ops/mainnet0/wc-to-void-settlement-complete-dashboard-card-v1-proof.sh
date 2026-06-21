#!/usr/bin/env bash
set -euo pipefail

echo "VOID_WC_TO_VOID_SETTLEMENT_COMPLETE_DASHBOARD_CARD_V1_PROOF_BEGIN"

src="src/index.ts"
marker="VOID_WC_TO_VOID_SETTLEMENT_COMPLETE_DASHBOARD_CARD_V1"
tx="0xaccef593ae1cab3f99ff786a26913b0d873ee789dfb96056007dd9dab9f3e717"

test -f "$src"

grep -F "$marker" "$src" >/dev/null
grep -F "WC → VOID Settlement Complete" "$src" >/dev/null
grep -F "sealed_live_index_ready" "$src" >/dev/null
grep -F "$tx" "$src" >/dev/null
grep -F "/public-node/wc-to-void/settlement-evidence-final-public-index-v1" "$src" >/dev/null
grep -F "/public-node/wc-to-void/settlement-evidence-final-public-index-v1.json" "$src" >/dev/null
grep -F "/public-node/wc-to-void/public-reviewer-verify-pack-v1" "$src" >/dev/null

if grep -E "app\\.(post|put|patch|delete)\\('/public-node" "$src" >/dev/null; then
  echo "STOP: public-node mutation route detected."
  exit 1
fi

echo "VOID_WC_TO_VOID_SETTLEMENT_COMPLETE_DASHBOARD_CARD_V1_ASSERT_GREEN"
echo "VOID_WC_TO_VOID_SETTLEMENT_COMPLETE_DASHBOARD_CARD_V1_PROOF_GREEN"
