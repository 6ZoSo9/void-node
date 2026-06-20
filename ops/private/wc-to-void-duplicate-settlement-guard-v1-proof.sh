#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

script="ops/private/wc-to-void-duplicate-settlement-guard-v1.sh"

test -x "$script"
bash -n "$script"

grep -F 'VOID_WC_TO_VOID_DUPLICATE_SETTLEMENT_GUARD_V1' "$script" >/dev/null
grep -F 'duplicate_found' "$script" >/dev/null
grep -F 'settlement_key' "$script" >/dev/null
grep -F 'approval_record_sha256' "$script" >/dev/null
grep -F 'f167b48114902fc39c90b8abc5447b376b71fbd719dc6bd23e5f335f465c77e8' "$script" >/dev/null
grep -F '2bed1bf6314fb6ef6c6908e356bf2b0d929cd9510e23c52a70fedbbdeeeda721' "$script" >/dev/null
grep -F 'money_movement_still_not_performed' "$script" >/dev/null
grep -F 'does_not_write_settlement_ledger' "$script" >/dev/null
grep -F 'does_not_send_void' "$script" >/dev/null
grep -F 'does_not_call_rpc' "$script" >/dev/null
grep -F 'does_not_read_private_key' "$script" >/dev/null
grep -F 'does_not_include_execution_command' "$script" >/dev/null

if grep -E 'cast send|eth_sendRawTransaction|sendTransaction|wallet send|MNEMONIC|PRIVATE_KEY=' "$script" >/dev/null; then
  echo "forbidden execution primitive found in duplicate guard script" >&2
  exit 1
fi

VOID_WC_TO_VOID_OPERATOR_APPROVE_EXACT_CURRENT_PREVIEW="YES_APPROVE_EXACT_WC_TO_VOID_PREVIEW_F167B481" \
  bash ops/private/wc-to-void-operator-approval-apply-v1.sh >/tmp/void-wc-to-void-duplicate-guard-approval.log

grep -F 'VOID_WC_TO_VOID_OPERATOR_APPROVAL_APPLY_V1_GREEN' /tmp/void-wc-to-void-duplicate-guard-approval.log >/dev/null

empty_ledger="/tmp/void-wc-to-void-duplicate-guard-empty-ledger.jsonl"
dup_ledger="/tmp/void-wc-to-void-duplicate-guard-dup-ledger.jsonl"
out_ok="/tmp/void-wc-to-void-duplicate-settlement-guard-v1-ok.json"
out_dup="/tmp/void-wc-to-void-duplicate-settlement-guard-v1-dup.json"

: > "$empty_ledger"

VOID_WC_TO_VOID_SETTLEMENT_LEDGER="$empty_ledger" \
VOID_WC_TO_VOID_DUPLICATE_GUARD_OUT="$out_ok" \
  "$script" >/tmp/void-wc-to-void-duplicate-guard-ok.log

grep -F 'VOID_WC_TO_VOID_DUPLICATE_SETTLEMENT_GUARD_V1_GREEN' /tmp/void-wc-to-void-duplicate-guard-ok.log >/dev/null

python3 - "$out_ok" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j["marker"] == "VOID_WC_TO_VOID_DUPLICATE_SETTLEMENT_GUARD_V1"
assert j["guard_passed"] is True
assert j["duplicate_found"] is False
assert j["preconditions"]["preconditions_green"] is True
assert j["approved_record"]["preview_sha256"] == "f167b48114902fc39c90b8abc5447b376b71fbd719dc6bd23e5f335f465c77e8"
assert j["approved_record"]["approval_record_sha256"] == "2bed1bf6314fb6ef6c6908e356bf2b0d929cd9510e23c52a70fedbbdeeeda721"
assert j["approved_record"]["account"] == "unknown"
assert j["approved_record"]["wc"] == "100"
assert j["approved_record"]["void"] == "1.000000"
assert j["next_required_gates"]["private_execute_command_hold_required"] is True
assert j["next_required_gates"]["money_movement_still_not_performed"] is True
assert j["closed_boundaries"]["does_not_write_settlement_ledger"] is True
assert j["closed_boundaries"]["does_not_send_void"] is True
assert j["closed_boundaries"]["does_not_call_rpc"] is True
assert j["closed_boundaries"]["does_not_read_private_key"] is True
assert j["closed_boundaries"]["does_not_include_execution_command"] is True
print("VOID_WC_TO_VOID_DUPLICATE_SETTLEMENT_GUARD_V1_JSON_ASSERT_GREEN")
PY

