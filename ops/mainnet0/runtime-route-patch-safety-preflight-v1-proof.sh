#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

doc="docs/public/runtime-route-patch-safety-preflight-v1.md"
preflight="ops/mainnet0/runtime-route-patch-safety-preflight-v1.sh"

grep -F "VOID_RUNTIME_ROUTE_PATCH_SAFETY_PREFLIGHT_DOC_V1" "$doc" >/dev/null
grep -F "Funding Public Proof Pack v1 runtime route attempt was aborted" "$doc" >/dev/null
grep -F "VOID_FUNDING_PUBLIC_PROOF_PACK_ABORT_RECOVERY_SEAL_V1_GREEN" "$doc" >/dev/null
grep -F "VOID_FUNDING_SAFE_PUBLIC_PACKET_V1_GREEN" "$doc" >/dev/null
grep -F "VOID_FUNDING_LANE_FINAL_CLOSEOUT_SEAL_V1_GREEN" "$doc" >/dev/null

grep -F "runtime_patch_required=false" "$doc" >/dev/null
grep -F "docs_proof_only_preferred=true" "$doc" >/dev/null
grep -F "source_diff_required=true" "$doc" >/dev/null
grep -F "build_before_commit_required=true" "$doc" >/dev/null
grep -F "duplicate_route_check_required=true" "$doc" >/dev/null
grep -F "abort_recovery_required_after_syntax_failure=true" "$doc" >/dev/null
grep -F "public_mutation_default=false" "$doc" >/dev/null
grep -F "secrets_public=false" "$doc" >/dev/null
grep -F "wallet_send_now=false" "$doc" >/dev/null
grep -F "money_movement_now=false" "$doc" >/dev/null

test -x "$preflight"
grep -F "VOID_RUNTIME_ROUTE_PATCH_SAFETY_PREFLIGHT_V1_BEGIN" "$preflight" >/dev/null
grep -F "VOID_RUNTIME_ROUTE_PATCH_SAFETY_PREFLIGHT_V1_GREEN" "$preflight" >/dev/null
grep -F 'APP.get("/public-node/funding-proof-pack-v1.json"' "$preflight" >/dev/null
grep -F 'APP.get("/public-node/funding-safe-public-packet-v1.json"' "$preflight" >/dev/null
grep -F "VOID_FUNDING_GATEWAY_CARD_UI_V1" "$preflight" >/dev/null
grep -F "VOID_FUNDING_PATH_TIGHTEN_V1" "$preflight" >/dev/null
grep -F "VOID_PUBLIC_GATEWAY_TRIAD_SEAL_V1" "$preflight" >/dev/null

if grep -F 'APP.get("/public-node/funding-proof-pack-v1.json"' src/index.ts >/dev/null; then
  echo "aborted funding proof pack route unexpectedly present" >&2
  exit 21
fi

echo "VOID_RUNTIME_ROUTE_PATCH_SAFETY_PREFLIGHT_PROOF_V1_GREEN"
