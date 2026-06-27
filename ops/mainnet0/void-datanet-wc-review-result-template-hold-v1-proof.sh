#!/usr/bin/env bash
set -euo pipefail

BRICK="datanet-wc-review-result-template-hold-v1"
MARKER="VOID_DATANET_WC_REVIEW_RESULT_TEMPLATE_HOLD_V1"

INDEX="public/public-node/work-credits/index.json"
CARD="public/public-node/work-credits/${BRICK}.json"
DOC="docs/public-node/work-credits/${BRICK}.md"
PROOF="ops/mainnet0/void-datanet-wc-review-result-template-hold-v1-proof.sh"

echo "== JSON parse =="
python3 -m json.tool "$INDEX" >/dev/null
python3 -m json.tool "$CARD" >/dev/null
echo "json_green=true"

echo "== binding =="
python3 - <<'PY'
import json
from pathlib import Path

marker = "VOID_DATANET_WC_REVIEW_RESULT_TEMPLATE_HOLD_V1"
entry_id = "datanet-wc-review-result-template-hold-v1"

index = json.loads(Path("public/public-node/work-credits/index.json").read_text())
entries = {entry["id"]: entry for entry in index["entries"]}
assert entry_id in entries

entry = entries[entry_id]
assert entry["status"] == "hold"
assert entry["path"] == "/public-node/work-credits/datanet-wc-review-result-template-hold-v1.json"
assert entry["json"] == "datanet-wc-review-result-template-hold-v1.json"
assert entry["lane"] == "work_credits"
assert entry["scope"] == "datanet_review_result_template"
assert entry["template_only"] is True
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

card = json.loads(Path("public/public-node/work-credits/datanet-wc-review-result-template-hold-v1.json").read_text())
assert card["schema"] == "void.public_node.work_credits.datanet_wc_review_result_template_hold.v1"
assert card["id"] == entry_id
assert card["status"] == "hold"
assert card["marker"] == marker
assert card["template_status"] == "review_result_template_only_hold"

result = card["review_result_template"]
assert result["result_kind"] == "datanet_wc_review_result"
assert result["result_status"] == "template_only_not_reviewed"
assert result["review_basis"]["public_safe_evidence_reviewed"] is False
assert result["review_outcome"]["decision"] == "none"
assert result["review_outcome"]["eligible_for_future_wc_action"] is False
assert result["review_outcome"]["reviewer_identifier_public"] is False
assert result["review_outcome"]["operator_identifier_public"] is False
assert result["wc_result"]["wc_approval_performed"] is False
assert result["wc_result"]["wc_issuance_performed"] is False
assert result["wc_result"]["wc_amount"] == 0
assert result["wc_result"]["wc_ledger_write_performed"] is False
assert result["wc_result"]["ledger_entry_id"] == "none"
assert result["wc_result"]["void_allocation_performed"] is False
assert result["wc_result"]["void_transfer_performed"] is False

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

assert card["public_safety_boundary"]["public_template_only"] is True
print("review_result_template_binding_green=true")
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
    Path("public/public-node/work-credits/datanet-wc-review-result-template-hold-v1.json"),
    Path("docs/public-node/work-credits/datanet-wc-review-result-template-hold-v1.md"),
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
