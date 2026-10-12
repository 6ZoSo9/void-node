#!/usr/bin/env bash
set -euo pipefail

BRICK="datanet-wc-held-transfer-execute-gate-candidate-hold-v1"
MARKER="VOID_DATANET_WC_HELD_TRANSFER_EXECUTE_GATE_CANDIDATE_HOLD_V1"

INDEX="public/public-node/work-credits/index.json"
CARD="public/public-node/work-credits/${BRICK}.json"
DOC="docs/public-node/work-credits/${BRICK}.md"
PROOF="ops/mainnet0/void-datanet-wc-held-transfer-execute-gate-candidate-hold-v1-proof.sh"

echo "== JSON parse =="
python3 -m json.tool "$INDEX" >/dev/null
python3 -m json.tool "$CARD" >/dev/null
echo "json_green=true"

echo "== binding =="
python3 - <<'PY'
import json
from pathlib import Path

marker = "VOID_DATANET_WC_HELD_TRANSFER_EXECUTE_GATE_CANDIDATE_HOLD_V1"
entry_id = "datanet-wc-held-transfer-execute-gate-candidate-hold-v1"

index = json.loads(Path("public/public-node/work-credits/index.json").read_text())
entries = {entry["id"]: entry for entry in index["entries"]}
assert entry_id in entries

entry = entries[entry_id]
assert entry["status"] == "hold"
assert entry["path"] == "/public-node/work-credits/datanet-wc-held-transfer-execute-gate-candidate-hold-v1.json"
assert entry["json"] == "datanet-wc-held-transfer-execute-gate-candidate-hold-v1.json"
assert entry["lane"] == "work_credits"
assert entry["scope"] == "datanet_held_transfer_execute_gate_candidate"
assert entry["transfer_execute_gate_candidate_only"] is True
assert entry["execute_gate_created"] is False
assert entry["execute_gate_opened"] is False
assert entry["execution_authorized"] is False
assert entry["transaction_created"] is False
assert entry["transaction_signed"] is False
assert entry["broadcast_performed"] is False
assert entry["void_transfer_performed"] is False
assert entry["void_amount"] == 0
assert entry["wallet_or_signer_required"] is False
assert entry["runtime_mutation_route_enabled"] is False
assert entry["marker"] == marker

card = json.loads(Path("public/public-node/work-credits/datanet-wc-held-transfer-execute-gate-candidate-hold-v1.json").read_text())
assert card["schema"] == "void.public_node.work_credits.datanet_wc_held_transfer_execute_gate_candidate_hold.v1"
assert card["id"] == entry_id
assert card["status"] == "hold"
assert card["marker"] == marker
assert card["candidate_status"] == "held_transfer_execute_gate_candidate_only"

shape = card["candidate_execute_gate_shape"]
assert shape["execute_gate_kind"] == "datanet_wc_held_transfer_execute_gate"
assert shape["execute_gate_status"] == "held_closed_not_created"
assert shape["gate_intent"] == "none"
assert shape["eligible_for_execution"] is False
assert shape["void_amount"] == 0
assert shape["command_reference"] == "none"

state = shape["execute_gate_state"]
for key in [
    "execute_gate_created",
    "execute_gate_opened",
    "execute_authorization_created",
    "execution_authorized",
    "operator_action_enabled",
    "wallet_access_required",
    "signer_access_required",
    "transaction_path_enabled",
    "broadcast_path_enabled",
    "transfer_performed"
]:
    assert state[key] is False, key

for section in ["signing_boundary", "transaction_boundary"]:
    for key, value in shape[section].items():
        assert value is False, f"{section}.{key}"

for key in [
    "participant_identifier_public",
    "operator_identifier_public",
    "reviewer_identifier_public",
    "approver_identifier_public",
    "ledger_writer_identifier_public",
    "issuer_identifier_public",
    "allocator_identifier_public",
    "transfer_operator_identifier_public",
    "execute_operator_identifier_public"
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
        "exposes_transfer_operator_identifier",
        "exposes_execute_operator_identifier",
        "exposes_wallet_address",
        "exposes_transaction_hash",
        "requires_private_key",
        "requires_private_material"
    ],
    "execute_gate_boundary": [
        "execute_gate_active",
        "creates_execute_gate",
        "opens_execute_gate",
        "creates_execute_authorization",
        "authorizes_execution",
        "requires_wallet_access",
        "requires_signer_access",
        "enables_transaction_path",
        "enables_broadcast_path",
        "performs_transfer"
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
print("held_transfer_execute_gate_candidate_binding_green=true")
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
    Path("public/public-node/work-credits/datanet-wc-held-transfer-execute-gate-candidate-hold-v1.json"),
    Path("docs/public-node/work-credits/datanet-wc-held-transfer-execute-gate-candidate-hold-v1.md"),
]

bad_phrases = [
    "earning is live",
    "public submission enabled",
    "work credits issued",
    "wc issuance enabled",
    "ledger write enabled",
    "void allocation enabled",
    "void transfer enabled",
    "void transferred",
    "wallet access enabled",
    "signer access enabled",
    "transaction signed",
    "transaction broadcast",
    "network broadcast performed",
    "execution authorized",
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
