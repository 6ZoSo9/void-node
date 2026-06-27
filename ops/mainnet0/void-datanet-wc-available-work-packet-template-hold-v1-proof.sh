#!/usr/bin/env bash
set -euo pipefail

BRICK="datanet-wc-available-work-packet-template-hold-v1"
MARKER="VOID_DATANET_WC_AVAILABLE_WORK_PACKET_TEMPLATE_HOLD_V1"

INDEX="public/public-node/work-credits/index.json"
CARD="public/public-node/work-credits/${BRICK}.json"
DOC="docs/public-node/work-credits/${BRICK}.md"
PROOF="ops/mainnet0/void-datanet-wc-available-work-packet-template-hold-v1-proof.sh"

echo "== JSON parse =="
python3 -m json.tool "$INDEX" >/dev/null
python3 -m json.tool "$CARD" >/dev/null
echo "json_green=true"

echo "== index entry binding =="
python3 - <<'PY'
import json
from pathlib import Path

marker = "VOID_DATANET_WC_AVAILABLE_WORK_PACKET_TEMPLATE_HOLD_V1"
entry_id = "datanet-wc-available-work-packet-template-hold-v1"

index = json.loads(Path("public/public-node/work-credits/index.json").read_text())
entries = {entry["id"]: entry for entry in index["entries"]}

assert entry_id in entries
entry = entries[entry_id]

assert entry["status"] == "hold"
assert entry["path"] == "/public-node/work-credits/datanet-wc-available-work-packet-template-hold-v1.json"
assert entry["json"] == "datanet-wc-available-work-packet-template-hold-v1.json"
assert entry["lane"] == "work_credits"
assert entry["scope"] == "datanet_available_work_packet_template"
assert entry["live_earn_enabled"] is False
assert entry["wc_issuance_enabled"] is False
assert entry["wc_ledger_write_enabled"] is False
assert entry["void_allocation_enabled"] is False
assert entry["usdc_autofulfillment_enabled"] is False
assert entry["marker"] == marker

boundary = index["public_boundary"]
for key in [
    "public_discovery_only",
    "read_only",
]:
    assert boundary[key] is True, key

for key in [
    "live_earn_enabled",
    "wc_issuance_enabled",
    "wc_ledger_write_enabled",
    "void_allocation_enabled",
    "usdc_autofulfillment_enabled",
    "wallet_or_signer_required",
    "runtime_mutation_route_enabled",
]:
    assert boundary[key] is False, key

print("index_entry_binding_green=true")
PY

echo "== packet template binding =="
python3 - <<'PY'
import json
from pathlib import Path

card = json.loads(Path("public/public-node/work-credits/datanet-wc-available-work-packet-template-hold-v1.json").read_text())
marker = "VOID_DATANET_WC_AVAILABLE_WORK_PACKET_TEMPLATE_HOLD_V1"

assert card["schema"] == "void.public_node.work_credits.datanet_wc_available_work_packet_template_hold.v1"
assert card["id"] == "datanet-wc-available-work-packet-template-hold-v1"
assert card["status"] == "hold"
assert card["marker"] == marker
assert card["template_kind"] == "datanet_wc_available_work_packet"
assert card["template_status"] == "shape_only_hold"

future = card["intended_future_use"]
assert future["lane"] == "work_credits"
assert future["scope"] == "datanet_availability"
assert future["public_submission_enabled"] is False
assert future["live_earn_enabled"] is False

packet = card["packet_template"]
assert packet["packet_kind"] == "datanet_wc_available_work_packet"
assert packet["work_type"] == "datanet_availability"
assert packet["review"]["review_required"] is True
assert packet["review"]["review_status"] == "not_reviewed"
assert packet["review"]["reviewer_identifier_public"] is False
assert packet["review"]["operator_identifier_public"] is False
assert packet["wc_result"]["wc_issued"] is False
assert packet["wc_result"]["wc_amount"] == 0
assert packet["wc_result"]["wc_ledger_write_performed"] is False
assert packet["wc_result"]["void_allocated"] is False

for section, keys_false in {
    "public_safety_boundary": [
        "exposes_private_object_material",
        "exposes_private_content_root",
        "exposes_private_object_id",
        "exposes_participant_identifier",
        "exposes_reviewer_identifier",
        "exposes_operator_identifier",
        "requires_private_material",
    ],
    "wc_boundary": [
        "live_earn_enabled",
        "public_submission_enabled",
        "issues_work_credits",
        "approves_work_credits",
        "creates_ledger_line",
        "appends_to_ledger_file",
        "writes_wc_ledger",
        "allocates_void",
        "transfers_void",
        "opens_execute_gate",
        "automatic_reward",
    ],
    "authority_boundary": [
        "authorizes_execution",
        "authorizes_ledger_write_execution",
        "grants_signer_wallet_access",
        "moves_funds",
        "changes_datanet_storage",
        "changes_runtime_behavior",
        "adds_runtime_route",
        "activates_public_mutation",
    ],
}.items():
    assert card[section], section
    for key in keys_false:
        assert card[section][key] is False, f"{section}.{key}"

assert card["public_safety_boundary"]["public_template_only"] is True

print("packet_template_binding_green=true")
PY

echo "== marker presence =="
grep -q "$MARKER" "$INDEX"
grep -q "$MARKER" "$CARD"
grep -q "$MARKER" "$DOC"
grep -q "$MARKER" "$PROOF"
echo "marker_green=true"

echo "== forbidden enablement scan =="
python3 - <<'PY'
from pathlib import Path

files = [
    Path("public/public-node/work-credits/index.json"),
    Path("public/public-node/work-credits/datanet-wc-available-work-packet-template-hold-v1.json"),
    Path("docs/public-node/work-credits/datanet-wc-available-work-packet-template-hold-v1.md"),
]

bad_phrases = [
    "live earning is enabled",
    "earning is live",
    "public submission enabled",
    "wc issuance enabled",
    "work credits issued",
    "ledger write enabled",
    "ledger line created",
    "void allocation enabled",
    "void transfer enabled",
    "usdc autofulfillment enabled",
    "wallet access enabled",
    "signer access enabled",
    "runtime mutation route enabled",
    "mutation handler enabled",
]

for path in files:
    text = path.read_text().lower()
    for phrase in bad_phrases:
        assert phrase not in text, f"{phrase} found in {path}"

print("forbidden_enablement_scan_green=true")
PY

echo "== result =="
echo "${MARKER}_GREEN"
