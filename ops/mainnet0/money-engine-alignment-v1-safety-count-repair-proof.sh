#!/usr/bin/env bash
set -euo pipefail

echo "VOID_MONEY_ENGINE_ALIGNMENT_V1_SAFETY_COUNT_REPAIR_PROOF_BEGIN"

doc="docs/public/public-surface-safety-index-v1.md"
proof="ops/mainnet0/public-surface-safety-index-v1-proof.sh"
src="src/index.ts"

grep -F "VOID_MONEY_ENGINE_ALIGNMENT_V1" "$src" >/dev/null
grep -F "/public-node/money-engine-v1.json" "$src" >/dev/null
grep -F "/public-node/money-engine-v1" "$src" >/dev/null

grep -F "public_literal_get_count=175" "$doc" >/dev/null
grep -F "public_literal_get_unique_count=175" "$doc" >/dev/null
grep -F "public_literal_get_count=175" "$proof" >/dev/null
grep -F "public_literal_get_unique_count=175" "$proof" >/dev/null

if grep -F "public_literal_get_count=171" "$doc" "$proof" >/dev/null; then
  echo "STOP: stale public_literal_get_count=171 remains."
  exit 1
fi

if grep -F "public_literal_get_unique_count=171" "$doc" "$proof" >/dev/null; then
  echo "STOP: stale public_literal_get_unique_count=171 remains."
  exit 1
fi

if grep -E "app\\.(post|put|patch|delete)\\('/public-node/money-engine-v1" "$src" >/dev/null; then
  echo "STOP: money-engine route must remain GET-only."
  exit 1
fi

if grep -E "app\\.(post|put|patch|delete)\\('/public-node" "$src" >/dev/null; then
  echo "STOP: public-node mutation route detected."
  exit 1
fi

echo "VOID_MONEY_ENGINE_ALIGNMENT_V1_SAFETY_COUNT_REPAIR_ASSERT_GREEN"
echo "VOID_MONEY_ENGINE_ALIGNMENT_V1_SAFETY_COUNT_REPAIR_GREEN"
