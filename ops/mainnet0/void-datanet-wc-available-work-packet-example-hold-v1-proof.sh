#!/usr/bin/env bash
set -euo pipefail

BRICK="datanet-wc-available-work-packet-example-hold-v1"
MARKER="VOID_DATANET_WC_AVAILABLE_WORK_PACKET_EXAMPLE_HOLD_V1"

INDEX="public/public-node/work-credits/index.json"
CARD="public/public-node/work-credits/${BRICK}.json"
DOC="docs/public-node/work-credits/${BRICK}.md"
PROOF="ops/mainnet0/void-datanet-wc-available-work-packet-example-hold-v1-proof.sh"

echo "== JSON parse =="
python3 -m json.tool "$INDEX" >/dev/null
python3 -m json.tool "$CARD" >/dev/null
echo "json_green=true"

echo "== index example binding =="
python3 - <<'PY'
import json
from pathlib import Path

marker = "VOID_DATANET_WC_AVAILABLE_WORK_PACKET_EXAMPLE_HOLD_V1"
entry_id = "datanet-wc-available-work-packet-example-hold-v1"

index = json.loads(Path("public/public-node/work-credits/index.json").read_text())
entries = {entry["id"]: entry for entry in index["entries"]}
assert entry_id in entries

entry = entries[entry_id]
assert entry["status"] == "hold"
assert entry["path"] == "/public-node/work-credits/datanet-wc-available-work-packet-example-hold-v1.json"
assert entry["json"] == "datanet-wc-available-work-packet-example-hold-v1.json"
assert entry["lane"] == "work_credits"
assert entry["scope"] == "datanet_available_work_packet_example"
assert entry["example_only"] is True
assert entry["live_earn_enabled"] is False
assert entry["public_submission_enabled"] is False
assert entry["wc_issuance_enabled"] is False
assert entry["wc_ledger_write_enabled"] is False
assert entry["void_allocation_enabled"] is False
assert entry["usdc_autofulfillment_enabled"] is False
assert entry["marker"] == marker

boundary = index["public_boundary"]
assert boundary["public_discovery_only"] is True
assert boundary["read_only"] is True
for key in [
    "live_earn_enabled",
    "wc_issuance_enabled",
    "wc_ledger_write_enabled",
    "void_allocation_enabled",
    "usdc_autofulfillment_enabled",
    "wallet_or_signer_required",
    "runtime_mutation_route_enabled"
]:
    assert boundary[key] is False, key

print("index_example_binding_green=true")
PY

echo "== example packet binding =="
python3 - <<'PY'
import json
from pathlib import Path

marker = "VOID_DATANET_WC_AVAILABLE_WORK_PACKET_EXAMPLE_HOLD_V1"
card = json.loads(Path("public/public-node/work-credits/datanet-wc-available-work-packet-example-hold-v1.json").read_text())

assert card["schema"] == "void.public_node.work_credits.datanet_wc_available_work_packet_example_hold.v1"
assert card["id"] == "datanet-wc-available-work-packet-example-hold-v1"
assert card["status"] == "hold"
assert card["marker"] == marker
assert card["example_status"] == "public_safe_example_only"

ref = card["template_reference"]
assert ref["id"] == "datanet-wc-available-work-packet-template-hold-v1"
assert ref["path"] == "/public-node/work-credits/datanet-wc-available-work-packet-template-hold-v1.json"

packet = card["example_packet"]
assert packet["packet_kind"] == "datanet_wc_available_work_packet"
assert packet["packet_status"] == "example_not_submitted"
assert packet["work_type"] == "datanet_availability"
assert packet["review"]["review_required"] is True
assert packet["review"]["review_status"] == "not_reviewed_example_only"
assert packet["review"]["reviewer_identifier_public"] is False
assert packet["review"]["operator_identifier_public"] is False
assert packet["review"]["review_decision"] == "none"
assert packet["wc_result"]["wc_issued"] is False
assert packet["wc_result"]["wc_amount"] == 0
assert packet["wc_result"]["wc_ledger_write_performed"] is False
assert packet["wc_result"]["void_allocated"] is False
assert packet["wc_result"]["void_transferred"] is False

assert packet["evidence"]["content_root"] == "not_disclosed"
assert packet["evidence"]["object_id"] == "not_disclosed"
assert packet["evidence"]["participant_identifier"] == "not_disclosed"
assert packet["evidence"]["reviewer_identifier"] == "not_disclosed"
assert packet["evidence"]["operator_identifier"] == "not_disclosed"

for section, keys_false in {
    "public_safety_boundary": [
        "exposes_private_object_material",
        "exposes_private_content_root",
        "exposes_private_object_id",
        "exposes_participant_identifier",
        "exposes_reviewer_identifier",
        "exposes_operator_identifier",
        "requires_private_material"
    ],
    "wc_boundary": [
        "live_earn_enabled",
        "public_submission_enabled",
        "submits_work",
        "issues_work_credits",
        "approves_work_credits",
        "creates_ledger_line",
        "appends_to_ledger_file",
        "writes_wc_ledger",
        "allocates_void",
        "transfers_void",
        "opens_execute_gate",
        "automatic_reward"
    ],
    "authority_boundary": [
        "authorizes_execution",
        "authorizes_ledger_write_execution",
        "grants_signer_wallet_access",
        "moves_funds",
        "changes_datanet_storage",
        "changes_runtime_behavior",
        "adds_runtime_route",
        "activates_public_mutation"
    ]
}.items():
    for key in keys_false:
        assert card[section][key] is False, f"{section}.{key}"

assert card["public_safety_boundary"]["public_example_only"] is True

print("example_packet_binding_green=true")
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
    Path("public/public-node/work-credits/datanet-wc-available-work-packet-example-hold-v1.json"),
    Path("docs/public-node/work-credits/datanet-wc-available-work-packet-example-hold-v1.md"),
]

bad_phrases = [
    "earning is live",
    "public submission enabled",
    "work credits issued",
    "wc issuance enabled",
    "ledger write enabled",
    "ledger line created",
    "void allocation enabled",
    "void transfer enabled",
    "usdc autofulfillment enabled",
    "wallet access enabled",
    "signer access enabled",
    "runtime mutation route enabled",
    "mutation handler enabled"
]

for path in files:
    text = path.read_text().lower()
    for phrase in bad_phrases:
        assert phrase not in text, f"{phrase} found in {path}"

print("forbidden_enablement_scan_green=true")
PY

echo "== result =="
echo "${MARKER}_GREEN"
