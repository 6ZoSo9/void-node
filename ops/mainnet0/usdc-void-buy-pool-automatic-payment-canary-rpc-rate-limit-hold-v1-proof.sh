#!/usr/bin/env bash
set -euo pipefail

name="usdc-void-buy-pool-automatic-payment-canary-rpc-rate-limit-hold-v1"
marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_RPC_RATE_LIMIT_HOLD_V1"

doc="docs/public/$name.md"
fixture="fixtures/public/$name.json"
candidate_intake_fixture="fixtures/public/usdc-void-buy-pool-automatic-payment-canary-candidate-intake-v1.json"
builder_proof="ops/mainnet0/usdc-void-buy-pool-automatic-payment-canary-candidate-builder-v1-proof.sh"
src="src/index.ts"

echo "${marker}_PROOF_BEGIN"

test -f "$doc"
test -f "$fixture"
test -f "$candidate_intake_fixture"
test -f "$builder_proof"
test -f "$src"
echo "automatic_payment_canary_rpc_rate_limit_hold_files_exist=true"

grep -F "$marker" "$doc" >/dev/null
grep -F "$marker" "$fixture" >/dev/null
grep -F "$marker" "$src" >/dev/null
echo "automatic_payment_canary_rpc_rate_limit_hold_marker_green=true"

grep -F '/public-node/usdc-void-buy-pool/automatic-payment-canary/rpc-rate-limit-hold-v1' "$src" >/dev/null
grep -F '/public-node/usdc-void-buy-pool/automatic-payment-canary/rpc-rate-limit-hold-v1.json' "$src" >/dev/null
echo "automatic_payment_canary_rpc_rate_limit_hold_routes_wired=true"

python3 - <<'PY'
import json
from pathlib import Path

d = json.loads(Path("fixtures/public/usdc-void-buy-pool-automatic-payment-canary-rpc-rate-limit-hold-v1.json").read_text())
intake = json.loads(Path("fixtures/public/usdc-void-buy-pool-automatic-payment-canary-candidate-intake-v1.json").read_text())

assert d["marker"] == "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_RPC_RATE_LIMIT_HOLD_V1"
assert d["schema"] == "usdc_void_buy_pool_automatic_payment_canary_rpc_rate_limit_hold_v1"
assert d["visibility"] == "public_safe_runtime_status"
assert d["status"] == "automatic_payment_canary_rpc_rate_limit_hold_ready"

assert intake["marker"] == "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_CANDIDATE_INTAKE_V1"
assert intake["candidate_intake"]["candidate_intake_enabled"] is True

policy = d["rpc_outcome_policy"]
assert policy["rpc_failure_is_pause_not_rejection"] is True
assert policy["buyer_action_required_on_rate_limit"] is False
assert policy["operator_review_required_if_retry_window_exhausted"] is True
assert policy["retry_allowed"] is True
for mode in ["backoff_same_rpc", "operator_approved_alternate_rpc", "manual_operator_receipt_read"]:
    assert mode in policy["approved_retry_modes"], mode

c = d["classifications"]
assert c["200_valid_receipt_transfer_log"]["state"] == "eligible_candidate_path"
assert c["200_valid_receipt_transfer_log"]["candidate_may_be_built"] is True

for key, state in {
    "200_null_receipt": "pending_not_mined_or_not_indexed",
    "403": "held_rpc_access_blocked",
    "429": "held_rpc_rate_limited",
    "timeout": "held_rpc_timeout",
    "rpc_error": "held_rpc_error"
}.items():
    assert c[key]["state"] == state
    assert c[key]["candidate_may_be_built"] is False
    assert c[key]["retry_allowed"] is True

for key in ["wrong_chain", "wrong_token", "wrong_receiver", "duplicate_payment_identity"]:
    assert c[key]["state"].startswith("rejected_")
    assert c[key]["candidate_may_be_built"] is False
    assert c[key]["retry_allowed"] is False

for k, v in d["held_state_authority"].items():
    assert v is False, k

for k, v in d["eligible_state_required_before_candidate"].items():
    assert v is True, k

print("automatic_payment_canary_rpc_rate_limit_hold_json_semantics_green=true")
PY

grep -RIn 'docs/private/\|fixtures/private/\|PRIVATE_KEY\|SECRET\|MNEMONIC\|SEED\|0x[a-fA-F0-9]\{64\}' "$doc" "$fixture" && {
  echo "automatic_payment_canary_rpc_rate_limit_hold_public_leak_found=true"
  exit 1
} || echo "automatic_payment_canary_rpc_rate_limit_hold_public_leak_absent=true"

echo "${marker}_GREEN"
