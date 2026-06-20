#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

doc="docs/public/public-surface-safety-guardrail-closeout-v1.md"

preflight="ops/mainnet0/runtime-route-patch-safety-preflight-v1.sh"
preflight_proof="ops/mainnet0/runtime-route-patch-safety-preflight-v1-proof.sh"
audit="ops/mainnet0/public-surface-route-registry-safety-audit-v1.sh"
audit_proof="ops/mainnet0/public-surface-route-registry-safety-audit-v1-proof.sh"

grep -F "VOID_PUBLIC_SURFACE_SAFETY_GUARDRAIL_CLOSEOUT_DOC_V1" "$doc" >/dev/null
grep -F "Runtime Route Patch Safety Preflight v1" "$doc" >/dev/null
grep -F "Public Surface Route Registry Safety Audit v1" "$doc" >/dev/null
grep -F "VOID_RUNTIME_ROUTE_PATCH_SAFETY_PREFLIGHT_V1_GREEN" "$doc" >/dev/null
grep -F "VOID_PUBLIC_SURFACE_ROUTE_REGISTRY_SAFETY_AUDIT_V1_GREEN" "$doc" >/dev/null
grep -F "ec138fd7" "$doc" >/dev/null
grep -F "public literal GET route count: \`157\`" "$doc" >/dev/null
grep -F "public literal GET unique count: \`157\`" "$doc" >/dev/null
grep -F "public literal GET duplicate count: \`0\`" "$doc" >/dev/null
grep -F "VOID_FUNDING_LANE_FINAL_CLOSEOUT_SEAL_V1_GREEN" "$doc" >/dev/null
grep -F "VOID_FUNDING_GATEWAY_CARD_V1_GREEN" "$doc" >/dev/null

grep -F "docs_proof_only=true" "$doc" >/dev/null
grep -F "modifies_src_index=false" "$doc" >/dev/null
grep -F "runtime_route_added=false" "$doc" >/dev/null
grep -F "guardrail_checkpoint_created=true" "$doc" >/dev/null
grep -F "route_patch_preflight_required=true" "$doc" >/dev/null
grep -F "route_registry_audit_required=true" "$doc" >/dev/null
grep -F "duplicate_public_route_count_required_zero=true" "$doc" >/dev/null
grep -F "public_mutation_default=false" "$doc" >/dev/null
grep -F "aborted_funding_proof_pack_route_absent_required=true" "$doc" >/dev/null
grep -F "docs_only_funding_packet_runtime_absent_required=true" "$doc" >/dev/null
grep -F "build_before_commit_required=true" "$doc" >/dev/null
grep -F "cross_box_required=true" "$doc" >/dev/null

test -x "$preflight"
test -x "$preflight_proof"
test -x "$audit"
test -x "$audit_proof"

bash "$preflight" >/tmp/void-public-surface-guardrail-closeout-preflight.out
grep -F "VOID_RUNTIME_ROUTE_PATCH_SAFETY_PREFLIGHT_V1_GREEN" /tmp/void-public-surface-guardrail-closeout-preflight.out >/dev/null

bash "$preflight_proof" >/tmp/void-public-surface-guardrail-closeout-preflight-proof.out
grep -F "VOID_RUNTIME_ROUTE_PATCH_SAFETY_PREFLIGHT_PROOF_V1_GREEN" /tmp/void-public-surface-guardrail-closeout-preflight-proof.out >/dev/null

bash "$audit" >/tmp/void-public-surface-guardrail-closeout-audit.out
grep -F "VOID_PUBLIC_SURFACE_ROUTE_REGISTRY_SAFETY_AUDIT_V1_GREEN" /tmp/void-public-surface-guardrail-closeout-audit.out >/dev/null
grep -F "public_literal_get_duplicate_count=0" /tmp/void-public-surface-guardrail-closeout-audit.out >/dev/null

bash "$audit_proof" >/tmp/void-public-surface-guardrail-closeout-audit-proof.out
grep -F "VOID_PUBLIC_SURFACE_ROUTE_REGISTRY_SAFETY_AUDIT_PROOF_V1_GREEN" /tmp/void-public-surface-guardrail-closeout-audit-proof.out >/dev/null

if grep -F 'APP.get("/public-node/funding-proof-pack-v1.json"' src/index.ts >/dev/null; then
  echo "aborted funding proof pack route unexpectedly present" >&2
  exit 31
fi

if grep -F 'APP.get("/public-node/funding-safe-public-packet-v1.json"' src/index.ts >/dev/null; then
  echo "docs-only funding safe packet runtime route unexpectedly present" >&2
  exit 32
fi

echo "VOID_PUBLIC_SURFACE_SAFETY_GUARDRAIL_CLOSEOUT_V1_GREEN"
