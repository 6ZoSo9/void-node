#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

script="ops/private/wc-to-void-operator-terminal-execute-request-v1.sh"

test -x "$script"
bash -n "$script"

grep -F 'VOID_WC_TO_VOID_OPERATOR_TERMINAL_EXECUTE_REQUEST_V1' "$script" >/dev/null
grep -F 'YES_REQUEST_EXACT_WC_TO_VOID_OPERATOR_TERMINAL_EXECUTE_PACKET_88BC15E3' "$script" >/dev/null
grep -F '88bc15e33afe845561733ed1fc1f9d71d362f6e5e28ea5bd7f6c095d6598dc40' "$script" >/dev/null
grep -F 'buy_void_is_canonical_funding_route' "$script" >/dev/null
grep -F 'no_duplicate_funding_surface_added' "$script" >/dev/null
grep -F 'does_not_execute_command' "$script" >/dev/null
grep -F 'does_not_broadcast_tx' "$script" >/dev/null
grep -F 'does_not_call_rpc' "$script" >/dev/null
grep -F 'does_not_read_private_key' "$script" >/dev/null
grep -F 'does_not_send_void' "$script" >/dev/null
grep -F 'does_not_create_duplicate_funding_route' "$script" >/dev/null

if grep -E 'cast send|eth_sendRawTransaction|sendTransaction|PRIVATE_KEY=|MNEMONIC=|seed phrase' "$script" >/dev/null; then
  echo "forbidden execution/private-key primitive found in terminal execute request script" >&2
  exit 1
fi

if [ -z "${VOID_WC_TO_VOID_RECIPIENT_ADDRESS:-}" ]; then
  echo "VOID_WC_TO_VOID_OPERATOR_TERMINAL_EXECUTE_REQUEST_V1_TEST_RECIPIENT_ENV_REQUIRED"
  exit 3
fi

hold_out="/tmp/void-wc-to-void-operator-terminal-execute-request-v1-approval-required.json"

set +e
VOID_WC_TO_VOID_OPERATOR_TERMINAL_EXECUTE_REQUEST_OUT="$hold_out" \
  "$script" >/tmp/void-wc-to-void-operator-terminal-execute-request-v1-approval-required.log
rc_hold=$?
set -e

test "$rc_hold" = "4"
grep -F 'VOID_WC_TO_VOID_OPERATOR_TERMINAL_EXECUTE_REQUEST_V1_APPROVAL_REQUIRED' /tmp/void-wc-to-void-operator-terminal-execute-request-v1-approval-required.log >/dev/null

python3 - "$hold_out" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j["marker"] == "VOID_WC_TO_VOID_OPERATOR_TERMINAL_EXECUTE_REQUEST_V1"
assert j["operator_terminal_execute_requested"] is False
assert j["operator_request_approved"] is False
assert j["terminal_execute_request"]["request_released_as_text_only"] is False
assert j["terminal_execute_request"]["request_does_not_execute"] is True
assert j["recipient"]["address"] == ""
assert j["buy_void_funding_route_alignment"]["buy_void_is_canonical_funding_route"] is True
assert j["buy_void_funding_route_alignment"]["no_duplicate_funding_surface_added"] is True
assert j["closed_boundaries"]["does_not_execute_command"] is True
assert j["closed_boundaries"]["does_not_send_void"] is True
assert j["closed_boundaries"]["does_not_call_rpc"] is True
assert j["closed_boundaries"]["does_not_read_private_key"] is True
assert j["closed_boundaries"]["does_not_create_duplicate_funding_route"] is True
assert j["next_required_gates"]["money_movement_still_not_performed"] is True
print("VOID_WC_TO_VOID_OPERATOR_TERMINAL_EXECUTE_REQUEST_V1_HOLD_JSON_ASSERT_GREEN")
PY

request_out="/tmp/void-wc-to-void-operator-terminal-execute-request-v1-proof.json"

VOID_WC_TO_VOID_OPERATOR_TERMINAL_EXECUTE_REQUEST_APPROVAL="YES_REQUEST_EXACT_WC_TO_VOID_OPERATOR_TERMINAL_EXECUTE_PACKET_88BC15E3" \
VOID_WC_TO_VOID_OPERATOR_TERMINAL_EXECUTE_REQUEST_OUT="$request_out" \
  "$script" >/tmp/void-wc-to-void-operator-terminal-execute-request-v1-request.log

