#!/usr/bin/env bash
set -euo pipefail

echo "VOID_MONEY_ENGINE_ALIGNMENT_V1_PROOF_BEGIN"

src="src/index.ts"

grep -F "VOID_MONEY_ENGINE_ALIGNMENT_V1" "$src" >/dev/null
grep -F 'app.get("/public-node/money-engine-v1.json"' "$src" >/dev/null
grep -F 'app.get("/public-node/money-engine-v1"' "$src" >/dev/null

grep -F "USDC/VOID pair" "$src" >/dev/null
grep -F "DataNet" "$src" >/dev/null
grep -F "Work Credits" "$src" >/dev/null
grep -F "money_engine_alignment_ready" "$src" >/dev/null
grep -F "money flywheel" "$src" >/dev/null

grep -F "not donation-first" "$src" >/dev/null
grep -F "not reward faucet" "$src" >/dev/null
grep -F "not autonomous earning" "$src" >/dev/null
grep -F "not public mutation access" "$src" >/dev/null

grep -F "USDC/VOID pair readiness surface" "$src" >/dev/null
grep -F "DataNet paid job intake surface" "$src" >/dev/null
grep -F "paid DataNet receipt fixture" "$src" >/dev/null
grep -F "repeat WC to VOID settlement proof" "$src" >/dev/null

grep -F "/public-node/wc-to-void/settlement-evidence-final-public-index-v1" "$src" >/dev/null
grep -F "/public-node/wc-to-void/public-reviewer-one-command-verify-pack-v1" "$src" >/dev/null
grep -F "/public-node/wc-to-void/redacted-settlement-receipt-v1" "$src" >/dev/null
grep -F "/public-node/funding" "$src" >/dev/null
grep -F "/buy-void" "$src" >/dev/null

grep -F "0xaccef593ae1cab3f99ff786a26913b0d873ee789dfb96056007dd9dab9f3e717" "$src" >/dev/null

if grep -E "app\\.(post|put|patch|delete)\\('/public-node/money-engine-v1" "$src" >/dev/null; then
  echo "STOP: money engine route must remain GET-only."
  exit 1
fi

if grep -E "app\\.(post|put|patch|delete)\\('/public-node" "$src" >/dev/null; then
  echo "STOP: public-node mutation route detected."
  exit 1
fi

echo "VOID_MONEY_ENGINE_ALIGNMENT_V1_ASSERT_GREEN"
echo "VOID_MONEY_ENGINE_ALIGNMENT_V1_GREEN"
