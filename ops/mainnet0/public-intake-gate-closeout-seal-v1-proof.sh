#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

doc="docs/public/public-intake-gate-closeout-seal-v1.md"

matrix="ops/mainnet0/public-intake-gate-readiness-matrix-v1.sh"
matrix_proof="ops/mainnet0/public-intake-gate-readiness-matrix-v1-proof.sh"
mutation_audit="ops/mainnet0/public-mutation-method-boundary-audit-v1.sh"
mutation_proof="ops/mainnet0/public-mutation-method-boundary-audit-v1-proof.sh"
route_audit="ops/mainnet0/public-surface-route-registry-safety-audit-v1.sh"
guardrail_proof="ops/mainnet0/public-surface-safety-guardrail-closeout-v1-proof.sh"
funding_proof="ops/mainnet0/funding-gateway-card-v1-proof.sh"

grep -F "VOID_PUBLIC_INTAKE_GATE_CLOSEOUT_SEAL_DOC_V1" "$doc" >/dev/null
grep -F "docs/proof-only seal" "$doc" >/dev/null
grep -F "does not open public intake" "$doc" >/dev/null
grep -F "does not add a runtime route" "$doc" >/dev/null
grep -F "does not modify \`src/index.ts\`" "$doc" >/dev/null
grep -F "f6e136e6" "$doc" >/dev/null
grep -F "f6e136e692e0" "$doc" >/dev/null

grep -F "VOID_PUBLIC_INTAKE_GATE_READINESS_MATRIX_V1_GREEN" "$doc" >/dev/null
grep -F "VOID_PUBLIC_MUTATION_METHOD_BOUNDARY_AUDIT_V1_GREEN" "$doc" >/dev/null
grep -F "VOID_PUBLIC_SURFACE_ROUTE_REGISTRY_SAFETY_AUDIT_V1_GREEN" "$doc" >/dev/null
grep -F "VOID_PUBLIC_SURFACE_SAFETY_GUARDRAIL_CLOSEOUT_V1_GREEN" "$doc" >/dev/null
grep -F "VOID_FUNDING_GATEWAY_CARD_V1_GREEN" "$doc" >/dev/null

grep -F "public_node_mutation_handler_count=0" "$doc" >/dev/null
grep -F "public_route_duplicate_count=0" "$doc" >/dev/null
grep -F "public_intake_open_now=false" "$doc" >/dev/null
grep -F "public_mutation_open_now=false" "$doc" >/dev/null
grep -F "public_node_literal_mutation_handler_count=0" "$doc" >/dev/null
grep -F "literal_mutation_handler_count=118" "$doc" >/dev/null
grep -F "ledger_write_closed=true" "$doc" >/dev/null
grep -F "wallet_send_closed=true" "$doc" >/dev/null
grep -F "money_movement_closed=true" "$doc" >/dev/null
grep -F "wc_award_mutation_closed=true" "$doc" >/dev/null
grep -F "validator_admission_mutation_closed=true" "$doc" >/dev/null
grep -F "datanet_public_ingest_mutation_closed=true" "$doc" >/dev/null

grep -F "docs_proof_only=true" "$doc" >/dev/null
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
grep -F "build_before_commit_required=true" "$doc" >/dev/null
grep -F "cross_box_required=true" "$doc" >/dev/null

test -x "$matrix"
test -x "$matrix_proof"
test -x "$mutation_audit"
test -x "$mutation_proof"
test -x "$route_audit"
test -x "$guardrail_proof"
test -x "$funding_proof"

bash "$matrix" >/tmp/void-public-intake-closeout-matrix.out
grep -F "VOID_PUBLIC_INTAKE_GATE_READINESS_MATRIX_V1_GREEN" /tmp/void-public-intake-closeout-matrix.out >/dev/null
grep -F "matrix_public_node_mutation_handler_count=0" /tmp/void-public-intake-closeout-matrix.out >/dev/null
grep -F "matrix_public_route_duplicate_count=0" /tmp/void-public-intake-closeout-matrix.out >/dev/null
grep -F "matrix_public_intake_open_now=false" /tmp/void-public-intake-closeout-matrix.out >/dev/null
grep -F "matrix_public_mutation_open_now=false" /tmp/void-public-intake-closeout-matrix.out >/dev/null
grep -F "matrix_wallet_send_closed=true" /tmp/void-public-intake-closeout-matrix.out >/dev/null
grep -F "matrix_money_movement_closed=true" /tmp/void-public-intake-closeout-matrix.out >/dev/null

bash "$matrix_proof" >/tmp/void-public-intake-closeout-matrix-proof.out
grep -F "VOID_PUBLIC_INTAKE_GATE_READINESS_MATRIX_PROOF_V1_GREEN" /tmp/void-public-intake-closeout-matrix-proof.out >/dev/null

bash "$mutation_audit" >/tmp/void-public-intake-closeout-mutation-audit.out
grep -F "VOID_PUBLIC_MUTATION_METHOD_BOUNDARY_AUDIT_V1_GREEN" /tmp/void-public-intake-closeout-mutation-audit.out >/dev/null
grep -F "literal_mutation_handler_count=118" /tmp/void-public-intake-closeout-mutation-audit.out >/dev/null
grep -F "public_node_literal_mutation_handler_count=0" /tmp/void-public-intake-closeout-mutation-audit.out >/dev/null

bash "$mutation_proof" >/tmp/void-public-intake-closeout-mutation-proof.out
grep -F "VOID_PUBLIC_MUTATION_METHOD_BOUNDARY_AUDIT_PROOF_V1_GREEN" /tmp/void-public-intake-closeout-mutation-proof.out >/dev/null

bash "$route_audit" >/tmp/void-public-intake-closeout-route-audit.out
grep -F "VOID_PUBLIC_SURFACE_ROUTE_REGISTRY_SAFETY_AUDIT_V1_GREEN" /tmp/void-public-intake-closeout-route-audit.out >/dev/null
grep -F "public_literal_get_duplicate_count=0" /tmp/void-public-intake-closeout-route-audit.out >/dev/null

bash "$guardrail_proof" >/tmp/void-public-intake-closeout-guardrail-proof.out
grep -F "VOID_PUBLIC_SURFACE_SAFETY_GUARDRAIL_CLOSEOUT_V1_GREEN" /tmp/void-public-intake-closeout-guardrail-proof.out >/dev/null

bash "$funding_proof" >/tmp/void-public-intake-closeout-funding-proof.out
grep -F "VOID_FUNDING_GATEWAY_CARD_V1_GREEN" /tmp/void-public-intake-closeout-funding-proof.out >/dev/null

if grep -F 'APP.post("/public-node' src/index.ts >/dev/null; then
  echo "public-node POST route unexpectedly present" >&2
  exit 31
fi

if grep -F 'APP.get("/public-node/funding-proof-pack-v1.json"' src/index.ts >/dev/null; then
  echo "aborted funding proof pack route unexpectedly present" >&2
  exit 32
fi

echo "VOID_PUBLIC_INTAKE_GATE_CLOSEOUT_SEAL_V1_GREEN"
