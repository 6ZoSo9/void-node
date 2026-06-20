#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

script="ops/private/wc-to-void-recipient-resolution-v1.sh"

test -x "$script"
bash -n "$script"

grep -F 'VOID_WC_TO_VOID_RECIPIENT_RESOLUTION_V1' "$script" >/dev/null
grep -F 'recipient_resolved' "$script" >/dev/null
grep -F 'recipient_required' "$script" >/dev/null
grep -F '0x[a-fA-F0-9]{40}' "$script" >/dev/null
grep -F 'private_execute_command_release_allowed' "$script" >/dev/null
grep -F 'money_movement_still_not_performed' "$script" >/dev/null
grep -F 'does_not_release_command' "$script" >/dev/null
grep -F 'does_not_send_void' "$script" >/dev/null
grep -F 'does_not_call_rpc' "$script" >/dev/null
grep -F 'does_not_read_private_key' "$script" >/dev/null
grep -F 'does_not_write_settlement_ledger' "$script" >/dev/null

if grep -E 'cast send|eth_sendRawTransaction|sendTransaction|wallet send|MNEMONIC|PRIVATE_KEY=' "$script" >/dev/null; then
  echo "forbidden execution primitive found in recipient resolution script" >&2
  exit 1
fi

bash ops/private/wc-to-void-private-execute-command-hold-v1.sh >/tmp/void-wc-to-void-recipient-resolution-hold.log
grep -F 'VOID_WC_TO_VOID_PRIVATE_EXECUTE_COMMAND_HOLD_V1_GREEN' /tmp/void-wc-to-void-recipient-resolution-hold.log >/dev/null

required_out="/tmp/void-wc-to-void-recipient-resolution-v1-required.json"

set +e
VOID_WC_TO_VOID_RECIPIENT_RESOLUTION_OUT="$required_out" \
  "$script" >/tmp/void-wc-to-void-recipient-resolution-required.log
rc_required=$?
set -e

test "$rc_required" = "3"
grep -F 'VOID_WC_TO_VOID_RECIPIENT_RESOLUTION_V1_RECIPIENT_REQUIRED' /tmp/void-wc-to-void-recipient-resolution-required.log >/dev/null
grep -F '"recipient_resolved": false' "$required_out" >/dev/null
grep -F '"recipient_required": true' "$required_out" >/dev/null
grep -F '"does_not_send_void": true' "$required_out" >/dev/null
grep -F '"does_not_release_command": true' "$required_out" >/dev/null

resolved_out="/tmp/void-wc-to-void-recipient-resolution-v1-resolved-fixture.json"
fixture_recipient="0x1111111111111111111111111111111111111111"

VOID_WC_TO_VOID_RECIPIENT_ADDRESS="$fixture_recipient" \
VOID_WC_TO_VOID_RECIPIENT_LABEL="fixture-recipient" \
VOID_WC_TO_VOID_RECIPIENT_RESOLUTION_OUT="$resolved_out" \
  "$script" >/tmp/void-wc-to-void-recipient-resolution-resolved.log

grep -F 'VOID_WC_TO_VOID_RECIPIENT_RESOLUTION_V1_GREEN' /tmp/void-wc-to-void-recipient-resolution-resolved.log >/dev/null

python3 - "$resolved_out" "$fixture_recipient" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
addr=sys.argv[2]
assert j["marker"] == "VOID_WC_TO_VOID_RECIPIENT_RESOLUTION_V1"
assert j["recipient_resolved"] is True
assert j["recipient_required"] is False
assert j["recipient"]["address"] == addr
assert j["recipient"]["label"] == "fixture-recipient"
assert j["approved_settlement"]["settlement_key"] == "4f31fe4b41846562af9a4ae0a5f27be6e6add9b93762750b3eeae33faf7eaf9e"
assert j["approved_settlement"]["preview_sha256"] == "f167b48114902fc39c90b8abc5447b376b71fbd719dc6bd23e5f335f465c77e8"
assert j["approved_settlement"]["approval_record_sha256"] == "2bed1bf6314fb6ef6c6908e356bf2b0d929cd9510e23c52a70fedbbdeeeda721"
assert j["approved_settlement"]["account"] == "unknown"
assert j["approved_settlement"]["wc"] == "100"
assert j["approved_settlement"]["void"] == "1.000000"
assert j["release_state"]["private_execute_command_release_allowed"] is False
assert j["release_state"]["release_blocked_until_separate_command_release_lane"] is True
assert j["release_state"]["money_movement_still_not_performed"] is True
assert j["closed_boundaries"]["does_not_release_command"] is True
assert j["closed_boundaries"]["does_not_send_void"] is True
assert j["closed_boundaries"]["does_not_call_rpc"] is True
assert j["closed_boundaries"]["does_not_read_private_key"] is True
assert j["closed_boundaries"]["does_not_write_settlement_ledger"] is True
print("VOID_WC_TO_VOID_RECIPIENT_RESOLUTION_V1_JSON_ASSERT_GREEN")
PY

# Current record remains unresolved unless operator supplies a real recipient address.
current_out="/tmp/void-wc-to-void-recipient-resolution-v1-current-required.json"

set +e
VOID_WC_TO_VOID_RECIPIENT_RESOLUTION_OUT="$current_out" \
  "$script" >/tmp/void-wc-to-void-recipient-resolution-current-required.log
rc_current=$?
set -e

test "$rc_current" = "3"
grep -F 'VOID_WC_TO_VOID_RECIPIENT_RESOLUTION_V1_RECIPIENT_REQUIRED' /tmp/void-wc-to-void-recipient-resolution-current-required.log >/dev/null
grep -F '"recipient_resolved": false' "$current_out" >/dev/null
grep -F '"recipient_required": true' "$current_out" >/dev/null

bash ops/private/wc-to-void-private-execute-command-hold-v1-proof.sh >/tmp/void-wc-to-void-recipient-resolution-hold-proof.out
grep -F 'VOID_WC_TO_VOID_PRIVATE_EXECUTE_COMMAND_HOLD_V1_PROOF_GREEN' /tmp/void-wc-to-void-recipient-resolution-hold-proof.out >/dev/null

bash ops/mainnet0/public-mutation-method-boundary-audit-v1.sh >/tmp/void-wc-to-void-recipient-resolution-mutation.out
grep -F 'VOID_PUBLIC_MUTATION_METHOD_BOUNDARY_AUDIT_V1_GREEN' /tmp/void-wc-to-void-recipient-resolution-mutation.out >/dev/null
grep -F 'public_node_literal_mutation_handler_count=0' /tmp/void-wc-to-void-recipient-resolution-mutation.out >/dev/null

bash ops/mainnet0/funding-gateway-card-v1-proof.sh >/tmp/void-wc-to-void-recipient-resolution-funding.out
grep -F 'VOID_FUNDING_GATEWAY_CARD_V1_GREEN' /tmp/void-wc-to-void-recipient-resolution-funding.out >/dev/null

echo "VOID_WC_TO_VOID_RECIPIENT_RESOLUTION_V1_PROOF_GREEN"
