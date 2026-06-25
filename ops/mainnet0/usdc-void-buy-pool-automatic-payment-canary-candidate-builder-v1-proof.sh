#!/usr/bin/env bash
set -euo pipefail

name="usdc-void-buy-pool-automatic-payment-canary-candidate-builder-v1"
marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_CANDIDATE_BUILDER_V1"

doc="docs/private/$name.md"
input_fixture="fixtures/private/$name-input.example.json"
builder="ops/mainnet0/$name.py"
candidate_intake_fixture="fixtures/public/usdc-void-buy-pool-automatic-payment-canary-candidate-intake-v1.json"

echo "${marker}_PROOF_BEGIN"

test -f "$doc"
test -f "$input_fixture"
test -f "$builder"
test -f "$candidate_intake_fixture"
echo "automatic_payment_canary_candidate_builder_files_exist=true"

grep -F "$marker" "$doc" >/dev/null
grep -F "$marker" "$builder" >/dev/null
echo "automatic_payment_canary_candidate_builder_marker_green=true"

out="$(CANARY_CANDIDATE_INPUT_JSON="$input_fixture" python3 "$builder")"
printf '%s\n' "$out" > /tmp/void-canary-candidate-builder-output.json

python3 - <<'PY'
import json
from pathlib import Path

d = json.loads(Path("/tmp/void-canary-candidate-builder-output.json").read_text())
intake = json.loads(Path("fixtures/public/usdc-void-buy-pool-automatic-payment-canary-candidate-intake-v1.json").read_text())

assert d["marker"] == "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_CANDIDATE_BUILDER_V1"
assert d["ok"] is True

assert intake["marker"] == "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_CANDIDATE_INTAKE_V1"
assert intake["candidate_intake"]["candidate_intake_enabled"] is True
assert intake["candidate_intake"]["canary_candidate_limit"] == 1

c = d["candidate"]
assert c["candidate_kind"] == "automatic_payment_canary_candidate"
assert c["candidate_status"] == "built_pending_operator_review"
assert c["canonical_payment_identity"] == "8453:0x1111111111111111111111111111111111111111111111111111111111111111:0"
assert c["chain_id"] == 8453
assert c["chain_name"] == "base"
assert c["amount_raw"] == "100000000"
assert c["amount_usdc"] == "100"
assert c["rate_usdc_per_void"] == "0.50"
assert c["void_amount"] == "2.0E+2" or c["void_amount"] == "200" or c["void_amount"] == "200.0"
assert c["confirmations"] == 30

canary = d["canary"]
assert canary["candidate_limit"] == 1
assert canary["candidate_built"] is True
assert canary["process_one_candidate_then_stop"] is True
assert canary["operator_review_required_after_candidate"] is True

auth = d["authority"]
assert auth["candidate_built"] is True
assert auth["ledger_write"] is False
assert auth["inventory_reserved"] is False
assert auth["fulfillment_executed"] is False
assert auth["wallet_signing"] is False
assert auth["void_transfer"] is False
assert auth["public_mutation"] is False

print("automatic_payment_canary_candidate_builder_output_semantics_green=true")
PY

tmp_bad="$(mktemp)"
python3 - <<'PY' > "$tmp_bad"
import json
from pathlib import Path
d = json.loads(Path("fixtures/private/usdc-void-buy-pool-automatic-payment-canary-candidate-builder-v1-input.example.json").read_text())
d["confirmations"] = 1
print(json.dumps(d))
PY

if CANARY_CANDIDATE_INPUT_JSON="$tmp_bad" python3 "$builder" >/tmp/void-canary-candidate-builder-bad.json 2>/dev/null; then
  echo "automatic_payment_canary_candidate_builder_negative_failed=true"
  exit 1
else
  echo "automatic_payment_canary_candidate_builder_negative_rejected=true"
fi

grep -RIn 'PRIVATE_KEY\|SECRET\|MNEMONIC\|SEED\|0x[a-fA-F0-9]\{64\}' "$doc" "$input_fixture" "$builder" && {
  echo "automatic_payment_canary_candidate_builder_secret_leak_found=true"
  exit 1
} || echo "automatic_payment_canary_candidate_builder_secret_leak_absent=true"

echo "${marker}_GREEN"
