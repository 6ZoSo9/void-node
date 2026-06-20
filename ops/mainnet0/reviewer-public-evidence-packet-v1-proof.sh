#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

doc="docs/public/reviewer-public-evidence-packet-v1.md"

safety_index="ops/mainnet0/public-surface-safety-index-v1-proof.sh"
intake_closeout="ops/mainnet0/public-intake-gate-closeout-seal-v1-proof.sh"
intake_matrix="ops/mainnet0/public-intake-gate-readiness-matrix-v1.sh"
mutation_audit="ops/mainnet0/public-mutation-method-boundary-audit-v1.sh"
route_audit="ops/mainnet0/public-surface-route-registry-safety-audit-v1.sh"
runtime_preflight="ops/mainnet0/runtime-route-patch-safety-preflight-v1.sh"
funding_proof="ops/mainnet0/funding-gateway-card-v1-proof.sh"

grep -F "VOID_REVIEWER_PUBLIC_EVIDENCE_PACKET_DOC_V1" "$doc" >/dev/null
grep -F "handoff packet, not a new public runtime feature" "$doc" >/dev/null
grep -F "does not open public intake" "$doc" >/dev/null
grep -F "does not open public mutation" "$doc" >/dev/null
grep -F "does not add a runtime route" "$doc" >/dev/null
grep -F "does not modify \`src/index.ts\`" "$doc" >/dev/null
grep -F "df15cc18" "$doc" >/dev/null
grep -F "df15cc189ca1" "$doc" >/dev/null

grep -F "VOID_PUBLIC_SURFACE_SAFETY_INDEX_V1_GREEN" "$doc" >/dev/null
grep -F "VOID_PUBLIC_INTAKE_GATE_CLOSEOUT_SEAL_V1_GREEN" "$doc" >/dev/null
grep -F "VOID_PUBLIC_INTAKE_GATE_READINESS_MATRIX_V1_GREEN" "$doc" >/dev/null
grep -F "VOID_PUBLIC_MUTATION_METHOD_BOUNDARY_AUDIT_V1_GREEN" "$doc" >/dev/null
grep -F "VOID_FUNDING_GATEWAY_CARD_V1_GREEN" "$doc" >/dev/null

grep -F "/public-node/funding" "$doc" >/dev/null
grep -F "/buy-void" "$doc" >/dev/null
grep -F "/public-node/datanet/explorer-v1" "$doc" >/dev/null
grep -F "/public-node/route-index" "$doc" >/dev/null
grep -F "/version" "$doc" >/dev/null

grep -F "public_intake_open_now=false" "$doc" >/dev/null
grep -F "public_mutation_open_now=false" "$doc" >/dev/null
grep -F "public_node_mutation_handler_count=0" "$doc" >/dev/null
grep -F "public_node_literal_mutation_handler_count=0" "$doc" >/dev/null
grep -F "public_route_duplicate_count=0" "$doc" >/dev/null
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
grep -F "funding_surface_read_only=true" "$doc" >/dev/null
grep -F "datanet_explorer_read_only=true" "$doc" >/dev/null
grep -F "route_index_read_only=true" "$doc" >/dev/null
grep -F "external_reviewer_packet_only=true" "$doc" >/dev/null
grep -F "future_public_mutation_requires_named_gate=true" "$doc" >/dev/null
grep -F "build_before_commit_required=true" "$doc" >/dev/null
grep -F "cross_box_required=true" "$doc" >/dev/null

for f in \
  "$safety_index" \
  "$intake_closeout" \
  "$intake_matrix" \
  "$mutation_audit" \
  "$route_audit" \
  "$runtime_preflight" \
  "$funding_proof"
do
  test -x "$f"
done

bash "$safety_index" >/tmp/void-reviewer-public-evidence-safety-index.out
grep -F "VOID_PUBLIC_SURFACE_SAFETY_INDEX_V1_GREEN" /tmp/void-reviewer-public-evidence-safety-index.out >/dev/null

