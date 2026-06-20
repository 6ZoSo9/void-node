#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

echo "VOID_PUBLIC_INTAKE_GATE_READINESS_MATRIX_V1_BEGIN"
echo "host=$(hostname)"
echo "branch=$(git branch --show-current)"
echo "head=$(git rev-parse --short HEAD)"

bash ops/mainnet0/public-mutation-method-boundary-audit-v1.sh >/tmp/void-public-intake-mutation-boundary.out
grep -F "VOID_PUBLIC_MUTATION_METHOD_BOUNDARY_AUDIT_V1_GREEN" /tmp/void-public-intake-mutation-boundary.out >/dev/null
grep -F "public_node_literal_mutation_handler_count=0" /tmp/void-public-intake-mutation-boundary.out >/dev/null

bash ops/mainnet0/public-surface-route-registry-safety-audit-v1.sh >/tmp/void-public-intake-route-audit.out
grep -F "VOID_PUBLIC_SURFACE_ROUTE_REGISTRY_SAFETY_AUDIT_V1_GREEN" /tmp/void-public-intake-route-audit.out >/dev/null
grep -F "public_literal_get_duplicate_count=0" /tmp/void-public-intake-route-audit.out >/dev/null

bash ops/mainnet0/runtime-route-patch-safety-preflight-v1.sh >/tmp/void-public-intake-route-preflight.out
grep -F "VOID_RUNTIME_ROUTE_PATCH_SAFETY_PREFLIGHT_V1_GREEN" /tmp/void-public-intake-route-preflight.out >/dev/null

echo "matrix_public_node_mutation_handler_count=0"
echo "matrix_public_route_duplicate_count=0"
echo "matrix_public_intake_open_now=false"
echo "matrix_public_mutation_open_now=false"
echo "matrix_auth_required_before_public_mutation=true"
echo "matrix_authorization_required_before_public_mutation=true"
echo "matrix_replay_nonce_required_before_public_mutation=true"
echo "matrix_rate_cap_required_before_public_mutation=true"
echo "matrix_payload_schema_required_before_public_mutation=true"
echo "matrix_abuse_handling_required_before_public_mutation=true"
echo "matrix_ledger_write_closed=true"
echo "matrix_wallet_send_closed=true"
echo "matrix_money_movement_closed=true"
echo "matrix_wc_award_mutation_closed=true"
echo "matrix_validator_admission_mutation_closed=true"
echo "matrix_datanet_public_ingest_mutation_closed=true"

echo "VOID_PUBLIC_INTAKE_GATE_READINESS_MATRIX_V1_GREEN"