settlement_key="$(python3 - "$out_ok" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
print(j["settlement_key"])
PY
)"

printf '{"settlement_key":"%s","preview_sha256":"f167b48114902fc39c90b8abc5447b376b71fbd719dc6bd23e5f335f465c77e8","approval_record_sha256":"2bed1bf6314fb6ef6c6908e356bf2b0d929cd9510e23c52a70fedbbdeeeda721"}\n' "$settlement_key" > "$dup_ledger"

set +e
VOID_WC_TO_VOID_SETTLEMENT_LEDGER="$dup_ledger" \
VOID_WC_TO_VOID_DUPLICATE_GUARD_OUT="$out_dup" \
  "$script" >/tmp/void-wc-to-void-duplicate-guard-dup.log
rc_dup=$?
set -e

test "$rc_dup" = "4"
grep -F 'VOID_WC_TO_VOID_DUPLICATE_SETTLEMENT_GUARD_V1_DUPLICATE_FOUND' /tmp/void-wc-to-void-duplicate-guard-dup.log >/dev/null
grep -F '"duplicate_found": true' "$out_dup" >/dev/null
grep -F '"guard_passed": false' "$out_dup" >/dev/null

# Current repo/private settlement ledger state. This must be no-duplicate before command-hold can be built.
VOID_WC_TO_VOID_DUPLICATE_GUARD_OUT="/tmp/void-wc-to-void-duplicate-settlement-guard-v1-current.json" \
  "$script" >/tmp/void-wc-to-void-duplicate-guard-current.log

grep -F 'VOID_WC_TO_VOID_DUPLICATE_SETTLEMENT_GUARD_V1_GREEN' /tmp/void-wc-to-void-duplicate-guard-current.log >/dev/null
grep -F '"guard_passed": true' /tmp/void-wc-to-void-duplicate-settlement-guard-v1-current.json >/dev/null
grep -F '"duplicate_found": false' /tmp/void-wc-to-void-duplicate-settlement-guard-v1-current.json >/dev/null
grep -F '"does_not_send_void": true' /tmp/void-wc-to-void-duplicate-settlement-guard-v1-current.json >/dev/null
grep -F '"does_not_write_settlement_ledger": true' /tmp/void-wc-to-void-duplicate-settlement-guard-v1-current.json >/dev/null

bash ops/private/wc-to-void-operator-approval-apply-v1-proof.sh >/tmp/void-wc-to-void-duplicate-guard-apply-proof.out
grep -F 'VOID_WC_TO_VOID_OPERATOR_APPROVAL_APPLY_V1_PROOF_GREEN' /tmp/void-wc-to-void-duplicate-guard-apply-proof.out >/dev/null

bash ops/mainnet0/public-mutation-method-boundary-audit-v1.sh >/tmp/void-wc-to-void-duplicate-guard-mutation.out
grep -F 'VOID_PUBLIC_MUTATION_METHOD_BOUNDARY_AUDIT_V1_GREEN' /tmp/void-wc-to-void-duplicate-guard-mutation.out >/dev/null
grep -F 'public_node_literal_mutation_handler_count=0' /tmp/void-wc-to-void-duplicate-guard-mutation.out >/dev/null

bash ops/mainnet0/funding-gateway-card-v1-proof.sh >/tmp/void-wc-to-void-duplicate-guard-funding.out
grep -F 'VOID_FUNDING_GATEWAY_CARD_V1_GREEN' /tmp/void-wc-to-void-duplicate-guard-funding.out >/dev/null

echo "VOID_WC_TO_VOID_DUPLICATE_SETTLEMENT_GUARD_V1_PROOF_GREEN"
