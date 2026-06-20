#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

confirm="${VOID_WC_TO_VOID_OPERATOR_APPROVE_EXACT_CURRENT_PREVIEW:-}"
expected_confirm="YES_APPROVE_EXACT_WC_TO_VOID_PREVIEW_F167B481"

preview="/tmp/void-wc-to-void-settlement-preview-v1-current.json"
required="/tmp/void-wc-to-void-operator-approval-apply-v1-required.json"
approved="/tmp/void-wc-to-void-operator-approval-apply-v1-approved.json"

expected_preview_sha="f167b48114902fc39c90b8abc5447b376b71fbd719dc6bd23e5f335f465c77e8"
expected_account="unknown"
expected_wc="100"
expected_void="1.000000"

if [ "$confirm" != "$expected_confirm" ]; then
  echo "VOID_WC_TO_VOID_OPERATOR_APPROVAL_APPLY_V1_CONFIRMATION_REQUIRED"
  echo "required_confirm=$expected_confirm"
  exit 3
fi

VOID_WC_TO_VOID_SETTLEMENT_PREVIEW_OUT="$preview" \
  ops/private/wc-to-void-settlement-preview-v1.sh >/tmp/void-wc-to-void-operator-approval-apply-preview.log

set +e
VOID_WC_TO_VOID_PREVIEW_JSON="$preview" \
VOID_WC_TO_VOID_OPERATOR_APPROVAL_RECORD_OUT="$required" \
VOID_OPERATOR_ID="zoso" \
  ops/private/wc-to-void-operator-approval-record-v1.sh >/tmp/void-wc-to-void-operator-approval-apply-required.log
rc_required=$?
set -e

if [ "$rc_required" != "3" ]; then
  echo "expected approval-required state before applying approval, got rc=$rc_required" >&2
  exit 1
fi

phrase="$(python3 - "$required" "$expected_preview_sha" "$expected_account" "$expected_wc" "$expected_void" <<'PY'
import json, sys

p, want_sha, want_account, want_wc, want_void = sys.argv[1:]
j = json.load(open(p))

assert j["marker"] == "VOID_WC_TO_VOID_OPERATOR_APPROVAL_RECORD_V1"
assert j["operator_approved"] is False
assert j["approval_required"] is True
assert j["preconditions"]["preconditions_green"] is True
assert j["preview"]["sha256"] == want_sha
assert j["preview"]["selected_account"] == want_account
assert j["preview"]["selected_balance_wc"] == want_wc
assert j["preview"]["proposed_void_delta"] == want_void
assert j["closed_boundaries"]["does_not_send_void"] is True
assert j["closed_boundaries"]["does_not_call_rpc"] is True
assert j["closed_boundaries"]["does_not_read_private_key"] is True
assert j["closed_boundaries"]["does_not_include_execution_command"] is True

print(j["approval_phrase_required"])
PY
)"

VOID_WC_TO_VOID_PREVIEW_JSON="$preview" \
VOID_WC_TO_VOID_OPERATOR_APPROVAL_RECORD_OUT="$approved" \
VOID_OPERATOR_ID="zoso" \
VOID_WC_TO_VOID_OPERATOR_APPROVAL_PHRASE="$phrase" \
  ops/private/wc-to-void-operator-approval-record-v1.sh >/tmp/void-wc-to-void-operator-approval-apply-approved.log

grep -F 'VOID_WC_TO_VOID_OPERATOR_APPROVAL_RECORD_V1_GREEN' /tmp/void-wc-to-void-operator-approval-apply-approved.log >/dev/null

python3 - "$approved" "$expected_preview_sha" "$expected_account" "$expected_wc" "$expected_void" <<'PY'
import json, sys

p, want_sha, want_account, want_wc, want_void = sys.argv[1:]
j = json.load(open(p))

assert j["marker"] == "VOID_WC_TO_VOID_OPERATOR_APPROVAL_RECORD_V1"
assert j["operator_approved"] is True
assert j["approval_required"] is False
assert j["preview"]["sha256"] == want_sha
assert j["preview"]["selected_account"] == want_account
assert j["preview"]["selected_balance_wc"] == want_wc
assert j["preview"]["proposed_void_delta"] == want_void
assert j["next_required_gates"]["duplicate_guard_required"] is True
assert j["next_required_gates"]["private_execute_command_required"] is True
assert j["next_required_gates"]["operator_terminal_confirmation_required"] is True
assert j["next_required_gates"]["money_movement_still_not_performed"] is True
assert j["closed_boundaries"]["does_not_send_void"] is True
assert j["closed_boundaries"]["does_not_call_rpc"] is True
assert j["closed_boundaries"]["does_not_read_private_key"] is True
assert j["closed_boundaries"]["does_not_modify_ledger"] is True
assert j["closed_boundaries"]["does_not_broadcast_tx"] is True
assert j["closed_boundaries"]["does_not_include_execution_command"] is True
print("VOID_WC_TO_VOID_OPERATOR_APPROVAL_APPLY_V1_JSON_ASSERT_GREEN")
PY

echo "VOID_WC_TO_VOID_OPERATOR_APPROVAL_APPLY_V1_GREEN"
echo "approved_record=$approved"