grep -F 'VOID_WC_TO_VOID_OPERATOR_TERMINAL_EXECUTE_REQUEST_V1_GREEN' /tmp/void-wc-to-void-operator-terminal-execute-request-v1-request.log >/dev/null

python3 - "$request_out" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j["marker"] == "VOID_WC_TO_VOID_OPERATOR_TERMINAL_EXECUTE_REQUEST_V1"
assert j["operator_terminal_execute_requested"] is True
assert j["operator_request_approved"] is True
assert j["manual_execute_packet_sha256"] == "88bc15e33afe845561733ed1fc1f9d71d362f6e5e28ea5bd7f6c095d6598dc40"
assert j["terminal_execute_request"]["request_released_as_text_only"] is True
assert j["terminal_execute_request"]["request_does_not_execute"] is True
assert j["terminal_execute_request"]["request_does_not_include_private_key"] is True
assert j["terminal_execute_request"]["operator_must_execute_in_separate_terminal_step"] is True
assert j["buy_void_funding_route_alignment"]["buy_void_is_canonical_funding_route"] is True
assert j["buy_void_funding_route_alignment"]["no_duplicate_funding_surface_added"] is True
assert j["closed_boundaries"]["does_not_execute_command"] is True
assert j["closed_boundaries"]["does_not_broadcast_tx"] is True
assert j["closed_boundaries"]["does_not_send_void"] is True
assert j["closed_boundaries"]["does_not_call_rpc"] is True
assert j["closed_boundaries"]["does_not_read_private_key"] is True
assert j["closed_boundaries"]["does_not_create_duplicate_funding_route"] is True
assert j["next_required_gates"]["actual_operator_terminal_execution_required"] is True
assert j["next_required_gates"]["private_key_must_remain_local_only"] is True
assert j["next_required_gates"]["money_movement_still_not_performed"] is True
print("VOID_WC_TO_VOID_OPERATOR_TERMINAL_EXECUTE_REQUEST_V1_REQUEST_JSON_ASSERT_GREEN")
PY

VOID_WC_TO_VOID_OPERATOR_TERMINAL_EXECUTE_REQUEST_OUT="/tmp/void-wc-to-void-operator-terminal-execute-request-v1-current.json" \
VOID_WC_TO_VOID_OPERATOR_TERMINAL_EXECUTE_REQUEST_APPROVAL="YES_REQUEST_EXACT_WC_TO_VOID_OPERATOR_TERMINAL_EXECUTE_PACKET_88BC15E3" \
  "$script" >/tmp/void-wc-to-void-operator-terminal-execute-request-v1-current.log

grep -F 'VOID_WC_TO_VOID_OPERATOR_TERMINAL_EXECUTE_REQUEST_V1_GREEN' /tmp/void-wc-to-void-operator-terminal-execute-request-v1-current.log >/dev/null
grep -F '"operator_terminal_execute_requested": true' /tmp/void-wc-to-void-operator-terminal-execute-request-v1-current.json >/dev/null
grep -F '"money_movement_still_not_performed": true' /tmp/void-wc-to-void-operator-terminal-execute-request-v1-current.json >/dev/null
grep -F '"does_not_execute_command": true' /tmp/void-wc-to-void-operator-terminal-execute-request-v1-current.json >/dev/null
grep -F '"does_not_create_duplicate_funding_route": true' /tmp/void-wc-to-void-operator-terminal-execute-request-v1-current.json >/dev/null

bash ops/mainnet0/public-mutation-method-boundary-audit-v1.sh >/tmp/void-wc-to-void-terminal-request-mutation.out
grep -F 'VOID_PUBLIC_MUTATION_METHOD_BOUNDARY_AUDIT_V1_GREEN' /tmp/void-wc-to-void-terminal-request-mutation.out >/dev/null
grep -F 'public_node_literal_mutation_handler_count=0' /tmp/void-wc-to-void-terminal-request-mutation.out >/dev/null

echo "VOID_WC_TO_VOID_OPERATOR_TERMINAL_EXECUTE_REQUEST_V1_PROOF_GREEN"
