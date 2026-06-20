#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

script="ops/private/wc-to-void-operator-approval-record-v1.sh"
preview_script="ops/private/wc-to-void-settlement-preview-v1.sh"

test -x "$script"
test -x "$preview_script"
bash -n "$script"

grep -F 'VOID_WC_TO_VOID_OPERATOR_APPROVAL_RECORD_V1' "$script" >/dev/null
grep -F 'approval_phrase_required' "$script" >/dev/null
grep -F 'operator_approved' "$script" >/dev/null
grep -F 'preview_sha256' "$script" >/dev/null
grep -F 'duplicate_guard_required' "$script" >/dev/null
grep -F 'private_execute_command_required' "$script" >/dev/null
grep -F 'money_movement_still_not_performed' "$script" >/dev/null
grep -F 'does_not_send_void' "$script" >/dev/null
grep -F 'does_not_call_rpc' "$script" >/dev/null
grep -F 'does_not_read_private_key' "$script" >/dev/null
grep -F 'does_not_broadcast_tx' "$script" >/dev/null
grep -F 'does_not_include_execution_command' "$script" >/dev/null

if grep -E 'cast send|eth_sendRawTransaction|sendTransaction|wallet send|MNEMONIC|PRIVATE_KEY=' "$script" >/dev/null; then
  echo "forbidden execution primitive found in operator approval record script" >&2
  exit 1
fi

fixture="/tmp/void-wc-to-void-operator-approval-fixture-ledger.jsonl"
preview="/tmp/void-wc-to-void-operator-approval-preview.json"
required="/tmp/void-wc-to-void-operator-approval-required.json"
approved="/tmp/void-wc-to-void-operator-approval-approved.json"

cat > "$fixture" <<'JSONL'
{"account":"alice","wc_delta":250,"receipt_id":"r1","source_hash":"source-a"}
{"account":"alice","wc_delta":-50,"receipt_id":"r2","source_hash":"source-b"}
JSONL

VOID_WC_SETTLEMENT_PREVIEW_LEDGER="$fixture" \
VOID_WC_SETTLEMENT_ACCOUNT="alice" \
VOID_WC_TO_VOID_RATE_WC_PER_VOID="100" \
VOID_WC_TO_VOID_PREVIEW_MAX_VOID="1" \
VOID_WC_TO_VOID_SETTLEMENT_PREVIEW_OUT="$preview" \
  "$preview_script" >/tmp/void-wc-to-void-operator-approval-preview-run.log

grep -F 'VOID_WC_TO_VOID_SETTLEMENT_PREVIEW_V1_GREEN' /tmp/void-wc-to-void-operator-approval-preview-run.log >/dev/null

set +e
VOID_WC_TO_VOID_PREVIEW_JSON="$preview" \
VOID_WC_TO_VOID_OPERATOR_APPROVAL_RECORD_OUT="$required" \
VOID_OPERATOR_ID="zoso" \
  "$script" >/tmp/void-wc-to-void-operator-approval-required-run.log
rc_required=$?
set -e

test "$rc_required" = "3"
grep -F 'VOID_WC_TO_VOID_OPERATOR_APPROVAL_RECORD_V1_APPROVAL_REQUIRED' /tmp/void-wc-to-void-operator-approval-required-run.log >/dev/null
grep -F '"operator_approved": false' "$required" >/dev/null
grep -F '"does_not_send_void": true' "$required" >/dev/null
grep -F '"does_not_broadcast_tx": true' "$required" >/dev/null
grep -F '"does_not_include_execution_command": true' "$required" >/dev/null

phrase="$(python3 - "$required" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
print(j["approval_phrase_required"])
PY
)"

VOID_WC_TO_VOID_PREVIEW_JSON="$preview" \
VOID_WC_TO_VOID_OPERATOR_APPROVAL_RECORD_OUT="$approved" \
VOID_OPERATOR_ID="zoso" \
VOID_WC_TO_VOID_OPERATOR_APPROVAL_PHRASE="$phrase" \
  "$script" >/tmp/void-wc-to-void-operator-approval-approved-run.log

grep -F 'VOID_WC_TO_VOID_OPERATOR_APPROVAL_RECORD_V1_GREEN' /tmp/void-wc-to-void-operator-approval-approved-run.log >/dev/null

