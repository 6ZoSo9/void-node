#!/usr/bin/env bash
set -euo pipefail

echo "VOID_WC_TO_VOID_PUBLIC_SMOKE_VERIFY_PACK_MARKER_FIX_V1_PROOF_BEGIN"

good_marker="VOID_WC_TO_VOID_PUBLIC_REVIEWER_ONE_COMMAND_VERIFY_PACK_V1"
bad_marker="VOID_WC_TO_VOID_PUBLIC_REVIEWER_VERIFY_PACK_RUNTIME_V1"
good_route="/public-node/wc-to-void/public-reviewer-one-command-verify-pack-v1"

script="ops/mainnet0/wc-to-void-settlement-complete-public-smoke-v1.sh"
proof="ops/mainnet0/wc-to-void-settlement-complete-public-smoke-v1-proof.sh"

test -x "$script"
test -x "$proof"

grep -F "$good_marker" "$script" >/dev/null
grep -F "$good_marker" "$proof" >/dev/null
grep -F "$good_route.json" "$script" >/dev/null
grep -F "$good_route.json" "$proof" >/dev/null

if grep -F "$bad_marker" "$script" "$proof" >/dev/null; then
  echo "STOP: stale verify-pack runtime marker remains in smoke files."
  exit 1
fi

if grep -F "/public-node/wc-to-void/public-reviewer-verify-pack-v1" "$script" "$proof" >/dev/null; then
  echo "STOP: stale 404 reviewer route remains in smoke files."
  exit 1
fi

if grep -E "curl .* -X *(POST|PUT|PATCH|DELETE)|curl .*--request *(POST|PUT|PATCH|DELETE)" "$script" >/dev/null; then
  echo "STOP: smoke script must remain GET-only."
  exit 1
fi

if grep -E "app\\.(post|put|patch|delete)\\('/public-node" src/index.ts >/dev/null; then
  echo "STOP: public-node mutation route detected."
  exit 1
fi

echo "VOID_WC_TO_VOID_PUBLIC_SMOKE_VERIFY_PACK_MARKER_FIX_V1_ASSERT_GREEN"
echo "VOID_WC_TO_VOID_PUBLIC_SMOKE_VERIFY_PACK_MARKER_FIX_V1_PROOF_GREEN"
