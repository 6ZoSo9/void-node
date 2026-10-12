#!/usr/bin/env bash
set -euo pipefail

name="usdc-void-buy-pool-automatic-payment-canary-classifier-to-candidate-builder-bridge-v1"
marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_CLASSIFIER_TO_CANDIDATE_BUILDER_BRIDGE_V1"

doc="docs/private/$name.md"
bridge="ops/mainnet0/$name.py"

classifier="ops/mainnet0/usdc-void-buy-pool-automatic-payment-canary-rpc-outcome-classifier-v1.py"
builder="ops/mainnet0/usdc-void-buy-pool-automatic-payment-canary-candidate-builder-v1.py"
valid_rpc="fixtures/private/usdc-void-buy-pool-automatic-payment-canary-rpc-outcome-classifier-v1-valid.example.json"
rate_rpc="fixtures/private/usdc-void-buy-pool-automatic-payment-canary-rpc-outcome-classifier-v1-rate-limited.example.json"
candidate_input="fixtures/private/usdc-void-buy-pool-automatic-payment-canary-candidate-builder-v1-input.example.json"

echo "${marker}_PROOF_BEGIN"

test -f "$doc"
test -f "$bridge"
test -f "$classifier"
test -f "$builder"
test -f "$valid_rpc"
test -f "$rate_rpc"
test -f "$candidate_input"
echo "automatic_payment_canary_classifier_to_candidate_builder_bridge_files_exist=true"

grep -F "$marker" "$doc" >/dev/null
grep -F "$marker" "$bridge" >/dev/null
echo "automatic_payment_canary_classifier_to_candidate_builder_bridge_marker_green=true"

eligible_out="$(RPC_OUTCOME_INPUT_JSON="$valid_rpc" CANARY_CANDIDATE_INPUT_JSON="$candidate_input" python3 "$bridge")"
held_out="$(RPC_OUTCOME_INPUT_JSON="$rate_rpc" CANARY_CANDIDATE_INPUT_JSON="$candidate_input" python3 "$bridge")"

printf '%s\n' "$eligible_out" > /tmp/void-classifier-builder-bridge-eligible.json
printf '%s\n' "$held_out" > /tmp/void-classifier-builder-bridge-held.json

python3 - <<'PY'
import json
from pathlib import Path

eligible = json.loads(Path("/tmp/void-classifier-builder-bridge-eligible.json").read_text())
held = json.loads(Path("/tmp/void-classifier-builder-bridge-held.json").read_text())

assert eligible["marker"] == "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_CLASSIFIER_TO_CANDIDATE_BUILDER_BRIDGE_V1"
assert eligible["ok"] is True
assert eligible["bridge"]["state"] == "candidate_builder_allowed_and_completed"
assert eligible["bridge"]["builder_ran"] is True
assert eligible["builder_output"]["ok"] is True
assert eligible["builder_output"]["candidate"]["candidate_kind"] == "automatic_payment_canary_candidate"

auth = eligible["authority"]
assert auth["candidate_builder_allowed"] is True
assert auth["candidate_built"] is True
assert auth["ledger_write"] is False
assert auth["inventory_reserved"] is False
assert auth["fulfillment_executed"] is False
assert auth["wallet_signing"] is False
assert auth["void_transfer"] is False
assert auth["public_mutation"] is False

assert held["ok"] is True
assert held["bridge"]["state"] == "candidate_builder_blocked"
assert held["bridge"]["reason"] == "classifier_state:held_rpc_rate_limited"
assert held["bridge"]["builder_ran"] is False
assert held["builder_output"] is None

hauth = held["authority"]
assert hauth["candidate_builder_allowed"] is False
assert hauth["candidate_built"] is False
assert hauth["ledger_write"] is False
assert hauth["inventory_reserved"] is False
assert hauth["fulfillment_executed"] is False
assert hauth["wallet_signing"] is False
assert hauth["void_transfer"] is False
assert hauth["public_mutation"] is False

print("automatic_payment_canary_classifier_to_candidate_builder_bridge_semantics_green=true")
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

dup_out="$(RPC_OUTCOME_INPUT_JSON="$tmp_dup" CANARY_CANDIDATE_INPUT_JSON="$candidate_input" python3 "$bridge")"
printf '%s\n' "$dup_out" > /tmp/void-classifier-builder-bridge-dup.json

python3 - <<'PY'
import json
from pathlib import Path
d = json.loads(Path("/tmp/void-classifier-builder-bridge-dup.json").read_text())
assert d["bridge"]["state"] == "candidate_builder_blocked"
assert d["bridge"]["reason"] == "classifier_state:rejected_duplicate_payment_identity"
assert d["bridge"]["builder_ran"] is False
assert d["authority"]["candidate_built"] is False
print("automatic_payment_canary_classifier_to_candidate_builder_bridge_duplicate_block_green=true")
PY

grep -RIn 'PRIVATE_KEY\|MNEMONIC\|SEED\|0x[a-fA-F0-9]\{64\}' "$doc" "$bridge" && {
  echo "automatic_payment_canary_classifier_to_candidate_builder_bridge_secret_leak_found=true"
  exit 1
} || echo "automatic_payment_canary_classifier_to_candidate_builder_bridge_secret_leak_absent=true"

echo "${marker}_GREEN"
