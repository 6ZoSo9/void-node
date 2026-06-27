#!/usr/bin/env bash
set -euo pipefail

BRICK="datanet-wc-held-intake-candidate-packet-v1"
MARKER="VOID_DATANET_WC_HELD_INTAKE_CANDIDATE_PACKET_V1"

INDEX="public/public-node/work-credits/index.json"
CARD="public/public-node/work-credits/${BRICK}.json"
DOC="docs/public-node/work-credits/${BRICK}.md"
PROOF="ops/mainnet0/void-datanet-wc-held-intake-candidate-packet-v1-proof.sh"

echo "== JSON parse =="
python3 -m json.tool "$INDEX" >/dev/null
python3 -m json.tool "$CARD" >/dev/null
echo "json_green=true"

echo "== binding =="
python3 - <<'PY'
import json
from pathlib import Path

marker = "VOID_DATANET_WC_HELD_INTAKE_CANDIDATE_PACKET_V1"
entry_id = "datanet-wc-held-intake-candidate-packet-v1"

index = json.loads(Path("public/public-node/work-credits/index.json").read_text())
entries = {entry["id"]: entry for entry in index["entries"]}
assert entry_id in entries

entry = entries[entry_id]
assert entry["status"] == "hold"
assert entry["path"] == "/public-node/work-credits/datanet-wc-held-intake-candidate-packet-v1.json"
assert entry["json"] == "datanet-wc-held-intake-candidate-packet-v1.json"
assert entry["lane"] == "work_credits"
assert entry["scope"] == "datanet_held_intake_candidate_packet"
assert entry["intake_candidate_only"] is True
assert entry["intake_open"] is False
assert entry["packet_accepted"] is False
for key in [
    "live_earn_enabled",
    "public_submission_enabled",
    "review_decision_enabled",
    "wc_approval_enabled",
    "wc_issuance_enabled",
    "wc_ledger_write_enabled",
    "void_allocation_enabled",
    "usdc_autofulfillment_enabled"
]:
    assert entry[key] is False, key
assert entry["marker"] == marker

card = json.loads(Path("public/public-node/work-credits/datanet-wc-held-intake-candidate-packet-v1.json").read_text())
assert card["schema"] == "void.public_node.work_credits.datanet_wc_held_intake_candidate_packet.v1"
assert card["id"] == entry_id
assert card["status"] == "hold"
assert card["marker"] == marker
assert card["candidate_status"] == "held_intake_candidate_only"

shape = card["candidate_packet_shape"]
assert shape["candidate_packet_kind"] == "datanet_wc_held_intake_candidate_packet"
assert shape["candidate_packet_status"] == "held_not_submitted"
assert shape["work_type"] == "datanet_availability"

for key in [
    "private_content_root",
    "private_object_id",
    "participant_identifier",
    "operator_identifier",
    "reviewer_identifier"
]:
    assert shape["public_safe_evidence"][key] == "not_disclosed", key

intake = shape["intake_state"]
for key in [
    "intake_open",
    "packet_submitted",
    "packet_accepted",
    "public_submission_enabled",
    "intake_queue_created",
    "operator_review_queue_created"
]:
    assert intake[key] is False, key

review = shape["review_state"]
assert review["review_required"] is True
for key in [
    "review_active",
    "review_decision_performed",
    "review_approval_performed"
]:
    assert review[key] is False, key

wc = shape["wc_state"]
assert wc["wc_amount"] == 0
for key in [
    "wc_approval_performed",
    "wc_issuance_performed",
    "wc_ledger_write_performed",
    "void_allocation_performed",
    "void_transfer_performed"
]:
    assert wc[key] is False, key

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
    "intake_boundary": [
        "intake_open",
        "accepts_packets",
        "public_submission_endpoint_enabled",
        "creates_intake_queue",
        "creates_operator_review_queue",
        "activates_review_lane",
        "activates_earn_lane"
    ],
    "wc_boundary": [
        "live_earn_enabled",
        "public_submission_enabled",
        "accepts_work_packets",
        "performs_review_decision",
        "approves_work_credits",
        "issues_work_credits",
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

assert card["public_safety_boundary"]["public_candidate_only"] is True
print("held_intake_candidate_packet_binding_green=true")
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
    Path("public/public-node/work-credits/datanet-wc-held-intake-candidate-packet-v1.json"),
    Path("docs/public-node/work-credits/datanet-wc-held-intake-candidate-packet-v1.md"),
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
