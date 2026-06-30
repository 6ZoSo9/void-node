#!/usr/bin/env bash
set -euo pipefail

INDEX="public/public-node/work-credits/index.json"
RECORD="public/public-node/work-credits/datanet-wc-public-earn-loop-first-work-pack-hold-v1.json"
HTML="public/public-node/work-credits/datanet-wc-public-earn-loop-first-work-pack-hold-v1.html"
SCHEMA="schemas/public-node/work-credits/datanet-wc-public-earn-loop-first-work-pack-hold-v1.schema.json"
EXAMPLE="examples/public-node/work-credits/datanet-wc-public-earn-loop-first-work-pack-hold-v1.example.json"
DOC="docs/public-node/work-credits/datanet-wc-public-earn-loop-first-work-pack-hold-v1.md"

echo "== JSON parse =="
python3 - <<'PY2'
import json
from pathlib import Path
for path in [
    "public/public-node/work-credits/index.json",
    "public/public-node/work-credits/datanet-wc-public-earn-loop-first-work-pack-hold-v1.json",
    "schemas/public-node/work-credits/datanet-wc-public-earn-loop-first-work-pack-hold-v1.schema.json",
    "examples/public-node/work-credits/datanet-wc-public-earn-loop-first-work-pack-hold-v1.example.json",
]:
    json.loads(Path(path).read_text())
print("json_green=true")
PY2

echo "== record binding =="
python3 - <<'PY2'
import json
from pathlib import Path
record = json.loads(Path("public/public-node/work-credits/datanet-wc-public-earn-loop-first-work-pack-hold-v1.json").read_text())
example = json.loads(Path("examples/public-node/work-credits/datanet-wc-public-earn-loop-first-work-pack-hold-v1.example.json").read_text())
schema = json.loads(Path("schemas/public-node/work-credits/datanet-wc-public-earn-loop-first-work-pack-hold-v1.schema.json").read_text())
idx = json.loads(Path("public/public-node/work-credits/index.json").read_text())
entry = idx["datanet_wc_public_earn_loop_first_work_pack"]
assert record == example
assert schema["properties"]["marker"]["const"] == "VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_HOLD_V1"
assert record["marker"] == "VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_HOLD_V1"
assert entry["marker"] == "VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_HOLD_V1"
assert entry["wc_supply_policy"] == "unlimited_uncapped_accounting_units_for_useful_verifiable_work"
print("record_binding_green=true")
PY2

echo "== marker presence =="
grep -R "VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_HOLD_V1" "$INDEX" "$RECORD" "$HTML" "$SCHEMA" "$EXAMPLE" "$DOC" "$0" >/dev/null
echo "marker_green=true"

echo "== WC boundary =="
python3 - <<'PY2'
import json
from pathlib import Path
record = json.loads(Path("public/public-node/work-credits/datanet-wc-public-earn-loop-first-work-pack-hold-v1.json").read_text())
policy = record["work_credit_policy"]
submission = record["submission_boundary"]
safety = record["safety_boundary"]
assert policy["wc_supply_policy"] == "unlimited_uncapped_accounting_units_for_useful_verifiable_work"
assert policy["issues_work_credits"] is False
assert policy["writes_work_credit_ledger"] is False
assert policy["creates_reward"] is False
assert policy["creates_void_transfer"] is False
assert submission["public_submission_open"] is False
assert submission["automatic_scoring_enabled"] is False
assert submission["automatic_award_enabled"] is False
assert submission["ledger_append_enabled"] is False
assert safety["no_fixed_work_credits_ceiling"] is True
assert safety["no_wc_issuance"] is True
assert safety["no_void_transfer"] is True
assert safety["no_runtime_mutation_route"] is True
print("wc_boundary_green=true")
PY2

echo "== forbidden wording scan =="
if grep -R "100,000,000 WC\|100000000 WC\|lifetime WC cap\|WC cap" "$RECORD" "$HTML" "$DOC" "$EXAMPLE"; then
  echo "forbidden_wc_cap_language_found=true"
  exit 1
fi
echo "forbidden_wc_cap_scan_green=true"

echo "== result =="
echo "VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_HOLD_V1_GREEN"
