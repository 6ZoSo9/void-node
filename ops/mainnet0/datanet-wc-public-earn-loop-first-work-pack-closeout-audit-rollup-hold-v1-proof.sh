#!/usr/bin/env bash
set -euo pipefail

ROOT_INDEX="public/public-node/index.json"
WC_INDEX="public/public-node/work-credits/index.json"
RECORD="public/public-node/work-credits/datanet-wc-public-earn-loop-first-work-pack-closeout-audit-rollup-hold-v1.json"
SOURCE_JSON="public/public-node/work-credits/datanet-wc-public-earn-loop-first-work-pack-hold-v1.json"
SOURCE_HTML="public/public-node/work-credits/datanet-wc-public-earn-loop-first-work-pack-hold-v1.html"
DOC="docs/public-node/work-credits/datanet-wc-public-earn-loop-first-work-pack-closeout-audit-rollup-hold-v1.md"

echo "== JSON parse =="
python3 - <<'PY2'
import json
from pathlib import Path
for path in [
    "public/public-node/index.json",
    "public/public-node/work-credits/index.json",
    "public/public-node/work-credits/datanet-wc-public-earn-loop-first-work-pack-closeout-audit-rollup-hold-v1.json",
    "public/public-node/work-credits/datanet-wc-public-earn-loop-first-work-pack-hold-v1.json",
]:
    json.loads(Path(path).read_text())
print("json_green=true")
PY2

echo "== source first work pack binding =="
python3 - <<'PY2'
import json
from pathlib import Path
record = json.loads(Path("public/public-node/work-credits/datanet-wc-public-earn-loop-first-work-pack-closeout-audit-rollup-hold-v1.json").read_text())
source = json.loads(Path("public/public-node/work-credits/datanet-wc-public-earn-loop-first-work-pack-hold-v1.json").read_text())
wc_index = json.loads(Path("public/public-node/work-credits/index.json").read_text())
html_path = Path("public/public-node/work-credits/datanet-wc-public-earn-loop-first-work-pack-hold-v1.html")

assert source["marker"] == "VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_HOLD_V1"
assert record["source_first_work_pack"]["marker"] == "VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_HOLD_V1"
assert wc_index["datanet_wc_public_earn_loop_first_work_pack"]["marker"] == "VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_HOLD_V1"
assert record["source_first_work_pack"]["json_route"] == "/public-node/work-credits/datanet-wc-public-earn-loop-first-work-pack-hold-v1.json"
assert record["source_first_work_pack"]["html_route"] == "/public-node/work-credits/datanet-wc-public-earn-loop-first-work-pack-hold-v1.html"
assert html_path.exists()
assert html_path.stat().st_size > 0
print("source_first_work_pack_binding_green=true")
PY2

echo "== closeout/index/root binding =="
python3 - <<'PY2'
import json
from pathlib import Path
record = json.loads(Path("public/public-node/work-credits/datanet-wc-public-earn-loop-first-work-pack-closeout-audit-rollup-hold-v1.json").read_text())
wc_index = json.loads(Path("public/public-node/work-credits/index.json").read_text())
root_index = json.loads(Path("public/public-node/index.json").read_text())

wc_entry = wc_index["datanet_wc_public_earn_loop_first_work_pack_closeout_audit_rollup"]
root_entry = root_index["datanet_wc_public_earn_loop_first_work_pack_closeout_audit_rollup"]

assert record["marker"] == "VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1"
assert record["route"] == "/public-node/work-credits/datanet-wc-public-earn-loop-first-work-pack-closeout-audit-rollup-hold-v1.json"
assert wc_entry["marker"] == "VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1"
assert wc_entry["route"] == "/public-node/work-credits/datanet-wc-public-earn-loop-first-work-pack-closeout-audit-rollup-hold-v1.json"
assert root_entry["marker"] == "VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1"
assert root_entry["route"] == "/public-node/work-credits/datanet-wc-public-earn-loop-first-work-pack-closeout-audit-rollup-hold-v1.json"
assert wc_entry["wc_supply_policy"] == "unlimited_uncapped_accounting_units_for_useful_verifiable_work"
assert root_entry["wc_supply_policy"] == "unlimited_uncapped_accounting_units_for_useful_verifiable_work"

audit = record["closeout_audit"]
assert audit["first_work_pack_json_present"] is True
assert audit["first_work_pack_html_present"] is True
assert audit["work_credits_index_entry_present"] is True
assert audit["root_public_node_discovery_entry_present"] is True
assert audit["earn_loop_first_work_pack_state"] == "public_visible_read_only_closeout_audited"

print("closeout_index_root_binding_green=true")
PY2

echo "== WC boundary =="
python3 - <<'PY2'
import json
from pathlib import Path
record = json.loads(Path("public/public-node/work-credits/datanet-wc-public-earn-loop-first-work-pack-closeout-audit-rollup-hold-v1.json").read_text())
policy = record["source_work_credit_policy"]
boundary = record["boundary"]

assert policy["wc_supply_policy"] == "unlimited_uncapped_accounting_units_for_useful_verifiable_work"
assert policy["issues_work_credits"] is False
assert policy["writes_work_credit_ledger"] is False
assert policy["creates_reward"] is False
assert policy["creates_void_transfer"] is False

for key, value in boundary.items():
    if key in ("public_safe", "read_only", "definition_only", "closeout_audit_only", "work_credits_unlimited_uncapped"):
        assert value is True, key
    else:
        assert value is False, key

print("wc_closeout_boundary_green=true")
PY2

echo "== marker presence =="
grep -R "VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1" "$ROOT_INDEX" "$WC_INDEX" "$RECORD" "$DOC" "$0" >/dev/null
echo "marker_green=true"

echo "== forbidden WC cap wording scan =="
if grep -R "100,000,000 WC\|100000000 WC\|lifetime WC cap\|WC cap" "$RECORD" "$DOC"; then
  echo "forbidden_wc_cap_language_found=true"
  exit 1
fi
echo "forbidden_wc_cap_scan_green=true"

echo "== result =="
echo "VOID_DATANET_WC_PUBLIC_EARN_LOOP_FIRST_WORK_PACK_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1_GREEN"
