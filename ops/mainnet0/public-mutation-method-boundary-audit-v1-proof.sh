#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

doc="docs/public/public-mutation-method-boundary-audit-v1.md"
audit="ops/mainnet0/public-mutation-method-boundary-audit-v1.sh"

grep -F "VOID_PUBLIC_MUTATION_METHOD_BOUNDARY_AUDIT_DOC_V1" "$doc" >/dev/null
grep -F "docs/proof/script only" "$doc" >/dev/null
grep -F "It does not modify" "$doc" >/dev/null
grep -F "public mutation method count under \`/public-node\`: \`0\`" "$doc" >/dev/null
grep -F "VOID_RUNTIME_ROUTE_PATCH_SAFETY_PREFLIGHT_V1_GREEN" "$doc" >/dev/null
grep -F "VOID_PUBLIC_SURFACE_ROUTE_REGISTRY_SAFETY_AUDIT_V1_GREEN" "$doc" >/dev/null
grep -F "VOID_PUBLIC_SURFACE_SAFETY_GUARDRAIL_CLOSEOUT_V1_GREEN" "$doc" >/dev/null
grep -F "VOID_FUNDING_GATEWAY_CARD_V1_GREEN" "$doc" >/dev/null

grep -F "docs_proof_script_only=true" "$doc" >/dev/null
grep -F "modifies_src_index=false" "$doc" >/dev/null
grep -F "runtime_route_added=false" "$doc" >/dev/null
grep -F "public_mutation_default=false" "$doc" >/dev/null
grep -F "public_post_routes_allowed_now=false" "$doc" >/dev/null
grep -F "public_put_routes_allowed_now=false" "$doc" >/dev/null
grep -F "public_patch_routes_allowed_now=false" "$doc" >/dev/null
grep -F "public_delete_routes_allowed_now=false" "$doc" >/dev/null
grep -F "public_node_mutation_route_count_required_zero=true" "$doc" >/dev/null
grep -F "funding_public_surface_read_only=true" "$doc" >/dev/null
grep -F "datanet_public_mutation_open_now=false" "$doc" >/dev/null
grep -F "work_credit_public_mutation_open_now=false" "$doc" >/dev/null
grep -F "validator_public_mutation_open_now=false" "$doc" >/dev/null
grep -F "money_movement_now=false" "$doc" >/dev/null
grep -F "wallet_send_now=false" "$doc" >/dev/null
grep -F "build_before_commit_required=true" "$doc" >/dev/null
grep -F "cross_box_required=true" "$doc" >/dev/null

test -x "$audit"
grep -F "VOID_PUBLIC_MUTATION_METHOD_BOUNDARY_AUDIT_V1_BEGIN" "$audit" >/dev/null
grep -F "VOID_PUBLIC_MUTATION_METHOD_BOUNDARY_AUDIT_V1_GREEN" "$audit" >/dev/null
grep -F "public_node_literal_mutation_handler_count" "$audit" >/dev/null
grep -F "public_node_mutation_method_boundary_green=true" "$audit" >/dev/null
grep -F "runtime-route-patch-safety-preflight-v1.sh" "$audit" >/dev/null
grep -F "public-surface-route-registry-safety-audit-v1.sh" "$audit" >/dev/null

bash "$audit" >/tmp/void-public-mutation-method-boundary-audit-proof-run.out
grep -F "VOID_PUBLIC_MUTATION_METHOD_BOUNDARY_AUDIT_V1_GREEN" /tmp/void-public-mutation-method-boundary-audit-proof-run.out >/dev/null
grep -F "public_node_literal_mutation_handler_count=0" /tmp/void-public-mutation-method-boundary-audit-proof-run.out >/dev/null

echo "VOID_PUBLIC_MUTATION_METHOD_BOUNDARY_AUDIT_PROOF_V1_GREEN"
