#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:4100}"
OUT="${OUT:-/tmp/void-public-node-ledger-entry-preview-reviewed-v1-proof}"
JSON="$OUT/ledger-entry-preview-reviewed.json"
HTML="$OUT/public-node.html"
ARTIFACT="$OUT/ledger-entry-preview.txt"

mkdir -p "$OUT"

echo "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_LEDGER_ENTRY_PREVIEW_REVIEWED_PROOF_V1"

grep -Fq "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_LEDGER_ENTRY_PREVIEW_REVIEWED_ROUTE_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_LEDGER_ENTRY_PREVIEW_REVIEWED_UI_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_LEDGER_ENTRY_PREVIEW_REVIEWED_DOC_V1" docs/public/public-node-operator-ledger-write-runbook-ledger-entry-preview-reviewed-v1.md

curl -fsS "$BASE_URL/public-node/operator-ledger-write-runbook-ledger-entry-preview-reviewed-v1.json" > "$JSON"
curl -fsS "$BASE_URL/public-node" > "$HTML"

while IFS= read -r expr; do
  [ -z "$expr" ] && continue
  jq -e "$expr" "$JSON" >/dev/null
done <<'EOF'
.marker=="VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_LEDGER_ENTRY_PREVIEW_REVIEWED_V1"
.status=="ledger_write_runbook_ledger_entry_preview_reviewed_only"
.state=="ledger_entry_preview_reviewed_no_live_write"
.public_read_only==true
.ledger_entry_preview_reviewed_only==true
.ledger_entry_preview_reviewed==true
.ledger_entry_preview_reviewed_by_operator==true
.previewed_entry_kind=="wc_delta"
.previewed_subject=="first_external_tester_operator_ledger_write_readiness_fixture"
.previewed_wc_delta==1
.previewed_wc_delta_unit=="WC"
.previewed_wc_delta_positive==true
.previewed_wc_delta_nonzero==true
.positive_nonzero_wc_delta_selected_by_operator==true
.selected_wc_delta==1
.selected_wc_delta_unit=="WC"
.duplicate_ledger_entry_check_green==true
.duplicate_entry_found==false
.duplicate_entry_count==0
.source_hash_chain_green==true
.final_operator_apply_present==false
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
.next_gate=="operator_ledger_write_runbook_final_operator_apply_present_v1"
EOF

grep -Fq "publicNodeOperatorLedgerWriteRunbookLedgerEntryPreviewReviewedCard" "$HTML"
grep -Fq "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_LEDGER_ENTRY_PREVIEW_REVIEWED_UI_V1" "$HTML"
grep -Fq "/public-node/operator-ledger-write-runbook-ledger-entry-preview-reviewed-v1.json" "$HTML"

cat > "$ARTIFACT" <<'EOF'
previewed_entry_kind=wc_delta
previewed_subject=first_external_tester_operator_ledger_write_readiness_fixture
previewed_wc_delta=1
previewed_wc_delta_unit=WC
ledger_entry_preview_reviewed=true
final_operator_apply_present=false
ledger_write_allowed_now=false
wc_ledger_write=false
wc_credit_delta_now=0
EOF

SHA="$(sha256sum "$ARTIFACT" | awk '{print $1}')"

echo "operator_ledger_write_runbook_ledger_entry_preview_reviewed=true"
echo "operator_ledger_write_runbook_ledger_entry_preview_reviewed_only=true"
echo "operator_ledger_write_runbook_ledger_entry_preview_reviewed_state=ledger_entry_preview_reviewed_no_live_write"
echo "operator_ledger_write_runbook_ledger_entry_preview_reviewed_artifact_created_now=true"
echo "operator_ledger_write_runbook_ledger_entry_preview_reviewed_tmp_only=true"
echo "operator_ledger_write_runbook_ledger_entry_preview_reviewed_sha256_green=true"
echo "operator_ledger_write_runbook_ledger_entry_preview_reviewed_sha256=$SHA"
echo "operator_ledger_write_runbook_ledger_entry_preview_reviewed_delta=1"
echo "operator_ledger_write_runbook_ledger_entry_preview_reviewed_delta_unit=WC"
echo "operator_ledger_write_runbook_ledger_entry_preview_reviewed_positive_nonzero_wc_delta_selected=true"
echo "operator_ledger_write_runbook_ledger_entry_preview_reviewed_final_operator_apply_present=false"
echo "operator_ledger_write_runbook_ledger_entry_preview_reviewed_ledger_write_allowed_now=false"
echo "operator_ledger_write_runbook_ledger_entry_preview_reviewed_wc_ledger_write=false"
echo "operator_ledger_write_runbook_ledger_entry_preview_reviewed_wc_credit_delta_now=0"
echo "operator_ledger_write_runbook_ledger_entry_preview_reviewed_next_gate=operator_ledger_write_runbook_final_operator_apply_present_v1"
echo "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_LEDGER_ENTRY_PREVIEW_REVIEWED_PROOF_V1_GREEN"
