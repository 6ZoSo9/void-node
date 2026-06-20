#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

script="ops/private/wc-to-void-settlement-preview-v1.sh"

test -x "$script"
bash -n "$script"

grep -F 'VOID_WC_TO_VOID_SETTLEMENT_PREVIEW_V1' "$script" >/dev/null
grep -F 'preview_only' "$script" >/dev/null
grep -F 'no_money_movement' "$script" >/dev/null
grep -F 'tx_broadcast' "$script" >/dev/null
grep -F 'private_key_required' "$script" >/dev/null
grep -F 'does_not_send_void' "$script" >/dev/null
grep -F 'requires_operator_approval_record' "$script" >/dev/null
grep -F 'requires_duplicate_guard' "$script" >/dev/null
grep -F 'requires_explicit_private_execute_command' "$script" >/dev/null

if grep -E 'cast send|eth_sendRawTransaction|sendTransaction|PRIVATE_KEY|MNEMONIC|wallet send' "$script" >/dev/null; then
  echo "forbidden money movement primitive found in preview script" >&2
  exit 1
fi

fixture="/tmp/void-wc-to-void-settlement-preview-v1-fixture-ledger.jsonl"
out="/tmp/void-wc-to-void-settlement-preview-v1-proof.json"

cat > "$fixture" <<'JSONL'
{"account":"alice","wc_delta":250,"receipt_id":"r1","source_hash":"source-a"}
{"account":"alice","wc_delta":-50,"receipt_id":"r2","source_hash":"source-b"}
{"account":"bob","wc_delta":40,"receipt_id":"r3","source_hash":"source-c"}
JSONL

VOID_WC_SETTLEMENT_PREVIEW_LEDGER="$fixture" \
VOID_WC_SETTLEMENT_ACCOUNT="alice" \
VOID_WC_TO_VOID_RATE_WC_PER_VOID="100" \
VOID_WC_TO_VOID_PREVIEW_MAX_VOID="1" \
VOID_WC_TO_VOID_SETTLEMENT_PREVIEW_OUT="$out" \
  "$script" > /tmp/void-wc-to-void-settlement-preview-v1-proof-run.log

grep -F 'VOID_WC_TO_VOID_SETTLEMENT_PREVIEW_V1_GREEN' /tmp/void-wc-to-void-settlement-preview-v1-proof-run.log >/dev/null

python3 - "$out" <<'PY'
import json, sys
p = sys.argv[1]
j = json.load(open(p))
assert j["marker"] == "VOID_WC_TO_VOID_SETTLEMENT_PREVIEW_V1"
assert j["preview_only"] is True
assert j["no_money_movement"] is True
assert j["tx_broadcast"] is False
assert j["private_key_required"] is False
assert j["public_route_added"] is False
assert j["ledger_write"] is False
assert j["selected_account"] == "alice"
assert j["selected_balance_wc"] == "200"
assert j["proposed_settlement"]["eligible"] is True
assert j["proposed_settlement"]["proposed_void_delta"] == "1.000000"
assert j["proposed_settlement"]["requires_operator_approval_record"] is True
assert j["proposed_settlement"]["requires_duplicate_guard"] is True
assert j["proposed_settlement"]["requires_explicit_private_execute_command"] is True
assert j["proposed_settlement"]["execution_command_included"] is False
assert j["closed_boundaries"]["does_not_send_void"] is True
assert j["closed_boundaries"]["does_not_call_rpc"] is True
assert j["closed_boundaries"]["does_not_read_private_key"] is True
assert j["closed_boundaries"]["does_not_modify_ledger"] is True
print("VOID_WC_TO_VOID_SETTLEMENT_PREVIEW_V1_JSON_ASSERT_GREEN")
PY

# Actual repo/current environment preview: may or may not be eligible, but must remain preview-only.
VOID_WC_TO_VOID_SETTLEMENT_PREVIEW_OUT="/tmp/void-wc-to-void-settlement-preview-v1-current.json" \
  "$script" > /tmp/void-wc-to-void-settlement-preview-v1-current-run.log

grep -F 'VOID_WC_TO_VOID_SETTLEMENT_PREVIEW_V1_GREEN' /tmp/void-wc-to-void-settlement-preview-v1-current-run.log >/dev/null
grep -F '"preview_only": true' /tmp/void-wc-to-void-settlement-preview-v1-current.json >/dev/null
grep -F '"tx_broadcast": false' /tmp/void-wc-to-void-settlement-preview-v1-current.json >/dev/null
grep -F '"ledger_write": false' /tmp/void-wc-to-void-settlement-preview-v1-current.json >/dev/null

bash ops/mainnet0/public-mutation-method-boundary-audit-v1.sh >/tmp/void-wc-to-void-preview-mutation.out
grep -F 'VOID_PUBLIC_MUTATION_METHOD_BOUNDARY_AUDIT_V1_GREEN' /tmp/void-wc-to-void-preview-mutation.out >/dev/null
grep -F 'public_node_literal_mutation_handler_count=0' /tmp/void-wc-to-void-preview-mutation.out >/dev/null

bash ops/mainnet0/funding-gateway-card-v1-proof.sh >/tmp/void-wc-to-void-preview-funding.out
grep -F 'VOID_FUNDING_GATEWAY_CARD_V1_GREEN' /tmp/void-wc-to-void-preview-funding.out >/dev/null

echo "VOID_WC_TO_VOID_SETTLEMENT_PREVIEW_V1_PROOF_GREEN"
