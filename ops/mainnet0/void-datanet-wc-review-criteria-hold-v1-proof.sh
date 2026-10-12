#!/usr/bin/env bash
set -euo pipefail

BRICK="datanet-wc-review-criteria-hold-v1"
MARKER="VOID_DATANET_WC_REVIEW_CRITERIA_HOLD_V1"

INDEX="public/public-node/work-credits/index.json"
CARD="public/public-node/work-credits/${BRICK}.json"
DOC="docs/public-node/work-credits/${BRICK}.md"
PROOF="ops/mainnet0/void-datanet-wc-review-criteria-hold-v1-proof.sh"

echo "== JSON parse =="
python3 -m json.tool "$INDEX" >/dev/null
python3 -m json.tool "$CARD" >/dev/null
echo "json_green=true"

echo "== index criteria binding =="
python3 - <<'PY'
import json
from pathlib import Path

marker = "VOID_DATANET_WC_REVIEW_CRITERIA_HOLD_V1"
entry_id = "datanet-wc-review-criteria-hold-v1"

index = json.loads(Path("public/public-node/work-credits/index.json").read_text())
entries = {entry["id"]: entry for entry in index["entries"]}
assert entry_id in entries

entry = entries[entry_id]
assert entry["status"] == "hold"
assert entry["path"] == "/public-node/work-credits/datanet-wc-review-criteria-hold-v1.json"
assert entry["json"] == "datanet-wc-review-criteria-hold-v1.json"
assert entry["lane"] == "work_credits"
assert entry["scope"] == "datanet_review_criteria"
assert entry["criteria_only"] is True
assert entry["live_earn_enabled"] is False
assert entry["public_submission_enabled"] is False
assert entry["wc_issuance_enabled"] is False
assert entry["wc_approval_enabled"] is False
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

print("index_criteria_binding_green=true")
PY

echo "== criteria card binding =="
python3 - <<'PY'
import json
from pathlib import Path

marker = "VOID_DATANET_WC_REVIEW_CRITERIA_HOLD_V1"
card = json.loads(Path("public/public-node/work-credits/datanet-wc-review-criteria-hold-v1.json").read_text())

assert card["schema"] == "void.public_node.work_credits.datanet_wc_review_criteria_hold.v1"
assert card["id"] == "datanet-wc-review-criteria-hold-v1"
assert card["status"] == "hold"
assert card["marker"] == marker
assert card["criteria_status"] == "criteria_only_hold"

review = card["review_model"]
assert review["review_required"] is True
assert review["review_status"] == "not_active"
assert review["review_decision_enabled"] is False
assert review["review_approval_enabled"] is False
assert review["operator_action_enabled"] is False
assert review["automatic_scoring_enabled"] is False

criteria = card["criteria"]
assert len(criteria) >= 5
assert {c["id"] for c in criteria} >= {
    "public_safe_evidence",
    "availability_claim_shape",
    "reviewer_verifiability",
    "no_duplicate_reward_claim",
    "manual_hold_boundary"
}
assert all(c["required"] is True for c in criteria)

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

assert card["public_safety_boundary"]["public_criteria_only"] is True

print("criteria_card_binding_green=true")
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
    Path("public/public-node/work-credits/datanet-wc-review-criteria-hold-v1.json"),
    Path("docs/public-node/work-credits/datanet-wc-review-criteria-hold-v1.md"),
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
