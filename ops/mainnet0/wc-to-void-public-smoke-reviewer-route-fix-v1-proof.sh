#!/usr/bin/env bash
set -euo pipefail

echo "VOID_WC_TO_VOID_PUBLIC_SMOKE_REVIEWER_ROUTE_FIX_V1_PROOF_BEGIN"

good="/public-node/wc-to-void/public-reviewer-one-command-verify-pack-v1"
bad="/public-node/wc-to-void/public-reviewer-verify-pack-v1"

grep -F "$good" src/index.ts >/dev/null
grep -F "$good.json" src/index.ts >/dev/null

grep -F "$good" ops/mainnet0/wc-to-void-settlement-complete-public-smoke-v1.sh >/dev/null
grep -F "$good.json" ops/mainnet0/wc-to-void-settlement-complete-public-smoke-v1.sh >/dev/null

grep -F "$good" ops/mainnet0/wc-to-void-settlement-complete-public-smoke-v1-proof.sh >/dev/null
grep -F "$good.json" ops/mainnet0/wc-to-void-settlement-complete-public-smoke-v1-proof.sh >/dev/null

grep -F "$good" ops/mainnet0/wc-to-void-settlement-complete-dashboard-card-v1-proof.sh >/dev/null
grep -F "$good" ops/mainnet0/wc-to-void-settlement-complete-dashboard-card-runtime-v1-proof.sh >/dev/null

if grep -R "$bad" \
  src/index.ts \
  ops/mainnet0/wc-to-void-settlement-complete-public-smoke-v1.sh \
  ops/mainnet0/wc-to-void-settlement-complete-public-smoke-v1-proof.sh \
  ops/mainnet0/wc-to-void-settlement-complete-dashboard-card-v1-proof.sh \
  ops/mainnet0/wc-to-void-settlement-complete-dashboard-card-runtime-v1-proof.sh >/dev/null; then
  echo "STOP: stale 404 reviewer verify pack path remains."
  exit 1
fi

if grep -E "curl .* -X *(POST|PUT|PATCH|DELETE)|curl .*--request *(POST|PUT|PATCH|DELETE)" ops/mainnet0/wc-to-void-settlement-complete-public-smoke-v1.sh >/dev/null; then
  echo "STOP: smoke script must remain GET-only."
  exit 1
fi

if grep -E "app\\.(post|put|patch|delete)\\('/public-node" src/index.ts >/dev/null; then
  echo "STOP: public-node mutation route detected."
  exit 1
fi

echo "VOID_WC_TO_VOID_PUBLIC_SMOKE_REVIEWER_ROUTE_FIX_V1_ASSERT_GREEN"
echo "VOID_WC_TO_VOID_PUBLIC_SMOKE_REVIEWER_ROUTE_FIX_V1_PROOF_GREEN"
