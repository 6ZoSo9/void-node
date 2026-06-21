#!/usr/bin/env bash
set -euo pipefail

echo "VOID_MONEY_ENGINE_ALIGNMENT_V1_SAFETY_REPAIR_PROOF_BEGIN"

src="src/index.ts"
safety="ops/mainnet0/public-surface-safety-index-v1-proof.sh"

grep -F "VOID_MONEY_ENGINE_ALIGNMENT_V1" "$src" >/dev/null
grep -F "/public-node/money-engine-v1.json" "$src" >/dev/null
grep -F "/public-node/money-engine-v1" "$src" >/dev/null

grep -F "VOID_MONEY_ENGINE_ALIGNMENT_V1" "$safety" >/dev/null
grep -F "/public-node/money-engine-v1.json" "$safety" >/dev/null
grep -F "/public-node/money-engine-v1" "$safety" >/dev/null

if grep -E "app\\.(post|put|patch|delete)\\('/public-node/money-engine-v1" "$src" >/dev/null; then
  echo "STOP: money-engine route must remain GET-only."
  exit 1
fi

if grep -E "app\\.(post|put|patch|delete)\\('/public-node" "$src" >/dev/null; then
  echo "STOP: public-node mutation route detected."
  exit 1
fi

echo "VOID_MONEY_ENGINE_ALIGNMENT_V1_SAFETY_REPAIR_ASSERT_GREEN"
echo "VOID_MONEY_ENGINE_ALIGNMENT_V1_SAFETY_REPAIR_GREEN"
