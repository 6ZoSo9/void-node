#!/usr/bin/env bash
set -euo pipefail

BRICK="datanet-wc-public-earn-readiness-summary-hold-v1"
MARKER="VOID_DATANET_WC_PUBLIC_EARN_READINESS_SUMMARY_HOLD_V1"

INDEX="public/public-node/work-credits/index.json"
CARD="public/public-node/work-credits/${BRICK}.json"
DOC="docs/public-node/work-credits/${BRICK}.md"
PROOF="ops/mainnet0/void-datanet-wc-public-earn-readiness-summary-hold-v1-proof.sh"

echo "== JSON parse =="
python3 -m json.tool "$INDEX" >/dev/null
python3 -m json.tool "$CARD" >/dev/null
echo "json_green=true"

echo "== binding =="
python3 - <<'PY'
import json
from pathlib import Path

marker = "VOID_DATANET_WC_PUBLIC_EARN_READINESS_SUMMARY_HOLD_V1"
entry_id = "datanet-wc-public-earn-readiness-summary-hold-v1"

index = json.loads(Path("public/public-node/work-credits/index.json").read_text())
entries = {entry["id"]: entry for entry in index["entries"]}
assert entry_id in entries

entry = entries[entry_id]
assert entry["status"] == "hold"
assert entry["path"] == "/public-node/work-credits/datanet-wc-public-earn-readiness-summary-hold-v1.json"
assert entry["json"] == "datanet-wc-public-earn-readiness-summary-hold-v1.json"
assert entry["lane"] == "work_credits"
assert entry["scope"] == "datanet_public_earn_readiness_summary"
assert entry["summary_only"] is True
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

card = json.loads(Path("public/public-node/work-credits/datanet-wc-public-earn-readiness-summary-hold-v1.json").read_text())
assert card["schema"] == "void.public_node.work_credits.datanet_wc_public_earn_readiness_summary_hold.v1"
assert card["id"] == entry_id
assert card["status"] == "hold"
assert card["marker"] == marker
assert card["summary_status"] == "public_earn_readiness_summary_only_hold"

existing_ids = {item["id"] for item in card["what_exists"]}
required_existing = {
    "public_wc_index",
    "availability_status_card",
    "work_packet_template",
    "work_packet_example",
    "review_criteria",
    "review_checklist",
    "review_result_template",
    "review_result_example",
    "review_lane_rollup"
}
assert required_existing <= existing_ids

held = card["what_is_held"]
for key in [
    "packet_intake",
    "public_submission_endpoint",
    "active_review_decision",
    "live_earning",
    "wc_approval",
    "wc_issuance",
    "wc_ledger_write",
    "void_allocation",
    "void_transfer",
    "usdc_autofulfillment",
    "wallet_access",
    "signer_access",
    "runtime_route",
    "mutation_handler"
]:
    assert held[key] == "held", key

readiness = card["readiness_boundary"]
assert readiness["summary_only"] is True
assert readiness["public_discovery_only"] is True
assert readiness["creates_authority"] is False
assert readiness["opens_earn_lane"] is False
assert readiness["opens_review_lane"] is False
assert readiness["opens_packet_intake"] is False

for section, keys_false in {
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

print("public_earn_readiness_summary_binding_green=true")
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
    Path("public/public-node/work-credits/datanet-wc-public-earn-readiness-summary-hold-v1.json"),
    Path("docs/public-node/work-credits/datanet-wc-public-earn-readiness-summary-hold-v1.md"),
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
