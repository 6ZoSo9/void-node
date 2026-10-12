#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:4100}"
OUT="${OUT:-/tmp/void-public-node-final-operator-apply-present-v1-proof}"
JSON="$OUT/final-operator-apply-present.json"
HTML="$OUT/public-node.html"
ARTIFACT="$OUT/final-operator-apply-present.txt"

mkdir -p "$OUT"

echo "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_FINAL_OPERATOR_APPLY_PRESENT_PROOF_V1"

grep -Fq "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_FINAL_OPERATOR_APPLY_PRESENT_ROUTE_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_FINAL_OPERATOR_APPLY_PRESENT_UI_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_FINAL_OPERATOR_APPLY_PRESENT_DOC_V1" docs/public/public-node-operator-ledger-write-runbook-final-operator-apply-present-v1.md

curl -fsS "$BASE_URL/public-node/operator-ledger-write-runbook-final-operator-apply-present-v1.json" > "$JSON"
curl -fsS "$BASE_URL/public-node" > "$HTML"

while IFS= read -r expr; do
  [ -z "$expr" ] && continue
  jq -e "$expr" "$JSON" >/dev/null
done <<'EOF'
.marker=="VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_FINAL_OPERATOR_APPLY_PRESENT_V1"
.status=="ledger_write_runbook_final_operator_apply_present_only"
.state=="final_operator_apply_present_no_live_write"
.public_read_only==true
.final_operator_apply_present_only==true
.final_operator_apply_present==true
.final_operator_apply_present_by_operator==true
.ledger_entry_preview_reviewed==true
.previewed_entry_kind=="wc_delta"
.previewed_subject=="first_external_tester_operator_ledger_write_readiness_fixture"
.previewed_wc_delta==1
.previewed_wc_delta_unit=="WC"
.positive_nonzero_wc_delta_selected_by_operator==true
.selected_wc_delta==1
.selected_wc_delta_unit=="WC"
.duplicate_ledger_entry_check_green==true
.duplicate_entry_found==false
.duplicate_entry_count==0
.source_hash_chain_green==true
.all_required_gates_green==false
.ready_for_ledger_write==false
.ready_for_credit_award==false
.live_runtime_write==false
.ledger_write_allowed_now==false
.ledger_record_created_now==false
.ledger_entry_created_now==false
.award_record_created_now==false
.award_created_now==false
.wc_ledger_write==false
.wc_ledger_mutated_now==false
.wc_credit_award==false
.wc_credit_delta_now==0
.wc_to_void_swap==false
.wallet_send==false
.validator_mutation_open==false
.money_movement_open==false
.automatic_ledger_write_allowed==false
.next_gate=="operator_ledger_write_runbook_all_required_gates_green_v1"
EOF

grep -Fq "publicNodeOperatorLedgerWriteRunbookFinalOperatorApplyPresentCard" "$HTML"
grep -Fq "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_FINAL_OPERATOR_APPLY_PRESENT_UI_V1" "$HTML"
grep -Fq "/public-node/operator-ledger-write-runbook-final-operator-apply-present-v1.json" "$HTML"

cat > "$ARTIFACT" <<'EOF'
final_operator_apply_present=true
previewed_entry_kind=wc_delta
previewed_subject=first_external_tester_operator_ledger_write_readiness_fixture
previewed_wc_delta=1
previewed_wc_delta_unit=WC
all_required_gates_green=false
ledger_write_allowed_now=false
wc_ledger_write=false
wc_credit_delta_now=0
EOF

SHA="$(sha256sum "$ARTIFACT" | awk '{print $1}')"

echo "operator_ledger_write_runbook_final_operator_apply_present=true"
echo "operator_ledger_write_runbook_final_operator_apply_present_only=true"
echo "operator_ledger_write_runbook_final_operator_apply_present_state=final_operator_apply_present_no_live_write"
echo "operator_ledger_write_runbook_final_operator_apply_present_artifact_created_now=true"
echo "operator_ledger_write_runbook_final_operator_apply_present_tmp_only=true"
echo "operator_ledger_write_runbook_final_operator_apply_present_sha256_green=true"
echo "operator_ledger_write_runbook_final_operator_apply_present_sha256=$SHA"
echo "operator_ledger_write_runbook_final_operator_apply_present_delta=1"
echo "operator_ledger_write_runbook_final_operator_apply_present_delta_unit=WC"
echo "operator_ledger_write_runbook_final_operator_apply_present_ledger_entry_preview_reviewed=true"
echo "operator_ledger_write_runbook_final_operator_apply_present_all_required_gates_green=false"
echo "operator_ledger_write_runbook_final_operator_apply_present_ledger_write_allowed_now=false"
echo "operator_ledger_write_runbook_final_operator_apply_present_wc_ledger_write=false"
echo "operator_ledger_write_runbook_final_operator_apply_present_wc_credit_delta_now=0"
echo "operator_ledger_write_runbook_final_operator_apply_present_next_gate=operator_ledger_write_runbook_all_required_gates_green_v1"
echo "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_FINAL_OPERATOR_APPLY_PRESENT_PROOF_V1_GREEN"
