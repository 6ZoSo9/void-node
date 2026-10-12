#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

doc="docs/public/public-surface-route-registry-safety-audit-v1.md"
audit="ops/mainnet0/public-surface-route-registry-safety-audit-v1.sh"
preflight="ops/mainnet0/runtime-route-patch-safety-preflight-v1.sh"

grep -F "VOID_PUBLIC_SURFACE_ROUTE_REGISTRY_SAFETY_AUDIT_DOC_V1" "$doc" >/dev/null
grep -F "docs/proof/script-only" "$doc" >/dev/null
grep -F "This lane does not modify" "$doc" >/dev/null
grep -F "duplicate literal public GET route handlers" "$doc" >/dev/null
grep -F "VOID_RUNTIME_ROUTE_PATCH_SAFETY_PREFLIGHT_V1_GREEN" "$doc" >/dev/null
grep -F "VOID_FUNDING_LANE_FINAL_CLOSEOUT_SEAL_V1_GREEN" "$doc" >/dev/null
grep -F "VOID_FUNDING_GATEWAY_CARD_V1_GREEN" "$doc" >/dev/null

grep -F "docs_proof_script_only=true" "$doc" >/dev/null
grep -F "modifies_src_index=false" "$doc" >/dev/null
grep -F "runtime_route_added=false" "$doc" >/dev/null
grep -F "public_mutation_default=false" "$doc" >/dev/null
grep -F "duplicate_public_get_route_check_required=true" "$doc" >/dev/null
grep -F "aborted_runtime_route_absent_required=true" "$doc" >/dev/null
grep -F "docs_only_routes_must_not_be_runtime_routes=true" "$doc" >/dev/null
grep -F "route_index_drift_risk_acknowledged=true" "$doc" >/dev/null
grep -F "build_before_commit_required=true" "$doc" >/dev/null

test -x "$audit"
test -x "$preflight"

grep -F "VOID_PUBLIC_SURFACE_ROUTE_REGISTRY_SAFETY_AUDIT_V1_BEGIN" "$audit" >/dev/null
grep -F "VOID_PUBLIC_SURFACE_ROUTE_REGISTRY_SAFETY_AUDIT_V1_GREEN" "$audit" >/dev/null
grep -F "public_literal_get_duplicate_count" "$audit" >/dev/null
grep -F "public_mutation_routes_begin" "$audit" >/dev/null
grep -F "VOID_PUBLIC_NODE_ROUTE_INDEX_V1" "$audit" >/dev/null
grep -F "VOID_FUNDING_GATEWAY_CARD_UI_V1" "$audit" >/dev/null
grep -F "VOID_FUNDING_PATH_TIGHTEN_V1" "$audit" >/dev/null
grep -F "VOID_PUBLIC_GATEWAY_TRIAD_SEAL_V1" "$audit" >/dev/null
grep -F "funding-proof-pack-v1.json" "$audit" >/dev/null
grep -F "funding-safe-public-packet-v1.json" "$audit" >/dev/null
grep -F "runtime-route-patch-safety-preflight-v1.sh" "$audit" >/dev/null

if grep -F 'APP.get("/public-node/funding-proof-pack-v1.json"' src/index.ts >/dev/null; then
  echo "aborted funding proof pack runtime route unexpectedly present" >&2
  exit 21
fi

if grep -F 'APP.get("/public-node/funding-safe-public-packet-v1.json"' src/index.ts >/dev/null; then
  echo "safe public packet runtime route unexpectedly present" >&2
  exit 22
fi

echo "VOID_PUBLIC_SURFACE_ROUTE_REGISTRY_SAFETY_AUDIT_PROOF_V1_GREEN"
