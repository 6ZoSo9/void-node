#!/usr/bin/env bash
set -euo pipefail

BRICK="datanet-wc-review-checklist-hold-v1"
MARKER="VOID_DATANET_WC_REVIEW_CHECKLIST_HOLD_V1"

INDEX="public/public-node/work-credits/index.json"
CARD="public/public-node/work-credits/${BRICK}.json"
DOC="docs/public-node/work-credits/${BRICK}.md"
PROOF="ops/mainnet0/void-datanet-wc-review-checklist-hold-v1-proof.sh"

echo "== JSON parse =="
python3 -m json.tool "$INDEX" >/dev/null
python3 -m json.tool "$CARD" >/dev/null
echo "json_green=true"

echo "== binding =="
python3 - <<'PY'
import json
from pathlib import Path

marker = "VOID_DATANET_WC_REVIEW_CHECKLIST_HOLD_V1"
entry_id = "datanet-wc-review-checklist-hold-v1"

index = json.loads(Path("public/public-node/work-credits/index.json").read_text())
entries = {entry["id"]: entry for entry in index["entries"]}
assert entry_id in entries

entry = entries[entry_id]
assert entry["status"] == "hold"
assert entry["path"] == "/public-node/work-credits/datanet-wc-review-checklist-hold-v1.json"
assert entry["json"] == "datanet-wc-review-checklist-hold-v1.json"
assert entry["lane"] == "work_credits"
assert entry["scope"] == "datanet_review_checklist"
assert entry["checklist_only"] is True
for key in [
    "live_earn_enabled",
    "public_submission_enabled",
    "wc_approval_enabled",
    "wc_issuance_enabled",
    "wc_ledger_write_enabled",
    "void_allocation_enabled",
    "usdc_autofulfillment_enabled"
]:
    assert entry[key] is False, key
assert entry["marker"] == marker

card = json.loads(Path("public/public-node/work-credits/datanet-wc-review-checklist-hold-v1.json").read_text())
assert card["schema"] == "void.public_node.work_credits.datanet_wc_review_checklist_hold.v1"
assert card["id"] == entry_id
assert card["status"] == "hold"
assert card["marker"] == marker
assert card["checklist_status"] == "checklist_only_hold"

state = card["review_state"]
for key in [
    "review_system_active",
    "packet_intake_active",
    "review_decision_enabled",
    "review_approval_enabled",
    "operator_action_enabled",
    "automatic_scoring_enabled"
]:
    assert state[key] is False, key

required_ids = {
    "packet_shape_present",
    "public_safe_evidence_only",
    "claimed_capability_clear",
    "review_window_clear",
    "duplicate_claim_precheck",
    "hold_boundary_confirmed"
}
checklist = card["checklist"]
assert {item["id"] for item in checklist} >= required_ids
assert all(item["required"] is True for item in checklist)

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

assert card["public_safety_boundary"]["public_checklist_only"] is True
print("checklist_binding_green=true")
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
    Path("public/public-node/work-credits/datanet-wc-review-checklist-hold-v1.json"),
    Path("docs/public-node/work-credits/datanet-wc-review-checklist-hold-v1.md"),
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
