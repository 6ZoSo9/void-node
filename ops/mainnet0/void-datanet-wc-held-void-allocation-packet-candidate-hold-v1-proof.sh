#!/usr/bin/env bash
set -euo pipefail

BRICK="datanet-wc-held-void-allocation-packet-candidate-hold-v1"
MARKER="VOID_DATANET_WC_HELD_VOID_ALLOCATION_PACKET_CANDIDATE_HOLD_V1"

INDEX="public/public-node/work-credits/index.json"
CARD="public/public-node/work-credits/${BRICK}.json"
DOC="docs/public-node/work-credits/${BRICK}.md"
PROOF="ops/mainnet0/void-datanet-wc-held-void-allocation-packet-candidate-hold-v1-proof.sh"

echo "== JSON parse =="
python3 -m json.tool "$INDEX" >/dev/null
python3 -m json.tool "$CARD" >/dev/null
echo "json_green=true"

echo "== binding =="
python3 - <<'PY'
import json
from pathlib import Path

marker = "VOID_DATANET_WC_HELD_VOID_ALLOCATION_PACKET_CANDIDATE_HOLD_V1"
entry_id = "datanet-wc-held-void-allocation-packet-candidate-hold-v1"

index = json.loads(Path("public/public-node/work-credits/index.json").read_text())
entries = {entry["id"]: entry for entry in index["entries"]}
assert entry_id in entries

entry = entries[entry_id]
assert entry["status"] == "hold"
assert entry["path"] == "/public-node/work-credits/datanet-wc-held-void-allocation-packet-candidate-hold-v1.json"
assert entry["json"] == "datanet-wc-held-void-allocation-packet-candidate-hold-v1.json"
assert entry["lane"] == "work_credits"
assert entry["scope"] == "datanet_held_void_allocation_packet_candidate"
assert entry["void_allocation_packet_candidate_only"] is True
assert entry["allocation_packet_created"] is False
assert entry["void_allocation_performed"] is False
assert entry["void_amount"] == 0
assert entry["void_transfer_performed"] is False
assert entry["execute_gate_opened"] is False
assert entry["wallet_or_signer_required"] is False
assert entry["wc_issuance_performed"] is False
for key in [
    "wc_ledger_write_enabled",
    "void_allocation_enabled",
    "void_transfer_enabled"
]:
    assert entry[key] is False, key
assert entry["marker"] == marker

card = json.loads(Path("public/public-node/work-credits/datanet-wc-held-void-allocation-packet-candidate-hold-v1.json").read_text())
assert card["schema"] == "void.public_node.work_credits.datanet_wc_held_void_allocation_packet_candidate_hold.v1"
assert card["id"] == entry_id
assert card["status"] == "hold"
assert card["marker"] == marker
assert card["candidate_status"] == "held_void_allocation_packet_candidate_only"

shape = card["candidate_allocation_packet_shape"]
assert shape["allocation_packet_kind"] == "datanet_wc_held_void_allocation_packet"
assert shape["allocation_packet_status"] == "held_not_created"
assert shape["allocation_intent"] == "none"
assert shape["eligible_for_void_allocation"] is False
assert shape["wc_amount"] == 0
assert shape["void_amount"] == 0
assert shape["allocation_result"] == "none"

target = shape["allocation_target"]
assert target["recipient_reference"] == "none"
assert target["wallet_address_required"] is False
assert target["wallet_address_public"] is False
assert target["signer_required"] is False

state = shape["allocation_state"]
for key in [
    "allocation_packet_created",
    "allocation_prepared",
    "void_allocation_performed",
    "void_transfer_prepared",
    "void_transfer_performed",
    "execute_gate_opened",
    "operator_action_enabled",
    "wallet_access_required",
    "signer_access_required"
]:
    assert state[key] is False, key

for key in [
    "participant_identifier_public",
    "operator_identifier_public",
    "reviewer_identifier_public",
    "approver_identifier_public",
    "ledger_writer_identifier_public",
    "issuer_identifier_public",
    "allocator_identifier_public"
]:
    assert shape["identity_boundary"][key] is False, key

for section, keys_false in {
    "public_safety_boundary": [
        "exposes_private_object_material",
        "exposes_private_content_root",
        "exposes_private_object_id",
        "exposes_participant_identifier",
        "exposes_reviewer_identifier",
        "exposes_operator_identifier",
        "exposes_approver_identifier",
        "exposes_ledger_writer_identifier",
        "exposes_issuer_identifier",
        "exposes_allocator_identifier",
        "exposes_wallet_address",
        "requires_private_material"
    ],
    "allocation_boundary": [
        "allocation_active",
        "creates_allocation_packet",
        "prepares_allocation",
        "allocates_void",
        "prepares_void_transfer",
        "transfers_void",
        "opens_execute_gate",
        "requires_wallet_access",
        "requires_signer_access",
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
print("held_void_allocation_packet_candidate_binding_green=true")
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
    Path("public/public-node/work-credits/datanet-wc-held-void-allocation-packet-candidate-hold-v1.json"),
    Path("docs/public-node/work-credits/datanet-wc-held-void-allocation-packet-candidate-hold-v1.md"),
]

bad_phrases = [
    "earning is live",
    "public submission enabled",
    "work credits issued",
    "wc issuance enabled",
    "ledger write enabled",
    "ledger line created",
    "ledger file mutated",
    "void allocation enabled",
    "void transfer enabled",
    "void transferred",
    "wallet access enabled",
    "signer access enabled",
    "execute gate opened",
    "runtime mutation route enabled",
    "mutation handler enabled",
    "void_amount=1",
    "void amount is 1"
]

for path in files:
    text = path.read_text().lower()
    for phrase in bad_phrases:
        assert phrase not in text, f"{phrase} found in {path}"

print("forbidden_enablement_scan_green=true")
PY

echo "== result =="
echo "${MARKER}_GREEN"
