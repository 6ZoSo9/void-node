#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

script="ops/private/wc-to-void-private-execute-command-release-v1.sh"

test -x "$script"
bash -n "$script"

grep -F 'VOID_WC_TO_VOID_PRIVATE_EXECUTE_COMMAND_RELEASE_V1' "$script" >/dev/null
grep -F 'YES_RELEASE_EXACT_WC_TO_VOID_MANUAL_EXECUTE_PACKET_E51BCC67' "$script" >/dev/null
grep -F 'e51bcc6713e24fd9eec7d577329bf10662f3b2fca60f044db61f7ea15072eea3' "$script" >/dev/null
grep -F '003df09356eed9b5045dafdd492f9fafe140012f6aee1a8976a3b959c6ed4671' "$script" >/dev/null
grep -F 'b76db82f5a3a86e4fb2d3e5800327d1618108c24c721aed1222737f7ff99d9c9' "$script" >/dev/null
grep -F 'does_not_execute_command' "$script" >/dev/null
grep -F 'does_not_broadcast_tx' "$script" >/dev/null
grep -F 'does_not_call_rpc' "$script" >/dev/null
grep -F 'does_not_read_private_key' "$script" >/dev/null
grep -F 'does_not_send_void' "$script" >/dev/null
grep -F 'does_not_store_plaintext_recipient_in_repo_code' "$script" >/dev/null

if grep -E 'cast send|eth_sendRawTransaction|sendTransaction|PRIVATE_KEY=|MNEMONIC=' "$script" >/dev/null; then
  echo "forbidden execution primitive found in release script" >&2
  exit 1
fi

if [ -z "${VOID_WC_TO_VOID_RECIPIENT_ADDRESS:-}" ]; then
  echo "VOID_WC_TO_VOID_PRIVATE_EXECUTE_COMMAND_RELEASE_V1_TEST_RECIPIENT_ENV_REQUIRED"
  exit 3
fi

hold_out="/tmp/void-wc-to-void-private-execute-command-release-v1-approval-required.json"

set +e
VOID_WC_TO_VOID_PRIVATE_EXECUTE_COMMAND_RELEASE_OUT="$hold_out" \
  "$script" >/tmp/void-wc-to-void-private-execute-command-release-v1-approval-required.log
rc_hold=$?
set -e

test "$rc_hold" = "4"
grep -F 'VOID_WC_TO_VOID_PRIVATE_EXECUTE_COMMAND_RELEASE_V1_APPROVAL_REQUIRED' /tmp/void-wc-to-void-private-execute-command-release-v1-approval-required.log >/dev/null

python3 - "$hold_out" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j["marker"] == "VOID_WC_TO_VOID_PRIVATE_EXECUTE_COMMAND_RELEASE_V1"
assert j["private_execute_command_release_allowed"] is False
assert j["operator_release_approved"] is False
assert j["manual_execute_command_release"]["command_released_as_text_only"] is False
assert j["recipient"]["address"] == ""
assert j["recipient"]["plaintext_address_not_written_to_repo_code"] is True
assert j["closed_boundaries"]["does_not_execute_command"] is True
assert j["closed_boundaries"]["does_not_send_void"] is True
assert j["closed_boundaries"]["does_not_call_rpc"] is True
assert j["closed_boundaries"]["does_not_read_private_key"] is True
assert j["next_required_gates"]["money_movement_still_not_performed"] is True
print("VOID_WC_TO_VOID_PRIVATE_EXECUTE_COMMAND_RELEASE_V1_HOLD_JSON_ASSERT_GREEN")
PY

release_out="/tmp/void-wc-to-void-private-execute-command-release-v1-proof.json"

VOID_WC_TO_VOID_RELEASE_EXACT_APPROVAL="YES_RELEASE_EXACT_WC_TO_VOID_MANUAL_EXECUTE_PACKET_E51BCC67" \
VOID_WC_TO_VOID_PRIVATE_EXECUTE_COMMAND_RELEASE_OUT="$release_out" \
  "$script" >/tmp/void-wc-to-void-private-execute-command-release-v1-release.log

grep -F 'VOID_WC_TO_VOID_PRIVATE_EXECUTE_COMMAND_RELEASE_V1_GREEN' /tmp/void-wc-to-void-private-execute-command-release-v1-release.log >/dev/null

python3 - "$release_out" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j["marker"] == "VOID_WC_TO_VOID_PRIVATE_EXECUTE_COMMAND_RELEASE_V1"
assert j["private_execute_command_release_allowed"] is True
assert j["operator_release_approved"] is True
assert j["manual_execute_command_release"]["command_released_as_text_only"] is True
assert j["manual_execute_command_release"]["command_not_executed_by_this_script"] is True
assert j["recipient"]["address_sha256"] == "b76db82f5a3a86e4fb2d3e5800327d1618108c24c721aed1222737f7ff99d9c9"
assert j["recipient_resolution_apply"]["recipient_resolution_apply_sha256"] == "e51bcc6713e24fd9eec7d577329bf10662f3b2fca60f044db61f7ea15072eea3"
assert j["recipient_resolution_apply"]["recipient_resolution_sha256"] == "003df09356eed9b5045dafdd492f9fafe140012f6aee1a8976a3b959c6ed4671"
assert j["closed_boundaries"]["does_not_execute_command"] is True
assert j["closed_boundaries"]["does_not_broadcast_tx"] is True
assert j["closed_boundaries"]["does_not_send_void"] is True
assert j["closed_boundaries"]["does_not_call_rpc"] is True
assert j["closed_boundaries"]["does_not_read_private_key"] is True
assert j["next_required_gates"]["manual_execution_still_required"] is True
assert j["next_required_gates"]["money_movement_still_not_performed"] is True
print("VOID_WC_TO_VOID_PRIVATE_EXECUTE_COMMAND_RELEASE_V1_RELEASE_JSON_ASSERT_GREEN")
PY

env -u VOID_WC_TO_VOID_RECIPIENT_ADDRESS \
  -u VOID_WC_TO_VOID_RECIPIENT_LABEL \
  -u VOID_WC_TO_VOID_RECIPIENT_RESOLUTION_OUT \
  bash ops/private/wc-to-void-recipient-resolution-v1-proof.sh >/tmp/void-wc-to-void-private-release-recipient-proof.out
grep -F 'VOID_WC_TO_VOID_RECIPIENT_RESOLUTION_V1_PROOF_GREEN' /tmp/void-wc-to-void-private-release-recipient-proof.out >/dev/null

bash ops/mainnet0/public-mutation-method-boundary-audit-v1.sh >/tmp/void-wc-to-void-private-release-mutation.out
grep -F 'VOID_PUBLIC_MUTATION_METHOD_BOUNDARY_AUDIT_V1_GREEN' /tmp/void-wc-to-void-private-release-mutation.out >/dev/null
grep -F 'public_node_literal_mutation_handler_count=0' /tmp/void-wc-to-void-private-release-mutation.out >/dev/null

echo "VOID_WC_TO_VOID_PRIVATE_EXECUTE_COMMAND_RELEASE_V1_PROOF_GREEN"
