#!/usr/bin/env bash
set -euo pipefail

BASE="${PUBLIC_NODE_BASE:-http://127.0.0.1:4100}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="${OUT:-/tmp/public-node-skeptic-audit-readiness-proof-$STAMP}"

mkdir -p "$OUT"

echo "=== VOID Public Node Skeptic / Audit Readiness Proof v1 ==="
echo "marker=VOID_PUBLIC_NODE_SKEPTIC_AUDIT_READINESS_PROOF_V1"
echo "head=$(git rev-parse --short HEAD)"
echo "base=$BASE"
echo "out=$OUT"

grep -Fq "VOID_PUBLIC_NODE_SKEPTIC_AUDIT_READINESS_ROUTE_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_SKEPTIC_AUDIT_READINESS_UI_V1" src/index.ts
grep -Fq "publicNodeSkepticAuditReadinessCard" src/index.ts
grep -Fq "publicNodeSkepticAuditReadinessRawLink" src/index.ts
grep -Fq "Public/private process isolation is not complete" src/index.ts
grep -Fq "Green proof marker verifies disclosure alignment only" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_SKEPTIC_AUDIT_READINESS_DOC_V1" docs/public/public-node-skeptic-audit-readiness.md
grep -Fq "Passing this proof does not mean the node is secure." docs/public/public-node-skeptic-audit-readiness.md

curl -fsS --max-time 8 "$BASE/public-node/skeptic-audit-readiness.json" > "$OUT/skeptic-audit-readiness.json"
curl -fsS --max-time 8 "$BASE/public-node/route-index.json" > "$OUT/route-index.json"
curl -fsS --max-time 8 "$BASE/public-node" > "$OUT/public-node.html"

grep -Fq '"marker":"VOID_PUBLIC_NODE_SKEPTIC_AUDIT_READINESS_V1"' "$OUT/skeptic-audit-readiness.json"
grep -Fq '"route":"/public-node/skeptic-audit-readiness.json"' "$OUT/skeptic-audit-readiness.json"
grep -Fq '"production_grade_claim":false' "$OUT/skeptic-audit-readiness.json"
grep -Fq '"third_party_audit_complete":false' "$OUT/skeptic-audit-readiness.json"
grep -Fq '"unauthenticated_access_allowed":true' "$OUT/skeptic-audit-readiness.json"

grep -Fq '"mode":"read_only"' "$OUT/skeptic-audit-readiness.json"
grep -Fq '"core_mutation_allowed":false' "$OUT/skeptic-audit-readiness.json"
grep -Fq '"wallet_mutation_allowed":false' "$OUT/skeptic-audit-readiness.json"
grep -Fq '"validator_mutation_allowed":false' "$OUT/skeptic-audit-readiness.json"
grep -Fq '"wc_award_allowed":false' "$OUT/skeptic-audit-readiness.json"
grep -Fq '"ledger_write_allowed":false' "$OUT/skeptic-audit-readiness.json"
grep -Fq '"private_api_access_allowed":false' "$OUT/skeptic-audit-readiness.json"
grep -Fq '"unauthenticated_surface_abuse_risk_disclosed":true' "$OUT/skeptic-audit-readiness.json"
grep -Fq '"unauthenticated_surface_throttling_profile":"not_claimed_in_v1"' "$OUT/skeptic-audit-readiness.json"

grep -Fq '"state_source":"static_v1_disclosure_payload"' "$OUT/skeptic-audit-readiness.json"
grep -Fq '"per_request_database_query":false' "$OUT/skeptic-audit-readiness.json"
grep -Fq '"per_request_filesystem_scan":false' "$OUT/skeptic-audit-readiness.json"
grep -Fq '"per_request_shell_execution":false' "$OUT/skeptic-audit-readiness.json"
grep -Fq '"per_request_ledger_write":false' "$OUT/skeptic-audit-readiness.json"
grep -Fq '"per_request_wallet_operation":false' "$OUT/skeptic-audit-readiness.json"
grep -Fq '"per_request_validator_operation":false' "$OUT/skeptic-audit-readiness.json"
grep -Fq '"public_route_expected_disk_state_write_path":false' "$OUT/skeptic-audit-readiness.json"

grep -Fq '"read_only_does_not_mean_dos_proof":true' "$OUT/skeptic-audit-readiness.json"
grep -Fq '"public_and_private_process_isolation_complete":false' "$OUT/skeptic-audit-readiness.json"
grep -Fq '"public_route_crash_could_affect_local_node_process":true' "$OUT/skeptic-audit-readiness.json"
grep -Fq '"process_crash_risk_type":"availability_not_authorized_state_mutation"' "$OUT/skeptic-audit-readiness.json"
grep -Fq '"rate_limit_enforced_at_route":false' "$OUT/skeptic-audit-readiness.json"
grep -Fq '"rate_limit_policy_status":"not_claimed_in_v1"' "$OUT/skeptic-audit-readiness.json"

grep -Fq '"consensus_security_asset":"VOID"' "$OUT/skeptic-audit-readiness.json"
grep -Fq '"work_credits_are_consensus_asset":false' "$OUT/skeptic-audit-readiness.json"
grep -Fq '"work_credits_can_influence_block_finality":false' "$OUT/skeptic-audit-readiness.json"
grep -Fq '"work_credits_can_directly_mutate_validator_set":false' "$OUT/skeptic-audit-readiness.json"
grep -Fq '"work_credits_indirect_influence_scope":"manual_operator_review_only"' "$OUT/skeptic-audit-readiness.json"
grep -Fq '"work_credits_automatic_governance_power":false' "$OUT/skeptic-audit-readiness.json"

grep -Fq '"operator_heavy_seed_stage":true' "$OUT/skeptic-audit-readiness.json"
grep -Fq '"automated_public_validator_admission_enabled":false' "$OUT/skeptic-audit-readiness.json"
grep -Fq '"active_independent_public_validator_count_claimed":0' "$OUT/skeptic-audit-readiness.json"
grep -Fq '"decentralization_maturity_claim":"not_mature"' "$OUT/skeptic-audit-readiness.json"

grep -Fq "/public-node/skeptic-audit-readiness.json" "$OUT/route-index.json"
grep -Fq "VOID_PUBLIC_NODE_SKEPTIC_AUDIT_READINESS_V1" "$OUT/route-index.json"

grep -Fq "VOID_PUBLIC_NODE_SKEPTIC_AUDIT_READINESS_UI_V1" "$OUT/public-node.html"
grep -Fq "publicNodeSkepticAuditReadinessCard" "$OUT/public-node.html"
grep -Fq "Public Surface Skeptic" "$OUT/public-node.html"
grep -Fq "not_mature" "$OUT/public-node.html"
grep -Fq "Rate limiting/throttling is not claimed in V1" "$OUT/public-node.html"
grep -Fq "Green proof marker verifies disclosure alignment only" "$OUT/public-node.html"

echo "skeptic_audit_readiness_route_green=true"
echo "skeptic_audit_readiness_route_index_green=true"
echo "skeptic_audit_readiness_card_ui_green=true"
echo "skeptic_audit_readiness_doc_green=true"
echo "skeptic_audit_readiness_production_grade_claim=false"
echo "skeptic_audit_readiness_third_party_audit_complete=false"
echo "skeptic_audit_readiness_public_mutation=false"
echo "skeptic_audit_readiness_wc_consensus_asset=false"
echo "skeptic_audit_readiness_block_finality_power=false"
echo "skeptic_audit_readiness_automated_validator_admission=false"
echo "VOID_PUBLIC_NODE_SKEPTIC_AUDIT_READINESS_PROOF_V1_GREEN"
