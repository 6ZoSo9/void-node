#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

script="ops/private/wc-to-void-recipient-resolution-apply-v1.sh"

test -x "$script"
bash -n "$script"

grep -F 'VOID_WC_TO_VOID_RECIPIENT_RESOLUTION_APPLY_V1' "$script" >/dev/null
grep -F 'b76db82f5a3a86e4fb2d3e5800327d1618108c24c721aed1222737f7ff99d9c9' "$script" >/dev/null
grep -F '003df09356eed9b5045dafdd492f9fafe140012f6aee1a8976a3b959c6ed4671' "$script" >/dev/null
grep -F 'private_execute_command_release_allowed' "$script" >/dev/null
grep -F 'money_movement_still_not_performed' "$script" >/dev/null
grep -F 'does_not_store_plaintext_recipient_in_repo_code' "$script" >/dev/null
grep -F 'does_not_release_command' "$script" >/dev/null
grep -F 'does_not_send_void' "$script" >/dev/null
grep -F 'does_not_call_rpc' "$script" >/dev/null
grep -F 'does_not_read_private_key' "$script" >/dev/null

if grep -E 'cast send|eth_sendRawTransaction|sendTransaction|wallet send|MNEMONIC|PRIVATE_KEY=' "$script" >/dev/null; then
  echo "forbidden execution primitive found in recipient apply script" >&2
  exit 1
fi

if [ -z "${VOID_WC_TO_VOID_RECIPIENT_ADDRESS:-}" ]; then
  echo "VOID_WC_TO_VOID_RECIPIENT_RESOLUTION_APPLY_V1_TEST_RECIPIENT_ENV_REQUIRED"
  exit 3
fi

out="/tmp/void-wc-to-void-recipient-resolution-apply-v1-proof.json"

VOID_WC_TO_VOID_RECIPIENT_LABEL="${VOID_WC_TO_VOID_RECIPIENT_LABEL:-first-wc-to-void-recipient}" \
VOID_WC_TO_VOID_RECIPIENT_RESOLUTION_APPLY_OUT="$out" \
  "$script" >/tmp/void-wc-to-void-recipient-resolution-apply-proof-run.log

grep -F 'VOID_WC_TO_VOID_RECIPIENT_RESOLUTION_APPLY_V1_GREEN' /tmp/void-wc-to-void-recipient-resolution-apply-proof-run.log >/dev/null

python3 - "$out" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j["marker"] == "VOID_WC_TO_VOID_RECIPIENT_RESOLUTION_APPLY_V1"
assert j["recipient_resolution_applied"] is True
assert j["recipient_resolution"]["recipient_resolved"] is True
assert j["recipient_resolution"]["recipient_resolution_sha256"] == "003df09356eed9b5045dafdd492f9fafe140012f6aee1a8976a3b959c6ed4671"
assert j["recipient_resolution"]["recipient_address_sha256"] == "b76db82f5a3a86e4fb2d3e5800327d1618108c24c721aed1222737f7ff99d9c9"
assert j["approved_settlement"]["settlement_key"] == "4f31fe4b41846562af9a4ae0a5f27be6e6add9b93762750b3eeae33faf7eaf9e"
assert j["approved_settlement"]["preview_sha256"] == "f167b48114902fc39c90b8abc5447b376b71fbd719dc6bd23e5f335f465c77e8"
assert j["approved_settlement"]["approval_record_sha256"] == "2bed1bf6314fb6ef6c6908e356bf2b0d929cd9510e23c52a70fedbbdeeeda721"
assert j["approved_settlement"]["wc"] == "100"
assert j["approved_settlement"]["void"] == "1.000000"
assert j["release_state"]["private_execute_command_release_allowed"] is False
assert j["release_state"]["money_movement_still_not_performed"] is True
assert j["closed_boundaries"]["does_not_release_command"] is True
assert j["closed_boundaries"]["does_not_send_void"] is True
assert j["closed_boundaries"]["does_not_call_rpc"] is True
assert j["closed_boundaries"]["does_not_read_private_key"] is True
assert j["closed_boundaries"]["does_not_store_plaintext_recipient_in_repo_code"] is True
print("VOID_WC_TO_VOID_RECIPIENT_RESOLUTION_APPLY_V1_JSON_ASSERT_GREEN")
PY

VOID_WC_TO_VOID_RECIPIENT_RESOLUTION_APPLY_OUT="/tmp/void-wc-to-void-recipient-resolution-apply-v1-current.json" \
  "$script" >/tmp/void-wc-to-void-recipient-resolution-apply-current-run.log

grep -F 'VOID_WC_TO_VOID_RECIPIENT_RESOLUTION_APPLY_V1_GREEN' /tmp/void-wc-to-void-recipient-resolution-apply-current-run.log >/dev/null
grep -F '"recipient_resolution_applied": true' /tmp/void-wc-to-void-recipient-resolution-apply-v1-current.json >/dev/null
grep -F '"private_execute_command_release_allowed": false' /tmp/void-wc-to-void-recipient-resolution-apply-v1-current.json >/dev/null
grep -F '"money_movement_still_not_performed": true' /tmp/void-wc-to-void-recipient-resolution-apply-v1-current.json >/dev/null
grep -F '"does_not_send_void": true' /tmp/void-wc-to-void-recipient-resolution-apply-v1-current.json >/dev/null

bash ops/private/wc-to-void-recipient-resolution-v1-proof.sh >/tmp/void-wc-to-void-recipient-apply-resolution-proof.out
grep -F 'VOID_WC_TO_VOID_RECIPIENT_RESOLUTION_V1_PROOF_GREEN' /tmp/void-wc-to-void-recipient-apply-resolution-proof.out >/dev/null

bash ops/mainnet0/public-mutation-method-boundary-audit-v1.sh >/tmp/void-wc-to-void-recipient-apply-mutation.out
grep -F 'VOID_PUBLIC_MUTATION_METHOD_BOUNDARY_AUDIT_V1_GREEN' /tmp/void-wc-to-void-recipient-apply-mutation.out >/dev/null
grep -F 'public_node_literal_mutation_handler_count=0' /tmp/void-wc-to-void-recipient-apply-mutation.out >/dev/null

bash ops/mainnet0/funding-gateway-card-v1-proof.sh >/tmp/void-wc-to-void-recipient-apply-funding.out
grep -F 'VOID_FUNDING_GATEWAY_CARD_V1_GREEN' /tmp/void-wc-to-void-recipient-apply-funding.out >/dev/null

echo "VOID_WC_TO_VOID_RECIPIENT_RESOLUTION_APPLY_V1_PROOF_GREEN"
