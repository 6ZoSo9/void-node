#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

doc="docs/public/public-intake-gate-readiness-matrix-v1.md"
matrix="ops/mainnet0/public-intake-gate-readiness-matrix-v1.sh"

grep -F "VOID_PUBLIC_INTAKE_GATE_READINESS_MATRIX_DOC_V1" "$doc" >/dev/null
grep -F "does not open public intake" "$doc" >/dev/null
grep -F "does not add a runtime route" "$doc" >/dev/null
grep -F "cd944d7a" "$doc" >/dev/null
grep -F "public node mutation handlers: \`0\`" "$doc" >/dev/null
grep -F "public literal GET duplicate routes: \`0\`" "$doc" >/dev/null
grep -F "VOID_PUBLIC_SURFACE_ROUTE_REGISTRY_SAFETY_AUDIT_V1_GREEN" "$doc" >/dev/null
grep -F "VOID_PUBLIC_MUTATION_METHOD_BOUNDARY_AUDIT_V1_GREEN" "$doc" >/dev/null
grep -F "VOID_PUBLIC_SURFACE_SAFETY_GUARDRAIL_CLOSEOUT_V1_GREEN" "$doc" >/dev/null
grep -F "VOID_FUNDING_GATEWAY_CARD_V1_GREEN" "$doc" >/dev/null

grep -F "docs_proof_script_only=true" "$doc" >/dev/null
grep -F "modifies_src_index=false" "$doc" >/dev/null
grep -F "runtime_route_added=false" "$doc" >/dev/null
grep -F "public_intake_open_now=false" "$doc" >/dev/null
grep -F "public_mutation_open_now=false" "$doc" >/dev/null
grep -F "public_node_mutation_handler_count_required_zero=true" "$doc" >/dev/null
grep -F "public_route_duplicate_count_required_zero=true" "$doc" >/dev/null
grep -F "auth_required_before_public_mutation=true" "$doc" >/dev/null
grep -F "authorization_required_before_public_mutation=true" "$doc" >/dev/null
grep -F "replay_nonce_required_before_public_mutation=true" "$doc" >/dev/null
grep -F "rate_cap_required_before_public_mutation=true" "$doc" >/dev/null
grep -F "payload_schema_required_before_public_mutation=true" "$doc" >/dev/null
grep -F "abuse_handling_required_before_public_mutation=true" "$doc" >/dev/null
grep -F "ledger_write_closed=true" "$doc" >/dev/null
grep -F "wallet_send_closed=true" "$doc" >/dev/null
grep -F "money_movement_closed=true" "$doc" >/dev/null
grep -F "wc_award_mutation_closed=true" "$doc" >/dev/null
grep -F "validator_admission_mutation_closed=true" "$doc" >/dev/null
grep -F "datanet_public_ingest_mutation_closed=true" "$doc" >/dev/null
grep -F "build_before_commit_required=true" "$doc" >/dev/null
grep -F "cross_box_required=true" "$doc" >/dev/null

test -x "$matrix"
grep -F "VOID_PUBLIC_INTAKE_GATE_READINESS_MATRIX_V1_BEGIN" "$matrix" >/dev/null
grep -F "VOID_PUBLIC_INTAKE_GATE_READINESS_MATRIX_V1_GREEN" "$matrix" >/dev/null
grep -F "public-mutation-method-boundary-audit-v1.sh" "$matrix" >/dev/null
grep -F "public-surface-route-registry-safety-audit-v1.sh" "$matrix" >/dev/null
grep -F "runtime-route-patch-safety-preflight-v1.sh" "$matrix" >/dev/null
grep -F "matrix_public_intake_open_now=false" "$matrix" >/dev/null
grep -F "matrix_public_mutation_open_now=false" "$matrix" >/dev/null
grep -F "matrix_auth_required_before_public_mutation=true" "$matrix" >/dev/null
grep -F "matrix_wallet_send_closed=true" "$matrix" >/dev/null
grep -F "matrix_money_movement_closed=true" "$matrix" >/dev/null

bash "$matrix" >/tmp/void-public-intake-gate-readiness-matrix-proof-run.out
grep -F "VOID_PUBLIC_INTAKE_GATE_READINESS_MATRIX_V1_GREEN" /tmp/void-public-intake-gate-readiness-matrix-proof-run.out >/dev/null
grep -F "matrix_public_node_mutation_handler_count=0" /tmp/void-public-intake-gate-readiness-matrix-proof-run.out >/dev/null
grep -F "matrix_public_route_duplicate_count=0" /tmp/void-public-intake-gate-readiness-matrix-proof-run.out >/dev/null
grep -F "matrix_public_intake_open_now=false" /tmp/void-public-intake-gate-readiness-matrix-proof-run.out >/dev/null
grep -F "matrix_public_mutation_open_now=false" /tmp/void-public-intake-gate-readiness-matrix-proof-run.out >/dev/null

if grep -F 'APP.post("/public-node' src/index.ts >/dev/null; then
  echo "public-node POST route unexpectedly present" >&2
  exit 31
fi

echo "VOID_PUBLIC_INTAKE_GATE_READINESS_MATRIX_PROOF_V1_GREEN"
