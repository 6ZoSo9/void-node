#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

script="ops/private/wc-to-void-operator-approval-apply-v1.sh"

test -x "$script"
bash -n "$script"

grep -F 'VOID_WC_TO_VOID_OPERATOR_APPROVAL_APPLY_V1' "$script" >/dev/null
grep -F 'YES_APPROVE_EXACT_WC_TO_VOID_PREVIEW_F167B481' "$script" >/dev/null
grep -F 'f167b48114902fc39c90b8abc5447b376b71fbd719dc6bd23e5f335f465c77e8' "$script" >/dev/null
grep -F 'expected_account="unknown"' "$script" >/dev/null
grep -F 'expected_wc="100"' "$script" >/dev/null
grep -F 'expected_void="1.000000"' "$script" >/dev/null
grep -F 'money_movement_still_not_performed' "$script" >/dev/null
grep -F 'does_not_send_void' "$script" >/dev/null
grep -F 'does_not_call_rpc' "$script" >/dev/null
grep -F 'does_not_read_private_key' "$script" >/dev/null
grep -F 'does_not_include_execution_command' "$script" >/dev/null

if grep -E 'cast send|eth_sendRawTransaction|sendTransaction|wallet send|MNEMONIC|PRIVATE_KEY=' "$script" >/dev/null; then
  echo "forbidden execution primitive found in approval apply script" >&2
  exit 1
fi

set +e
"$script" >/tmp/void-wc-to-void-operator-approval-apply-no-confirm.log
rc_no_confirm=$?
set -e

test "$rc_no_confirm" = "3"
grep -F 'VOID_WC_TO_VOID_OPERATOR_APPROVAL_APPLY_V1_CONFIRMATION_REQUIRED' /tmp/void-wc-to-void-operator-approval-apply-no-confirm.log >/dev/null

VOID_WC_TO_VOID_OPERATOR_APPROVE_EXACT_CURRENT_PREVIEW="YES_APPROVE_EXACT_WC_TO_VOID_PREVIEW_F167B481" \
  "$script" >/tmp/void-wc-to-void-operator-approval-apply-confirmed.log

grep -F 'VOID_WC_TO_VOID_OPERATOR_APPROVAL_APPLY_V1_JSON_ASSERT_GREEN' /tmp/void-wc-to-void-operator-approval-apply-confirmed.log >/dev/null
grep -F 'VOID_WC_TO_VOID_OPERATOR_APPROVAL_APPLY_V1_GREEN' /tmp/void-wc-to-void-operator-approval-apply-confirmed.log >/dev/null

approved="/tmp/void-wc-to-void-operator-approval-apply-v1-approved.json"

grep -F '"operator_approved": true' "$approved" >/dev/null
grep -F '"approval_required": false' "$approved" >/dev/null
grep -F '"money_movement_still_not_performed": true' "$approved" >/dev/null
grep -F '"does_not_send_void": true' "$approved" >/dev/null
grep -F '"does_not_call_rpc": true' "$approved" >/dev/null
grep -F '"does_not_read_private_key": true' "$approved" >/dev/null
grep -F '"does_not_include_execution_command": true' "$approved" >/dev/null

bash ops/private/wc-to-void-operator-approval-record-v1-proof.sh >/tmp/void-wc-to-void-approval-apply-record-proof.out
grep -F 'VOID_WC_TO_VOID_OPERATOR_APPROVAL_RECORD_V1_PROOF_GREEN' /tmp/void-wc-to-void-approval-apply-record-proof.out >/dev/null

bash ops/private/wc-to-void-settlement-preview-v1-proof.sh >/tmp/void-wc-to-void-approval-apply-preview-proof.out
grep -F 'VOID_WC_TO_VOID_SETTLEMENT_PREVIEW_V1_PROOF_GREEN' /tmp/void-wc-to-void-approval-apply-preview-proof.out >/dev/null

bash ops/mainnet0/public-mutation-method-boundary-audit-v1.sh >/tmp/void-wc-to-void-approval-apply-mutation.out
grep -F 'VOID_PUBLIC_MUTATION_METHOD_BOUNDARY_AUDIT_V1_GREEN' /tmp/void-wc-to-void-approval-apply-mutation.out >/dev/null
grep -F 'public_node_literal_mutation_handler_count=0' /tmp/void-wc-to-void-approval-apply-mutation.out >/dev/null

bash ops/mainnet0/funding-gateway-card-v1-proof.sh >/tmp/void-wc-to-void-approval-apply-funding.out
grep -F 'VOID_FUNDING_GATEWAY_CARD_V1_GREEN' /tmp/void-wc-to-void-approval-apply-funding.out >/dev/null

echo "VOID_WC_TO_VOID_OPERATOR_APPROVAL_APPLY_V1_PROOF_GREEN"
