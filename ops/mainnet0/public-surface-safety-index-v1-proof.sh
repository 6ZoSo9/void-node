#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

doc="docs/public/public-surface-safety-index-v1.md"

runtime_preflight="ops/mainnet0/runtime-route-patch-safety-preflight-v1.sh"
route_audit="ops/mainnet0/public-surface-route-registry-safety-audit-v1.sh"
guardrail_proof="ops/mainnet0/public-surface-safety-guardrail-closeout-v1-proof.sh"
mutation_audit="ops/mainnet0/public-mutation-method-boundary-audit-v1.sh"
mutation_proof="ops/mainnet0/public-mutation-method-boundary-audit-v1-proof.sh"
matrix="ops/mainnet0/public-intake-gate-readiness-matrix-v1.sh"
matrix_proof="ops/mainnet0/public-intake-gate-readiness-matrix-v1-proof.sh"
closeout_proof="ops/mainnet0/public-intake-gate-closeout-seal-v1-proof.sh"
funding_proof="ops/mainnet0/funding-gateway-card-v1-proof.sh"

grep -F "VOID_PUBLIC_SURFACE_SAFETY_INDEX_DOC_V1" "$doc" >/dev/null
grep -F "VOID_PUBLIC_SURFACE_SAFETY_INDEX_REVIEWER_HANDOFF_RUNTIME_CARD_REFRESH_V1" "$doc" >/dev/null
grep -F "docs/proof-only index" "$doc" >/dev/null
grep -F "does not open public intake" "$doc" >/dev/null
grep -F "does not open public mutation" "$doc" >/dev/null
grep -F "does not add a runtime route" "$doc" >/dev/null
grep -F "does not modify \`src/index.ts\`" "$doc" >/dev/null
grep -F "cb35d152" "$doc" >/dev/null
grep -F "cb35d1525c9e" "$doc" >/dev/null

grep -F "VOID_PUBLIC_INTAKE_GATE_CLOSEOUT_SEAL_V1_GREEN" "$doc" >/dev/null
grep -F "VOID_PUBLIC_INTAKE_GATE_READINESS_MATRIX_V1_GREEN" "$doc" >/dev/null
grep -F "VOID_PUBLIC_MUTATION_METHOD_BOUNDARY_AUDIT_V1_GREEN" "$doc" >/dev/null
grep -F "VOID_PUBLIC_SURFACE_ROUTE_REGISTRY_SAFETY_AUDIT_V1_GREEN" "$doc" >/dev/null
grep -F "VOID_RUNTIME_ROUTE_PATCH_SAFETY_PREFLIGHT_V1_GREEN" "$doc" >/dev/null
grep -F "VOID_PUBLIC_SURFACE_SAFETY_GUARDRAIL_CLOSEOUT_V1_GREEN" "$doc" >/dev/null
grep -F "VOID_FUNDING_GATEWAY_CARD_V1_GREEN" "$doc" >/dev/null

grep -F "public_intake_open_now=false" "$doc" >/dev/null
grep -F "public_mutation_open_now=false" "$doc" >/dev/null
grep -F "public_node_mutation_handler_count=0" "$doc" >/dev/null
grep -F "public_node_literal_mutation_handler_count=0" "$doc" >/dev/null
grep -F "public_route_duplicate_count=0" "$doc" >/dev/null
grep -F "literal_mutation_handler_count=118" "$doc" >/dev/null
grep -F "public_literal_get_count=171" "$doc" >/dev/null
grep -F "public_literal_get_unique_count=171" "$doc" >/dev/null
grep -F "public_literal_get_duplicate_count=0" "$doc" >/dev/null

grep -F "ledger_write_closed=true" "$doc" >/dev/null
grep -F "wallet_send_closed=true" "$doc" >/dev/null
grep -F "money_movement_closed=true" "$doc" >/dev/null
grep -F "wc_award_mutation_closed=true" "$doc" >/dev/null
grep -F "validator_admission_mutation_closed=true" "$doc" >/dev/null
grep -F "datanet_public_ingest_mutation_closed=true" "$doc" >/dev/null

grep -F "docs_proof_only=true" "$doc" >/dev/null
grep -F "modifies_src_index=false" "$doc" >/dev/null
grep -F "runtime_route_added=false" "$doc" >/dev/null
grep -F "future_public_mutation_requires_named_gate=true" "$doc" >/dev/null
grep -F "build_before_commit_required=true" "$doc" >/dev/null
grep -F "cross_box_required=true" "$doc" >/dev/null

