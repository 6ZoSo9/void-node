#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

script="ops/private/wc-to-void-private-execute-command-hold-v1.sh"

test -x "$script"
bash -n "$script"

grep -F 'VOID_WC_TO_VOID_PRIVATE_EXECUTE_COMMAND_HOLD_V1' "$script" >/dev/null
grep -F 'execute_command_released' "$script" >/dev/null
grep -F 'execute_command_included' "$script" >/dev/null
grep -F 'recipient_identity_unresolved' "$script" >/dev/null
grep -F 'recipient_resolution_required' "$script" >/dev/null
grep -F 'money_movement_still_not_performed' "$script" >/dev/null
grep -F 'does_not_release_command' "$script" >/dev/null
grep -F 'does_not_send_void' "$script" >/dev/null
grep -F 'does_not_call_rpc' "$script" >/dev/null
grep -F 'does_not_read_private_key' "$script" >/dev/null
grep -F 'does_not_broadcast_tx' "$script" >/dev/null
grep -F 'does_not_write_settlement_ledger' "$script" >/dev/null

if grep -E 'cast send|eth_sendRawTransaction|sendTransaction|wallet send|MNEMONIC|PRIVATE_KEY=' "$script" >/dev/null; then
  echo "forbidden execution primitive found in command hold script" >&2
  exit 1
fi

bash ops/private/wc-to-void-duplicate-settlement-guard-v1.sh >/tmp/void-wc-to-void-command-hold-guard-run.log
grep -F 'VOID_WC_TO_VOID_DUPLICATE_SETTLEMENT_GUARD_V1_GREEN' /tmp/void-wc-to-void-command-hold-guard-run.log >/dev/null

out="/tmp/void-wc-to-void-private-execute-command-hold-v1-proof.json"

VOID_WC_TO_VOID_PRIVATE_EXECUTE_COMMAND_HOLD_OUT="$out" \
  "$script" >/tmp/void-wc-to-void-private-execute-command-hold-v1-proof-run.log

grep -F 'VOID_WC_TO_VOID_PRIVATE_EXECUTE_COMMAND_HOLD_V1_GREEN' /tmp/void-wc-to-void-private-execute-command-hold-v1-proof-run.log >/dev/null

python3 - "$out" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j["marker"] == "VOID_WC_TO_VOID_PRIVATE_EXECUTE_COMMAND_HOLD_V1"
assert j["hold_active"] is True
assert j["execute_command_released"] is False
assert j["execute_command_included"] is False
assert j["money_movement_performed"] is False
assert j["ready_for_real_execute"] is False
assert j["recipient_identity_unresolved"] is True
assert "recipient_identity_unresolved" in j["hold_reasons"]
assert j["approved_settlement"]["settlement_key"] == "4f31fe4b41846562af9a4ae0a5f27be6e6add9b93762750b3eeae33faf7eaf9e"
assert j["approved_settlement"]["preview_sha256"] == "f167b48114902fc39c90b8abc5447b376b71fbd719dc6bd23e5f335f465c77e8"
assert j["approved_settlement"]["approval_record_sha256"] == "2bed1bf6314fb6ef6c6908e356bf2b0d929cd9510e23c52a70fedbbdeeeda721"
assert j["approved_settlement"]["account"] == "unknown"
assert j["approved_settlement"]["recipient_known"] is False
assert j["approved_settlement"]["wc"] == "100"
assert j["approved_settlement"]["void"] == "1.000000"
assert j["preconditions"]["preconditions_green"] is True
assert j["release_requirements"]["recipient_address_required"] is True
assert j["release_requirements"]["recipient_address_present"] is False
assert j["release_requirements"]["operator_terminal_confirmation_required"] is True
assert j["closed_boundaries"]["does_not_release_command"] is True
assert j["closed_boundaries"]["does_not_include_cast_send"] is True
assert j["closed_boundaries"]["does_not_include_raw_transaction"] is True
assert j["closed_boundaries"]["does_not_send_void"] is True
assert j["closed_boundaries"]["does_not_call_rpc"] is True
assert j["closed_boundaries"]["does_not_read_private_key"] is True
assert j["closed_boundaries"]["does_not_broadcast_tx"] is True
assert j["closed_boundaries"]["does_not_write_settlement_ledger"] is True
assert j["next_required_gates"]["recipient_resolution_required"] is True
assert j["next_required_gates"]["money_movement_still_not_performed"] is True
print("VOID_WC_TO_VOID_PRIVATE_EXECUTE_COMMAND_HOLD_V1_JSON_ASSERT_GREEN")
PY

VOID_WC_TO_VOID_PRIVATE_EXECUTE_COMMAND_HOLD_OUT="/tmp/void-wc-to-void-private-execute-command-hold-v1-current.json" \
  "$script" >/tmp/void-wc-to-void-private-execute-command-hold-v1-current-run.log

grep -F 'VOID_WC_TO_VOID_PRIVATE_EXECUTE_COMMAND_HOLD_V1_GREEN' /tmp/void-wc-to-void-private-execute-command-hold-v1-current-run.log >/dev/null
grep -F '"execute_command_released": false' /tmp/void-wc-to-void-private-execute-command-hold-v1-current.json >/dev/null
grep -F '"execute_command_included": false' /tmp/void-wc-to-void-private-execute-command-hold-v1-current.json >/dev/null
grep -F '"recipient_identity_unresolved": true' /tmp/void-wc-to-void-private-execute-command-hold-v1-current.json >/dev/null
grep -F '"does_not_send_void": true' /tmp/void-wc-to-void-private-execute-command-hold-v1-current.json >/dev/null
grep -F '"does_not_call_rpc": true' /tmp/void-wc-to-void-private-execute-command-hold-v1-current.json >/dev/null

bash ops/private/wc-to-void-duplicate-settlement-guard-v1-proof.sh >/tmp/void-wc-to-void-command-hold-duplicate-proof.out
grep -F 'VOID_WC_TO_VOID_DUPLICATE_SETTLEMENT_GUARD_V1_PROOF_GREEN' /tmp/void-wc-to-void-command-hold-duplicate-proof.out >/dev/null

bash ops/mainnet0/public-mutation-method-boundary-audit-v1.sh >/tmp/void-wc-to-void-command-hold-mutation.out
grep -F 'VOID_PUBLIC_MUTATION_METHOD_BOUNDARY_AUDIT_V1_GREEN' /tmp/void-wc-to-void-command-hold-mutation.out >/dev/null
grep -F 'public_node_literal_mutation_handler_count=0' /tmp/void-wc-to-void-command-hold-mutation.out >/dev/null

bash ops/mainnet0/funding-gateway-card-v1-proof.sh >/tmp/void-wc-to-void-command-hold-funding.out
grep -F 'VOID_FUNDING_GATEWAY_CARD_V1_GREEN' /tmp/void-wc-to-void-command-hold-funding.out >/dev/null

echo "VOID_WC_TO_VOID_PRIVATE_EXECUTE_COMMAND_HOLD_V1_PROOF_GREEN"