python3 - "$approved" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j["marker"] == "VOID_WC_TO_VOID_OPERATOR_APPROVAL_RECORD_V1"
assert j["operator_approved"] is True
assert j["approval_required"] is False
assert j["preview"]["selected_account"] == "alice"
assert j["preview"]["selected_balance_wc"] == "200"
assert j["preview"]["proposed_void_delta"] == "1.000000"
assert j["preconditions"]["preconditions_green"] is True
assert j["next_required_gates"]["duplicate_guard_required"] is True
assert j["next_required_gates"]["private_execute_command_required"] is True
assert j["next_required_gates"]["money_movement_still_not_performed"] is True
assert j["closed_boundaries"]["does_not_send_void"] is True
assert j["closed_boundaries"]["does_not_call_rpc"] is True
assert j["closed_boundaries"]["does_not_read_private_key"] is True
assert j["closed_boundaries"]["does_not_modify_ledger"] is True
assert j["closed_boundaries"]["does_not_broadcast_tx"] is True
assert j["closed_boundaries"]["does_not_include_execution_command"] is True
print("VOID_WC_TO_VOID_OPERATOR_APPROVAL_RECORD_V1_JSON_ASSERT_GREEN")
PY

# Current repo preview remains approval-required unless the operator supplies the exact phrase out of band.
VOID_WC_TO_VOID_SETTLEMENT_PREVIEW_OUT="/tmp/void-wc-to-void-settlement-preview-v1-current.json" \
  "$preview_script" >/tmp/void-wc-to-void-operator-approval-current-preview-run.log

set +e
VOID_WC_TO_VOID_PREVIEW_JSON="/tmp/void-wc-to-void-settlement-preview-v1-current.json" \
VOID_WC_TO_VOID_OPERATOR_APPROVAL_RECORD_OUT="/tmp/void-wc-to-void-operator-approval-record-v1-current-required.json" \
VOID_OPERATOR_ID="zoso" \
  "$script" >/tmp/void-wc-to-void-operator-approval-current-required-run.log
rc_current_required=$?
set -e

test "$rc_current_required" = "3"
grep -F 'VOID_WC_TO_VOID_OPERATOR_APPROVAL_RECORD_V1_APPROVAL_REQUIRED' /tmp/void-wc-to-void-operator-approval-current-required-run.log >/dev/null
grep -F '"operator_approved": false' /tmp/void-wc-to-void-operator-approval-record-v1-current-required.json >/dev/null
grep -F '"does_not_send_void": true' /tmp/void-wc-to-void-operator-approval-record-v1-current-required.json >/dev/null
grep -F '"does_not_call_rpc": true' /tmp/void-wc-to-void-operator-approval-record-v1-current-required.json >/dev/null
grep -F '"does_not_include_execution_command": true' /tmp/void-wc-to-void-operator-approval-record-v1-current-required.json >/dev/null

bash ops/private/wc-to-void-settlement-preview-v1-proof.sh >/tmp/void-wc-to-void-approval-preview-proof.out
grep -F 'VOID_WC_TO_VOID_SETTLEMENT_PREVIEW_V1_PROOF_GREEN' /tmp/void-wc-to-void-approval-preview-proof.out >/dev/null

bash ops/mainnet0/public-mutation-method-boundary-audit-v1.sh >/tmp/void-wc-to-void-approval-mutation.out
grep -F 'VOID_PUBLIC_MUTATION_METHOD_BOUNDARY_AUDIT_V1_GREEN' /tmp/void-wc-to-void-approval-mutation.out >/dev/null
grep -F 'public_node_literal_mutation_handler_count=0' /tmp/void-wc-to-void-approval-mutation.out >/dev/null

bash ops/mainnet0/funding-gateway-card-v1-proof.sh >/tmp/void-wc-to-void-approval-funding.out
grep -F 'VOID_FUNDING_GATEWAY_CARD_V1_GREEN' /tmp/void-wc-to-void-approval-funding.out >/dev/null

echo "VOID_WC_TO_VOID_OPERATOR_APPROVAL_RECORD_V1_PROOF_GREEN"
