#!/usr/bin/env bash
set -euo pipefail

ROOT_INDEX="public/public-node/index.json"
WC_INDEX="public/public-node/work-credits/index.json"
RECORD="public/public-node/work-credits/datanet-wc-public-earn-loop-first-work-pack-reviewer-handoff-packet-hold-v1.json"
HTML="public/public-node/work-credits/datanet-wc-public-earn-loop-first-work-pack-reviewer-handoff-packet-hold-v1.html"
SCHEMA="schemas/public-node/work-credits/datanet-wc-public-earn-loop-first-work-pack-reviewer-handoff-packet-hold-v1.schema.json"
EXAMPLE="examples/public-node/work-credits/datanet-wc-public-earn-loop-first-work-pack-reviewer-handoff-packet-hold-v1.example.json"
DOC="docs/public-node/work-credits/datanet-wc-public-earn-loop-first-work-pack-reviewer-handoff-packet-hold-v1.md"
SOURCE_JSON="public/public-node/work-credits/datanet-wc-public-earn-loop-first-work-pack-hold-v1.json"
CLOSEOUT_JSON="public/public-node/work-credits/datanet-wc-public-earn-loop-first-work-pack-closeout-audit-rollup-hold-v1.json"

echo "== JSON parse =="
python3 - <<'PY2'
import json
from pathlib import Path
for path in [
    "public/public-node/index.json",
    "public/public-node/work-credits/index.json",
    "public/public-node/work-credits/datanet-wc-public-earn-loop-first-work-pack-reviewer-handoff-packet-hold-v1.json",
    "public/public-node/work-credits/datanet-wc-public-earn-loop-first-work-pack-hold-v1.json",
    "public/public-node/work-credits/datanet-wc-public-earn-loop-first-work-pack-closeout-audit-rollup-hold-v1.json",
    "schemas/public-node/work-credits/datanet-wc-public-earn-loop-first-work-pack-reviewer-handoff-packet-hold-v1.schema.json",
    "examples/public-node/work-credits/datanet-wc-public-earn-loop-first-work-pack-reviewer-handoff-packet-hold-v1.example.json",
]:
    json.loads(Path(path).read_text())
print("json_green=true")
PY2

echo "== source binding =="
python3 - <<'PY2'
import json
from pathlib import Path
record = json.loads(Path("public/public-node/work-credits/datanet-wc-public-earn-loop-first-work-pack-reviewer-handoff-packet-hold-v1.json").read_text())
source = json.loads(Path("public/public-node/work-credits/datanet-wc-public-earn-loop-first-work-pack-hold-v1.json").read_text())
closeout = json.loads(Path("public/public-node/work-credits/datanet-wc-public-earn-loop-first-work-pack-closeout-audit-rollup-hold-v1.json").read_text())
assert record["source_first_work_pack"]["marker"] == "VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_HOLD_V1"
assert source["marker"] == "VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_HOLD_V1"
assert record["source_closeout_audit"]["marker"] == "VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1"
assert closeout["marker"] == "VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1"
print("source_binding_green=true")
PY2

echo "== schema/example/record binding =="
python3 - <<'PY2'
import json
from pathlib import Path
record = json.loads(Path("public/public-node/work-credits/datanet-wc-public-earn-loop-first-work-pack-reviewer-handoff-packet-hold-v1.json").read_text())
example = json.loads(Path("examples/public-node/work-credits/datanet-wc-public-earn-loop-first-work-pack-reviewer-handoff-packet-hold-v1.example.json").read_text())
schema = json.loads(Path("schemas/public-node/work-credits/datanet-wc-public-earn-loop-first-work-pack-reviewer-handoff-packet-hold-v1.schema.json").read_text())
assert record == example
assert record["marker"] == "VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_REVIEWER_HANDOFF_PACKET_HOLD_V1"
assert schema["properties"]["marker"]["const"] == "VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_REVIEWER_HANDOFF_PACKET_HOLD_V1"
print("schema_example_record_binding_green=true")
PY2

echo "== index/root binding =="
python3 - <<'PY2'
import json
from pathlib import Path
record = json.loads(Path("public/public-node/work-credits/datanet-wc-public-earn-loop-first-work-pack-reviewer-handoff-packet-hold-v1.json").read_text())
wc_index = json.loads(Path("public/public-node/work-credits/index.json").read_text())
root_index = json.loads(Path("public/public-node/index.json").read_text())
wc_entry = wc_index["datanet_wc_public_earn_loop_first_work_pack_reviewer_handoff_packet"]
root_entry = root_index["datanet_wc_public_earn_loop_first_work_pack_reviewer_handoff_packet"]
assert wc_entry["marker"] == "VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_REVIEWER_HANDOFF_PACKET_HOLD_V1"
assert wc_entry["route"] == "/public-node/work-credits/datanet-wc-public-earn-loop-first-work-pack-reviewer-handoff-packet-hold-v1.json"
assert root_entry["marker"] == "VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_REVIEWER_HANDOFF_PACKET_HOLD_V1"
assert root_entry["route"] == "/public-node/work-credits/datanet-wc-public-earn-loop-first-work-pack-reviewer-handoff-packet-hold-v1.json"
assert wc_entry["wc_supply_policy"] == "unlimited_uncapped_accounting_units_for_useful_verifiable_work"
assert root_entry["wc_supply_policy"] == "unlimited_uncapped_accounting_units_for_useful_verifiable_work"
print("index_root_binding_green=true")
PY2

echo "== boundary =="
python3 - <<'PY2'
import json
from pathlib import Path
record = json.loads(Path("public/public-node/work-credits/datanet-wc-public-earn-loop-first-work-pack-reviewer-handoff-packet-hold-v1.json").read_text())
policy = record["work_credit_policy"]
submission = record["submission_boundary"]
safety = record["safety_boundary"]

assert policy["wc_supply_policy"] == "unlimited_uncapped_accounting_units_for_useful_verifiable_work"
assert policy["issues_work_credits"] is False
assert policy["writes_work_credit_ledger"] is False
assert policy["creates_reward"] is False
assert policy["creates_void_transfer"] is False

assert submission["public_submission_open"] is False
assert submission["public_form_route_created"] is False
assert submission["wallet_connect_enabled"] is False
assert submission["automatic_scoring_enabled"] is False
assert submission["automatic_award_enabled"] is False
assert submission["ledger_append_enabled"] is False

for key in [
    "public_safe",
    "read_only",
    "definition_only",
    "reviewer_handoff_only",
    "work_credits_unlimited_uncapped",
    "no_wc_issuance",
    "no_wc_ledger_write",
    "no_reward_creation",
    "no_void_transfer",
    "no_wallet_connect",
    "no_public_submission_route",
    "no_runtime_mutation_route",
]:
    assert safety[key] is True, key

print("reviewer_handoff_boundary_green=true")
PY2

echo "== marker presence =="
grep -R "VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_REVIEWER_HANDOFF_PACKET_HOLD_V1" "$ROOT_INDEX" "$WC_INDEX" "$RECORD" "$HTML" "$SCHEMA" "$EXAMPLE" "$DOC" "$0" >/dev/null
echo "marker_green=true"

echo "== forbidden WC cap wording scan =="
if grep -R "100,000,000 WC\|100000000 WC\|lifetime WC cap\|WC cap" "$RECORD" "$HTML" "$DOC" "$EXAMPLE"; then
  echo "forbidden_wc_cap_language_found=true"
  exit 1
fi
echo "forbidden_wc_cap_scan_green=true"

echo "== result =="
echo "VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_REVIEWER_HANDOFF_PACKET_HOLD_V1_GREEN"
