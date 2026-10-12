#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:4100}"
OUT="${OUT:-/tmp/void-public-node-all-required-gates-green-v1-proof}"
JSON="$OUT/all-required-gates-green.json"
HTML="$OUT/public-node.html"
ARTIFACT="$OUT/all-required-gates-green.txt"

mkdir -p "$OUT"

echo "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_ALL_REQUIRED_GATES_GREEN_PROOF_V1"

grep -Fq "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_ALL_REQUIRED_GATES_GREEN_ROUTE_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_ALL_REQUIRED_GATES_GREEN_UI_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_ALL_REQUIRED_GATES_GREEN_DOC_V1" docs/public/public-node-operator-ledger-write-runbook-all-required-gates-green-v1.md

curl -fsS "$BASE_URL/public-node/operator-ledger-write-runbook-all-required-gates-green-v1.json" > "$JSON"
curl -fsS "$BASE_URL/public-node" > "$HTML"

jq -e '.marker=="VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_ALL_REQUIRED_GATES_GREEN_V1"' "$JSON" >/dev/null
jq -e '.status=="ledger_write_runbook_all_required_gates_green_only"' "$JSON" >/dev/null
jq -e '.state=="all_required_gates_green_no_live_write"' "$JSON" >/dev/null
jq -e '.public_read_only==true' "$JSON" >/dev/null
jq -e '.all_required_gates_green==true' "$JSON" >/dev/null
jq -e '.source_hash_chain_green==true' "$JSON" >/dev/null
jq -e '.duplicate_ledger_entry_check_green==true' "$JSON" >/dev/null
jq -e '.positive_nonzero_wc_delta_selected_by_operator==true' "$JSON" >/dev/null
jq -e '.ledger_entry_preview_reviewed==true' "$JSON" >/dev/null
jq -e '.final_operator_apply_present==true' "$JSON" >/dev/null
jq -e '.selected_wc_delta==1' "$JSON" >/dev/null
jq -e '.selected_wc_delta_unit=="WC"' "$JSON" >/dev/null

jq -e '.ready_for_ledger_write==false' "$JSON" >/dev/null
jq -e '.ready_for_credit_award==false' "$JSON" >/dev/null
jq -e '.live_runtime_write==false' "$JSON" >/dev/null
jq -e '.ledger_write_allowed_now==false' "$JSON" >/dev/null
jq -e '.wc_ledger_write==false' "$JSON" >/dev/null
jq -e '.wc_ledger_mutated_now==false' "$JSON" >/dev/null
jq -e '.wc_credit_award==false' "$JSON" >/dev/null
jq -e '.wc_credit_delta_now==0' "$JSON" >/dev/null
jq -e '.wc_to_void_swap==false' "$JSON" >/dev/null
jq -e '.wallet_send==false' "$JSON" >/dev/null
jq -e '.validator_mutation_open==false' "$JSON" >/dev/null
jq -e '.next_gate=="operator_ledger_write_runbook_ready_for_ledger_write_v1"' "$JSON" >/dev/null

grep -Fq "publicNodeOperatorLedgerWriteRunbookAllRequiredGatesGreenCard" "$HTML"
grep -Fq "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_ALL_REQUIRED_GATES_GREEN_UI_V1" "$HTML"
grep -Fq "/public-node/operator-ledger-write-runbook-all-required-gates-green-v1.json" "$HTML"

cat > "$ARTIFACT" <<'EOF'
all_required_gates_green=true
selected_wc_delta=1
selected_wc_delta_unit=WC
ready_for_ledger_write=false
ledger_write_allowed_now=false
wc_ledger_write=false
wc_credit_delta_now=0
EOF

SHA="$(sha256sum "$ARTIFACT" | awk '{print $1}')"

echo "operator_ledger_write_runbook_all_required_gates_green=true"
echo "operator_ledger_write_runbook_all_required_gates_green_only=true"
echo "operator_ledger_write_runbook_all_required_gates_green_state=all_required_gates_green_no_live_write"
echo "operator_ledger_write_runbook_all_required_gates_green_sha256_green=true"
echo "operator_ledger_write_runbook_all_required_gates_green_sha256=$SHA"
echo "operator_ledger_write_runbook_all_required_gates_green_delta=1"
echo "operator_ledger_write_runbook_all_required_gates_green_delta_unit=WC"
echo "operator_ledger_write_runbook_all_required_gates_green_ready_for_ledger_write=false"
echo "operator_ledger_write_runbook_all_required_gates_green_ledger_write_allowed_now=false"
echo "operator_ledger_write_runbook_all_required_gates_green_wc_ledger_write=false"
echo "operator_ledger_write_runbook_all_required_gates_green_wc_credit_delta_now=0"
echo "operator_ledger_write_runbook_all_required_gates_green_next_gate=operator_ledger_write_runbook_ready_for_ledger_write_v1"
echo "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_ALL_REQUIRED_GATES_GREEN_PROOF_V1_GREEN"
