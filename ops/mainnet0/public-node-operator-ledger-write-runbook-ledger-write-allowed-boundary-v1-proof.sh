#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:4100}"
OUT="${OUT:-/tmp/void-public-node-ledger-write-allowed-boundary-v1-proof}"
JSON="$OUT/ledger-write-allowed-boundary.json"
HTML="$OUT/public-node.html"
ARTIFACT="$OUT/ledger-write-allowed-boundary.txt"

mkdir -p "$OUT"

echo "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_LEDGER_WRITE_ALLOWED_BOUNDARY_PROOF_V1"

grep -Fq "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_LEDGER_WRITE_ALLOWED_BOUNDARY_ROUTE_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_LEDGER_WRITE_ALLOWED_BOUNDARY_UI_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_LEDGER_WRITE_ALLOWED_BOUNDARY_DOC_V1" docs/public/public-node-operator-ledger-write-runbook-ledger-write-allowed-boundary-v1.md

curl -fsS "$BASE_URL/public-node/operator-ledger-write-runbook-ledger-write-allowed-boundary-v1.json" > "$JSON"
curl -fsS "$BASE_URL/public-node" > "$HTML"

jq -e '.marker=="VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_LEDGER_WRITE_ALLOWED_BOUNDARY_V1"' "$JSON" >/dev/null
jq -e '.status=="ledger_write_allowed_boundary_reviewed_only"' "$JSON" >/dev/null
jq -e '.state=="ledger_write_allowed_boundary_no_live_write"' "$JSON" >/dev/null
jq -e '.public_read_only==true' "$JSON" >/dev/null
jq -e '.ledger_write_allowed_boundary_reviewed==true' "$JSON" >/dev/null
jq -e '.all_required_gates_green==true' "$JSON" >/dev/null
jq -e '.ready_for_ledger_write==true' "$JSON" >/dev/null
jq -e '.selected_wc_delta==1' "$JSON" >/dev/null
jq -e '.selected_wc_delta_unit=="WC"' "$JSON" >/dev/null

jq -e '.ready_for_credit_award==false' "$JSON" >/dev/null
jq -e '.live_runtime_write==false' "$JSON" >/dev/null
jq -e '.ledger_write_allowed_now==false' "$JSON" >/dev/null
jq -e '.ledger_record_created_now==false' "$JSON" >/dev/null
jq -e '.ledger_entry_created_now==false' "$JSON" >/dev/null
jq -e '.wc_ledger_write==false' "$JSON" >/dev/null
jq -e '.wc_ledger_mutated_now==false' "$JSON" >/dev/null
jq -e '.wc_credit_award==false' "$JSON" >/dev/null
jq -e '.wc_credit_delta_now==0' "$JSON" >/dev/null
jq -e '.automatic_ledger_write_allowed==false' "$JSON" >/dev/null
jq -e '.operator_must_confirm_write_after_this_gate==true' "$JSON" >/dev/null
jq -e '.next_gate=="operator_ledger_write_runbook_explicit_operator_ledger_write_allowance_v1"' "$JSON" >/dev/null

grep -Fq "publicNodeOperatorLedgerWriteRunbookLedgerWriteAllowedBoundaryCard" "$HTML"
grep -Fq "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_LEDGER_WRITE_ALLOWED_BOUNDARY_UI_V1" "$HTML"
grep -Fq "/public-node/operator-ledger-write-runbook-ledger-write-allowed-boundary-v1.json" "$HTML"

cat > "$ARTIFACT" <<'EOF'
ledger_write_allowed_boundary_reviewed=true
ready_for_ledger_write=true
selected_wc_delta=1
selected_wc_delta_unit=WC
ledger_write_allowed_now=false
wc_ledger_write=false
wc_credit_delta_now=0
operator_must_confirm_write_after_this_gate=true
EOF

SHA="$(sha256sum "$ARTIFACT" | awk '{print $1}')"

echo "operator_ledger_write_runbook_ledger_write_allowed_boundary_reviewed=true"
echo "operator_ledger_write_runbook_ledger_write_allowed_boundary_only=true"
echo "operator_ledger_write_runbook_ledger_write_allowed_boundary_state=ledger_write_allowed_boundary_no_live_write"
echo "operator_ledger_write_runbook_ledger_write_allowed_boundary_sha256_green=true"
echo "operator_ledger_write_runbook_ledger_write_allowed_boundary_sha256=$SHA"
echo "operator_ledger_write_runbook_ledger_write_allowed_boundary_delta=1"
echo "operator_ledger_write_runbook_ledger_write_allowed_boundary_delta_unit=WC"
echo "operator_ledger_write_runbook_ledger_write_allowed_boundary_ledger_write_allowed_now=false"
echo "operator_ledger_write_runbook_ledger_write_allowed_boundary_wc_ledger_write=false"
echo "operator_ledger_write_runbook_ledger_write_allowed_boundary_wc_credit_delta_now=0"
echo "operator_ledger_write_runbook_ledger_write_allowed_boundary_operator_must_confirm_write_after_this_gate=true"
echo "operator_ledger_write_runbook_ledger_write_allowed_boundary_next_gate=operator_ledger_write_runbook_explicit_operator_ledger_write_allowance_v1"
echo "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_LEDGER_WRITE_ALLOWED_BOUNDARY_PROOF_V1_GREEN"
