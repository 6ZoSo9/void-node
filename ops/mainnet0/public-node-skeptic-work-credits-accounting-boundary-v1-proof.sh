#!/usr/bin/env bash
set -euo pipefail

BASE="${PUBLIC_NODE_BASE:-http://127.0.0.1:4100}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="${OUT:-/tmp/public-node-skeptic-work-credits-accounting-boundary-v1-proof-$STAMP}"

mkdir -p "$OUT"

echo "=== VOID Public Node Skeptic Work Credits Accounting Boundary Proof v1 ==="
echo "marker=VOID_PUBLIC_NODE_SKEPTIC_WORK_CREDITS_ACCOUNTING_BOUNDARY_PROOF_V1"
echo "head=$(git rev-parse --short HEAD)"
echo "base=$BASE"
echo "out=$OUT"

grep -Fq "VOID_PUBLIC_NODE_SKEPTIC_WORK_CREDITS_ACCOUNTING_BOUNDARY_ROUTE_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_SKEPTIC_WORK_CREDITS_ACCOUNTING_BOUNDARY_UI_V1" src/index.ts
grep -Fq "publicNodeSkepticWorkCreditsAccountingBoundaryCard" src/index.ts
grep -Fq "publicNodeSkepticWorkCreditsAccountingBoundaryRawLink" src/index.ts
grep -Fq "publicNodeSkepticWorkCreditsAccountingBoundaryLink" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_SKEPTIC_WORK_CREDITS_ACCOUNTING_BOUNDARY_DOC_V1" docs/public/public-node-skeptic-work-credits-accounting-boundary-v1.md
grep -Fq "It does not mean Work Credits have become consensus, money movement, validator power, or automatic rewards." docs/public/public-node-skeptic-work-credits-accounting-boundary-v1.md

curl -fsS --max-time 8 "$BASE/public-node/skeptic/work-credits-accounting-boundary-v1.json" > "$OUT/work-credits-accounting-boundary.json"
curl -fsS --max-time 8 "$BASE/public-node/route-index.json" > "$OUT/route-index.json"
curl -fsS --max-time 8 "$BASE/public-node" > "$OUT/public-node.html"

grep -Fq '"marker":"VOID_PUBLIC_NODE_SKEPTIC_WORK_CREDITS_ACCOUNTING_BOUNDARY_V1"' "$OUT/work-credits-accounting-boundary.json"
grep -Fq '"route":"/public-node/skeptic/work-credits-accounting-boundary-v1.json"' "$OUT/work-credits-accounting-boundary.json"
grep -Fq '"parent":"/public-node/skeptic-audit-readiness.json"' "$OUT/work-credits-accounting-boundary.json"
grep -Fq '"production_grade_claim":false' "$OUT/work-credits-accounting-boundary.json"
grep -Fq '"third_party_audit_complete":false' "$OUT/work-credits-accounting-boundary.json"
grep -Fq '"disclosure_type":"work_credits_accounting_boundary_disclosure_only"' "$OUT/work-credits-accounting-boundary.json"

grep -Fq '"consensus_security_asset":"VOID"' "$OUT/work-credits-accounting-boundary.json"
grep -Fq '"work_credits_role":"useful_work_accounting_and_reward_eligibility_scaffolding"' "$OUT/work-credits-accounting-boundary.json"
grep -Fq '"work_credits_are_consensus_asset":false' "$OUT/work-credits-accounting-boundary.json"
grep -Fq '"work_credits_are_native_currency":false' "$OUT/work-credits-accounting-boundary.json"
grep -Fq '"work_credits_are_staking_asset":false' "$OUT/work-credits-accounting-boundary.json"
grep -Fq '"work_credits_can_influence_block_finality":false' "$OUT/work-credits-accounting-boundary.json"
grep -Fq '"work_credits_can_directly_mutate_validator_set":false' "$OUT/work-credits-accounting-boundary.json"
grep -Fq '"work_credits_automatic_governance_power":false' "$OUT/work-credits-accounting-boundary.json"
grep -Fq '"work_credits_indirect_influence_scope":"manual_operator_review_only"' "$OUT/work-credits-accounting-boundary.json"

grep -Fq '"public_routes_read_only":true' "$OUT/work-credits-accounting-boundary.json"
grep -Fq '"public_route_mutation_allowed":false' "$OUT/work-credits-accounting-boundary.json"
grep -Fq '"public_wc_award_allowed":false' "$OUT/work-credits-accounting-boundary.json"
grep -Fq '"public_wc_ledger_write_allowed":false' "$OUT/work-credits-accounting-boundary.json"
grep -Fq '"public_wc_to_void_swap_allowed":false' "$OUT/work-credits-accounting-boundary.json"
grep -Fq '"public_money_movement_allowed":false' "$OUT/work-credits-accounting-boundary.json"
grep -Fq '"public_wallet_send_allowed":false' "$OUT/work-credits-accounting-boundary.json"
grep -Fq '"public_validator_mutation_allowed":false' "$OUT/work-credits-accounting-boundary.json"
grep -Fq '"public_buy_void_fulfillment_allowed":false' "$OUT/work-credits-accounting-boundary.json"
grep -Fq '"public_review_record_write_allowed":false' "$OUT/work-credits-accounting-boundary.json"