for f in \
  "$runtime_preflight" \
  "$route_audit" \
  "$guardrail_proof" \
  "$mutation_audit" \
  "$mutation_proof" \
  "$matrix" \
  "$matrix_proof" \
  "$closeout_proof" \
  "$funding_proof"
do
  test -x "$f"
done

bash "$runtime_preflight" >/tmp/void-public-safety-index-runtime-preflight.out
grep -F "VOID_RUNTIME_ROUTE_PATCH_SAFETY_PREFLIGHT_V1_GREEN" /tmp/void-public-safety-index-runtime-preflight.out >/dev/null

bash "$route_audit" >/tmp/void-public-safety-index-route-audit.out
grep -F "VOID_PUBLIC_SURFACE_ROUTE_REGISTRY_SAFETY_AUDIT_V1_GREEN" /tmp/void-public-safety-index-route-audit.out >/dev/null
grep -F "public_literal_get_count=171" /tmp/void-public-safety-index-route-audit.out >/dev/null
grep -F "public_literal_get_unique_count=171" /tmp/void-public-safety-index-route-audit.out >/dev/null
grep -F "public_literal_get_duplicate_count=0" /tmp/void-public-safety-index-route-audit.out >/dev/null

bash "$guardrail_proof" >/tmp/void-public-safety-index-guardrail-proof.out
grep -F "VOID_PUBLIC_SURFACE_SAFETY_GUARDRAIL_CLOSEOUT_V1_GREEN" /tmp/void-public-safety-index-guardrail-proof.out >/dev/null

bash "$mutation_audit" >/tmp/void-public-safety-index-mutation-audit.out
grep -F "VOID_PUBLIC_MUTATION_METHOD_BOUNDARY_AUDIT_V1_GREEN" /tmp/void-public-safety-index-mutation-audit.out >/dev/null
grep -F "literal_mutation_handler_count=118" /tmp/void-public-safety-index-mutation-audit.out >/dev/null
grep -F "public_node_literal_mutation_handler_count=0" /tmp/void-public-safety-index-mutation-audit.out >/dev/null

bash "$mutation_proof" >/tmp/void-public-safety-index-mutation-proof.out
grep -F "VOID_PUBLIC_MUTATION_METHOD_BOUNDARY_AUDIT_PROOF_V1_GREEN" /tmp/void-public-safety-index-mutation-proof.out >/dev/null

bash "$matrix" >/tmp/void-public-safety-index-matrix.out
grep -F "VOID_PUBLIC_INTAKE_GATE_READINESS_MATRIX_V1_GREEN" /tmp/void-public-safety-index-matrix.out >/dev/null
grep -F "matrix_public_node_mutation_handler_count=0" /tmp/void-public-safety-index-matrix.out >/dev/null
grep -F "matrix_public_route_duplicate_count=0" /tmp/void-public-safety-index-matrix.out >/dev/null
grep -F "matrix_public_intake_open_now=false" /tmp/void-public-safety-index-matrix.out >/dev/null
grep -F "matrix_public_mutation_open_now=false" /tmp/void-public-safety-index-matrix.out >/dev/null

bash "$matrix_proof" >/tmp/void-public-safety-index-matrix-proof.out
grep -F "VOID_PUBLIC_INTAKE_GATE_READINESS_MATRIX_PROOF_V1_GREEN" /tmp/void-public-safety-index-matrix-proof.out >/dev/null

bash "$closeout_proof" >/tmp/void-public-safety-index-closeout-proof.out
grep -F "VOID_PUBLIC_INTAKE_GATE_CLOSEOUT_SEAL_V1_GREEN" /tmp/void-public-safety-index-closeout-proof.out >/dev/null

bash "$funding_proof" >/tmp/void-public-safety-index-funding-proof.out
grep -F "VOID_FUNDING_GATEWAY_CARD_V1_GREEN" /tmp/void-public-safety-index-funding-proof.out >/dev/null

if grep -F 'APP.post("/public-node' src/index.ts >/dev/null; then
  echo "public-node POST route unexpectedly present" >&2
  exit 31
fi

if grep -F 'APP.get("/public-node/funding-proof-pack-v1.json"' src/index.ts >/dev/null; then
  echo "aborted funding proof pack route unexpectedly present" >&2
  exit 32
fi

echo "VOID_PUBLIC_SURFACE_SAFETY_INDEX_V1_GREEN"
