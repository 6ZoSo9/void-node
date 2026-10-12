#!/usr/bin/env bash
set -euo pipefail

name="usdc-void-buy-pool-automatic-payment-canary-rpc-outcome-classifier-v1"
marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_RPC_OUTCOME_CLASSIFIER_V1"

doc="docs/private/$name.md"
valid_fixture="fixtures/private/$name-valid.example.json"
rate_fixture="fixtures/private/$name-rate-limited.example.json"
classifier="ops/mainnet0/$name.py"
hold_fixture="fixtures/public/usdc-void-buy-pool-automatic-payment-canary-rpc-rate-limit-hold-v1.json"

echo "${marker}_PROOF_BEGIN"

test -f "$doc"
test -f "$valid_fixture"
test -f "$rate_fixture"
test -f "$classifier"
test -f "$hold_fixture"
echo "automatic_payment_canary_rpc_outcome_classifier_files_exist=true"

grep -F "$marker" "$doc" >/dev/null
grep -F "$marker" "$classifier" >/dev/null
echo "automatic_payment_canary_rpc_outcome_classifier_marker_green=true"

valid_out="$(RPC_OUTCOME_INPUT_JSON="$valid_fixture" python3 "$classifier")"
rate_out="$(RPC_OUTCOME_INPUT_JSON="$rate_fixture" python3 "$classifier")"

printf '%s\n' "$valid_out" > /tmp/void-rpc-outcome-classifier-valid.json
printf '%s\n' "$rate_out" > /tmp/void-rpc-outcome-classifier-rate.json

python3 - <<'PY'
import json
from pathlib import Path

valid = json.loads(Path("/tmp/void-rpc-outcome-classifier-valid.json").read_text())
rate = json.loads(Path("/tmp/void-rpc-outcome-classifier-rate.json").read_text())
hold = json.loads(Path("fixtures/public/usdc-void-buy-pool-automatic-payment-canary-rpc-rate-limit-hold-v1.json").read_text())

assert hold["marker"] == "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_RPC_RATE_LIMIT_HOLD_V1"
assert hold["rpc_outcome_policy"]["rpc_failure_is_pause_not_rejection"] is True

assert valid["marker"] == "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_RPC_OUTCOME_CLASSIFIER_V1"
vc = valid["classification"]
assert vc["state"] == "eligible_candidate_path"
assert vc["candidate_may_be_built"] is True
assert vc["retry_allowed"] is False
assert vc["rejection"] is False

rc = rate["classification"]
assert rc["state"] == "held_rpc_rate_limited"
assert rc["candidate_may_be_built"] is False
assert rc["retry_allowed"] is True
assert rc["rejection"] is False

for output in [valid, rate]:
    auth = output["authority"]
    assert auth["candidate_built"] is False
    assert auth["allocation_record_created"] is False
    assert auth["private_allocation_ledger_write"] is False
    assert auth["inventory_reserved"] is False
    assert auth["fulfillment_executed"] is False
    assert auth["wallet_signing"] is False
    assert auth["void_transfer"] is False
    assert auth["public_mutation"] is False
    assert auth["public_buyer_execution"] is False

print("automatic_payment_canary_rpc_outcome_classifier_output_semantics_green=true")
PY

tmp_null="$(mktemp)"
cat > "$tmp_null" <<'JSON'
{
  "rpc_status": 200,
  "receipt_present": false
}
JSON

null_out="$(RPC_OUTCOME_INPUT_JSON="$tmp_null" python3 "$classifier")"
printf '%s\n' "$null_out" > /tmp/void-rpc-outcome-classifier-null.json

python3 - <<'PY'
import json
from pathlib import Path
d = json.loads(Path("/tmp/void-rpc-outcome-classifier-null.json").read_text())
assert d["classification"]["state"] == "pending_not_mined_or_not_indexed"
assert d["classification"]["candidate_may_be_built"] is False
assert d["classification"]["retry_allowed"] is True
print("automatic_payment_canary_rpc_outcome_classifier_null_receipt_green=true")
PY

tmp_dup="$(mktemp)"
python3 - <<'PY' > "$tmp_dup"
import json
d = {
  "rpc_status": 200,
  "receipt_present": True,
  "receipt_status_success": True,
  "transfer_log_match": True,
  "chain_allowed": True,
  "token_allowed": True,
  "receiver_allowed": True,
  "duplicate_payment_identity": True,
  "finality_confirmations_met": True
}
print(json.dumps(d))
PY

dup_out="$(RPC_OUTCOME_INPUT_JSON="$tmp_dup" python3 "$classifier")"
printf '%s\n' "$dup_out" > /tmp/void-rpc-outcome-classifier-dup.json

python3 - <<'PY'
import json
from pathlib import Path
d = json.loads(Path("/tmp/void-rpc-outcome-classifier-dup.json").read_text())
assert d["classification"]["state"] == "rejected_duplicate_payment_identity"
assert d["classification"]["candidate_may_be_built"] is False
assert d["classification"]["retry_allowed"] is False
assert d["classification"]["rejection"] is True
print("automatic_payment_canary_rpc_outcome_classifier_duplicate_reject_green=true")
PY

grep -RIn 'PRIVATE_KEY\|MNEMONIC\|SEED\|0x[a-fA-F0-9]\{64\}' "$doc" "$valid_fixture" "$rate_fixture" "$classifier" && {
  echo "automatic_payment_canary_rpc_outcome_classifier_secret_leak_found=true"
  exit 1
} || echo "automatic_payment_canary_rpc_outcome_classifier_secret_leak_absent=true"

echo "${marker}_GREEN"