bash "$intake_closeout" >/tmp/void-reviewer-public-evidence-intake-closeout.out
grep -F "VOID_PUBLIC_INTAKE_GATE_CLOSEOUT_SEAL_V1_GREEN" /tmp/void-reviewer-public-evidence-intake-closeout.out >/dev/null

bash "$intake_matrix" >/tmp/void-reviewer-public-evidence-intake-matrix.out
grep -F "VOID_PUBLIC_INTAKE_GATE_READINESS_MATRIX_V1_GREEN" /tmp/void-reviewer-public-evidence-intake-matrix.out >/dev/null
grep -F "matrix_public_node_mutation_handler_count=0" /tmp/void-reviewer-public-evidence-intake-matrix.out >/dev/null
grep -F "matrix_public_route_duplicate_count=0" /tmp/void-reviewer-public-evidence-intake-matrix.out >/dev/null
grep -F "matrix_public_intake_open_now=false" /tmp/void-reviewer-public-evidence-intake-matrix.out >/dev/null
grep -F "matrix_public_mutation_open_now=false" /tmp/void-reviewer-public-evidence-intake-matrix.out >/dev/null

bash "$mutation_audit" >/tmp/void-reviewer-public-evidence-mutation-audit.out
grep -F "VOID_PUBLIC_MUTATION_METHOD_BOUNDARY_AUDIT_V1_GREEN" /tmp/void-reviewer-public-evidence-mutation-audit.out >/dev/null
grep -F "literal_mutation_handler_count=118" /tmp/void-reviewer-public-evidence-mutation-audit.out >/dev/null
grep -F "public_node_literal_mutation_handler_count=0" /tmp/void-reviewer-public-evidence-mutation-audit.out >/dev/null

bash "$route_audit" >/tmp/void-reviewer-public-evidence-route-audit.out
grep -F "VOID_PUBLIC_SURFACE_ROUTE_REGISTRY_SAFETY_AUDIT_V1_GREEN" /tmp/void-reviewer-public-evidence-route-audit.out >/dev/null
grep -F "public_literal_get_count=157" /tmp/void-reviewer-public-evidence-route-audit.out >/dev/null
grep -F "public_literal_get_unique_count=157" /tmp/void-reviewer-public-evidence-route-audit.out >/dev/null
grep -F "public_literal_get_duplicate_count=0" /tmp/void-reviewer-public-evidence-route-audit.out >/dev/null

bash "$runtime_preflight" >/tmp/void-reviewer-public-evidence-runtime-preflight.out
grep -F "VOID_RUNTIME_ROUTE_PATCH_SAFETY_PREFLIGHT_V1_GREEN" /tmp/void-reviewer-public-evidence-runtime-preflight.out >/dev/null

bash "$funding_proof" >/tmp/void-reviewer-public-evidence-funding-proof.out
grep -F "VOID_FUNDING_GATEWAY_CARD_V1_GREEN" /tmp/void-reviewer-public-evidence-funding-proof.out >/dev/null

# Evidence surface references must exist somewhere in repo/source/docs/proofs.
git grep -F "/public-node/funding" -- src docs ops >/dev/null
git grep -F "/buy-void" -- src docs ops >/dev/null
git grep -F "/public-node/datanet/explorer-v1" -- src docs ops >/dev/null
git grep -E "/public-node/route-index(\\.json)?" -- src docs ops >/dev/null
git grep -F "VOID_PUBLIC_SURFACE_SAFETY_INDEX_DOC_V1" -- docs ops >/dev/null
git grep -F "VOID_FUNDING_GATEWAY_CARD" -- src docs ops >/dev/null

if grep -F 'APP.post("/public-node' src/index.ts >/dev/null; then
  echo "public-node POST route unexpectedly present" >&2
  exit 31
fi

if grep -F 'APP.get("/public-node/funding-proof-pack-v1.json"' src/index.ts >/dev/null; then
  echo "aborted funding proof pack route unexpectedly present" >&2
  exit 32
fi

echo "VOID_REVIEWER_PUBLIC_EVIDENCE_PACKET_V1_GREEN"