grep -Fq '"public_evidence_can_be_referenced":true' "$OUT/work-credits-accounting-boundary.json"
grep -Fq '"public_evidence_can_create_automatic_award":false' "$OUT/work-credits-accounting-boundary.json"
grep -Fq '"candidate_state_requires_operator_review":true' "$OUT/work-credits-accounting-boundary.json"
grep -Fq '"review_record_requires_operator_action":true' "$OUT/work-credits-accounting-boundary.json"
grep -Fq '"award_intent_requires_operator_action":true' "$OUT/work-credits-accounting-boundary.json"
grep -Fq '"award_record_requires_operator_action":true' "$OUT/work-credits-accounting-boundary.json"
grep -Fq '"ledger_entry_requires_operator_action":true' "$OUT/work-credits-accounting-boundary.json"
grep -Fq '"duplicate_ledger_entry_check_required_before_write":true' "$OUT/work-credits-accounting-boundary.json"
grep -Fq '"positive_nonzero_wc_delta_required_before_write":true' "$OUT/work-credits-accounting-boundary.json"
grep -Fq '"source_hash_chain_required_before_write":true' "$OUT/work-credits-accounting-boundary.json"
grep -Fq '"exact_operator_confirmation_required_before_write":true' "$OUT/work-credits-accounting-boundary.json"
grep -Fq '"default_state":"blocked_not_ready_for_ledger_write"' "$OUT/work-credits-accounting-boundary.json"

grep -Fq '"automatic_wc_awards"' "$OUT/work-credits-accounting-boundary.json"
grep -Fq '"public_wc_minting"' "$OUT/work-credits-accounting-boundary.json"
grep -Fq '"wc_as_consensus_asset"' "$OUT/work-credits-accounting-boundary.json"
grep -Fq '"wc_block_finality_power"' "$OUT/work-credits-accounting-boundary.json"
grep -Fq '"wc_automatic_validator_admission"' "$OUT/work-credits-accounting-boundary.json"
grep -Fq '"public_money_movement"' "$OUT/work-credits-accounting-boundary.json"

grep -Fq '"public_route_can_execute_private_ledger_write":false' "$OUT/work-credits-accounting-boundary.json"
grep -Fq '"public_route_can_reveal_private_command":false' "$OUT/work-credits-accounting-boundary.json"

grep -Fq "/public-node/skeptic/work-credits-accounting-boundary-v1.json" "$OUT/route-index.json"
grep -Fq "VOID_PUBLIC_NODE_SKEPTIC_WORK_CREDITS_ACCOUNTING_BOUNDARY_V1" "$OUT/route-index.json"

grep -Fq "VOID_PUBLIC_NODE_SKEPTIC_WORK_CREDITS_ACCOUNTING_BOUNDARY_UI_V1" "$OUT/public-node.html"
grep -Fq "publicNodeSkepticWorkCreditsAccountingBoundaryCard" "$OUT/public-node.html"
grep -Fq "publicNodeSkepticWorkCreditsAccountingBoundaryLink" "$OUT/public-node.html"
grep -Fq "Work Credits Accounting Boundary" "$OUT/public-node.html"
grep -Fq "Work Credits are consensus asset" "$OUT/public-node.html"
grep -Fq "Public WC ledger write allowed" "$OUT/public-node.html"

echo "skeptic_work_credits_accounting_boundary_route_green=true"
echo "skeptic_work_credits_accounting_boundary_route_index_green=true"
echo "skeptic_work_credits_accounting_boundary_card_ui_green=true"
echo "skeptic_work_credits_accounting_boundary_doc_green=true"
echo "skeptic_wc_accounting_consensus_security_asset=VOID"
echo "skeptic_wc_accounting_work_credits_are_consensus_asset=false"
echo "skeptic_wc_accounting_work_credits_are_native_currency=false"
echo "skeptic_wc_accounting_work_credits_can_influence_block_finality=false"
echo "skeptic_wc_accounting_work_credits_can_directly_mutate_validator_set=false"
echo "skeptic_wc_accounting_public_wc_award_allowed=false"
echo "skeptic_wc_accounting_public_wc_ledger_write_allowed=false"
echo "skeptic_wc_accounting_public_wc_to_void_swap_allowed=false"
echo "skeptic_wc_accounting_public_money_movement_allowed=false"
echo "skeptic_wc_accounting_public_validator_mutation_allowed=false"
echo "skeptic_wc_accounting_public_evidence_can_create_automatic_award=false"
echo "skeptic_wc_accounting_manual_operator_review_only=true"
echo "skeptic_wc_accounting_public_route_can_execute_private_ledger_write=false"
echo "VOID_PUBLIC_NODE_SKEPTIC_WORK_CREDITS_ACCOUNTING_BOUNDARY_PROOF_V1_GREEN"
