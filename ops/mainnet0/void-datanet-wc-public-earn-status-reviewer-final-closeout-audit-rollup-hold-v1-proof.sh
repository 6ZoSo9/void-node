#!/usr/bin/env bash
set -euo pipefail

BRICK="datanet-wc-public-earn-status-reviewer-final-closeout-audit-rollup-hold-v1"
MARKER="VOID_DATANET_WC_PUBLIC_EARN_STATUS_REVIEWER_FINAL_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1"

INDEX="public/public-node/work-credits/index.json"
CARD="public/public-node/work-credits/${BRICK}.json"
DOC="docs/public-node/work-credits/${BRICK}.md"
PROOF="ops/mainnet0/void-${BRICK}-proof.sh"

SOURCE_FINAL_SEAL="public/public-node/work-credits/datanet-wc-public-earn-status-reviewer-final-seal-hold-v1.json"
SOURCE_HTML_CARD="public/public-node/work-credits/datanet-wc-public-earn-status-reviewer-final-seal-html-card-hold-v1.html"
SOURCE_HTML_CARD_JSON="public/public-node/work-credits/datanet-wc-public-earn-status-reviewer-final-seal-html-card-hold-v1.json"
SOURCE_RUNTIME_VISIBILITY="public/public-node/work-credits/datanet-wc-public-earn-status-reviewer-final-seal-html-card-runtime-visibility-hold-v1.json"

echo "== JSON parse =="
python3 -m json.tool "$INDEX" >/dev/null
python3 -m json.tool "$CARD" >/dev/null
python3 -m json.tool "$SOURCE_FINAL_SEAL" >/dev/null
python3 -m json.tool "$SOURCE_HTML_CARD_JSON" >/dev/null
python3 -m json.tool "$SOURCE_RUNTIME_VISIBILITY" >/dev/null
echo "json_green=true"

echo "== source presence =="
test -f "$SOURCE_HTML_CARD"
grep -F "VOID_DATANET_WC_PUBLIC_EARN_STATUS_REVIEWER_FINAL_SEAL_HTML_CARD_HOLD_V1" "$SOURCE_HTML_CARD" >/dev/null
grep -F "Work Credits remain unlimited and uncapped" "$SOURCE_HTML_CARD" >/dev/null
grep -F "Earning remains held." "$SOURCE_HTML_CARD" >/dev/null
echo "source_files_green=true"

echo "== binding =="
python3 - <<'PY'
import json
from pathlib import Path

marker = "VOID_DATANET_WC_PUBLIC_EARN_STATUS_REVIEWER_FINAL_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1"
entry_id = "datanet-wc-public-earn-status-reviewer-final-closeout-audit-rollup-hold-v1"

source_final = "/public-node/work-credits/datanet-wc-public-earn-status-reviewer-final-seal-hold-v1.json"
source_html = "/public-node/work-credits/datanet-wc-public-earn-status-reviewer-final-seal-html-card-hold-v1.html"
source_runtime = "/public-node/work-credits/datanet-wc-public-earn-status-reviewer-final-seal-html-card-runtime-visibility-hold-v1.json"

index = json.loads(Path("public/public-node/work-credits/index.json").read_text())
entries = {entry["id"]: entry for entry in index["entries"]}
assert entry_id in entries

for source_id in [
    "datanet-wc-public-earn-status-reviewer-final-seal-hold-v1",
    "datanet-wc-public-earn-status-reviewer-final-seal-html-card-hold-v1",
    "datanet-wc-public-earn-status-reviewer-final-seal-html-card-runtime-visibility-hold-v1",
]:
    assert source_id in entries

entry = entries[entry_id]
assert entry["status"] == "hold"
assert entry["path"] == f"/public-node/work-credits/{entry_id}.json"
assert entry["json"] == f"{entry_id}.json"
assert entry["lane"] == "work_credits"
assert entry["scope"] == "datanet_wc_public_earn_status_reviewer_final_closeout_audit_rollup"
assert entry["summary_only"] is True
assert entry["reviewer_final_closeout_audit_rollup_only"] is True
assert entry["wc_supply_unlimited_uncapped"] is True
assert entry["wc_supply_lifetime_cap_declared"] is False
assert entry["source_final_seal_path"] == source_final
assert entry["source_html_card_path"] == source_html
assert entry["source_runtime_visibility_path"] == source_runtime
assert entry["marker"] == marker

for key in [
    "live_earn_enabled",
    "public_submission_enabled",
    "accepts_work_packets",
    "review_decision_enabled",
    "wc_approval_enabled",
    "wc_issuance_enabled",
    "wc_ledger_write_enabled",
    "void_allocation_enabled",
    "void_transfer_enabled",
    "usdc_autofulfillment_enabled",
    "wallet_or_signer_required",
    "runtime_route_enabled",
    "runtime_mutation_route_enabled",
    "mutation_handler_enabled",
]:
    assert entry[key] is False, key

card = json.loads(Path(f"public/public-node/work-credits/{entry_id}.json").read_text())
assert card["schema"] == "void.public_node.work_credits.datanet_wc_public_earn_status_reviewer_final_closeout_audit_rollup_hold.v1"
assert card["id"] == entry_id
assert card["status"] == "hold"
assert card["marker"] == marker
assert card["summary_status"] == "public_earn_status_reviewer_final_closeout_audit_rollup_only_hold"
assert card["summary_only"] is True
assert card["reviewer_final_closeout_audit_rollup_only"] is True
assert card["wc_supply_unlimited_uncapped"] is True
assert card["wc_supply_lifetime_cap_declared"] is False

existing_ids = {item["id"] for item in card["what_exists"]}
required_existing = {
    "public_wc_index",
    "prior_reviewer_closeout_rollup",
    "reviewer_final_seal",
    "reviewer_final_seal_html_card",
    "reviewer_final_seal_html_runtime_visibility",
}
assert required_existing <= existing_ids

expected_sealed = {
    "datanet-wc-public-earn-status-reviewer-final-seal-hold-v1": "VOID_DATANET_WC_PUBLIC_EARN_STATUS_REVIEWER_FINAL_SEAL_HOLD_V1_GREEN",
    "datanet-wc-public-earn-status-reviewer-final-seal-html-card-hold-v1": "VOID_DATANET_WC_PUBLIC_EARN_STATUS_REVIEWER_FINAL_SEAL_HTML_CARD_HOLD_V1_GREEN",
    "datanet-wc-public-earn-status-reviewer-final-seal-html-card-runtime-visibility-hold-v1": "VOID_DATANET_WC_PUBLIC_EARN_STATUS_REVIEWER_FINAL_SEAL_HTML_CARD_RUNTIME_VISIBILITY_HOLD_V1_GREEN",
}
sealed = {item["id"]: item for item in card["sealed_entries"]}
assert set(sealed) == set(expected_sealed)
for sid, proof_marker in expected_sealed.items():
    assert sealed[sid]["proof_marker"] == proof_marker
    assert sealed[sid]["path"].startswith("/public-node/work-credits/")

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
    "mutation_handler",
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
    for key in keys_false:
        assert card[section][key] is False, f"{section}.{key}"

source_final_card = json.loads(Path("public/public-node/work-credits/datanet-wc-public-earn-status-reviewer-final-seal-hold-v1.json").read_text())
source_html_card = json.loads(Path("public/public-node/work-credits/datanet-wc-public-earn-status-reviewer-final-seal-html-card-hold-v1.json").read_text())
source_runtime_card = json.loads(Path("public/public-node/work-credits/datanet-wc-public-earn-status-reviewer-final-seal-html-card-runtime-visibility-hold-v1.json").read_text())

assert source_final_card["work_credits_policy"]["wc_supply_unlimited_uncapped"] is True
assert source_final_card["work_credits_policy"]["earning_remains_held"] is True
assert source_final_card["work_credits_policy"]["wc_issuance_enabled"] is False
assert source_final_card["public_safety"]["runtime_route_enabled"] is False

assert source_html_card["work_credits_policy"]["wc_supply_unlimited_uncapped"] is True
assert source_html_card["html_card_state"]["live_earn_enabled"] is False
assert source_html_card["html_card_state"]["wc_issuance_enabled"] is False
assert source_html_card["html_card_state"]["mutation_handler_enabled"] is False

assert source_runtime_card["work_credits_policy"]["wc_supply_unlimited_uncapped"] is True
assert source_runtime_card["work_credits_policy"]["earning_remains_held"] is True
assert source_runtime_card["visibility_state"]["runtime_fetch_required"] is False
assert source_runtime_card["visibility_state"]["runtime_route_enabled"] is False
assert source_runtime_card["visibility_state"]["mutation_handler_enabled"] is False

print("public_earn_status_reviewer_final_closeout_audit_rollup_binding_green=true")
PY

echo "== component proof stack =="
declare -A PROOFS=(
  [VOID_DATANET_WC_PUBLIC_EARN_STATUS_REVIEWER_FINAL_SEAL_HOLD_V1_GREEN]="ops/mainnet0/void-datanet-wc-public-earn-status-reviewer-final-seal-hold-v1-proof.sh"
  [VOID_DATANET_WC_PUBLIC_EARN_STATUS_REVIEWER_FINAL_SEAL_HTML_CARD_HOLD_V1_GREEN]="ops/mainnet0/void-datanet-wc-public-earn-status-reviewer-final-seal-html-card-hold-v1-proof.sh"
  [VOID_DATANET_WC_PUBLIC_EARN_STATUS_REVIEWER_FINAL_SEAL_HTML_CARD_RUNTIME_VISIBILITY_HOLD_V1_GREEN]="ops/mainnet0/void-datanet-wc-public-earn-status-reviewer-final-seal-html-card-runtime-visibility-hold-v1-proof.sh"
)
mkdir -p .runtime/mainnet0
for proof_marker in "${!PROOFS[@]}"; do
  out=".runtime/mainnet0/${BRICK}.${proof_marker}.log"
  bash "${PROOFS[$proof_marker]}" >"$out" 2>&1
  grep -F "$proof_marker" "$out" >/dev/null
done
echo "component_proof_stack_green=true"

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
    Path("public/public-node/work-credits/datanet-wc-public-earn-status-reviewer-final-closeout-audit-rollup-hold-v1.json"),
    Path("docs/public-node/work-credits/datanet-wc-public-earn-status-reviewer-final-closeout-audit-rollup-hold-v1.md"),
]

bad_json = [
    '"wc_supply_lifetime_cap_declared": true',
    '"live_earn_enabled": true',
    '"public_submission_enabled": true',
    '"accepts_work_packets": true',
    '"review_decision_enabled": true',
    '"wc_approval_enabled": true',
    '"wc_issuance_enabled": true',
    '"wc_ledger_write_enabled": true',
    '"void_allocation_enabled": true',
    '"void_transfer_enabled": true',
    '"usdc_autofulfillment_enabled": true',
    '"wallet_or_signer_required": true',
    '"runtime_route_enabled": true',
    '"runtime_mutation_route_enabled": true',
    '"mutation_handler_enabled": true',
    '"opens_earn_lane": true',
    '"opens_review_lane": true',
    '"opens_packet_intake": true',
    '"creates_authority": true',
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
    "mutation handler enabled",
    "transaction hash: 0x",
]

for path in files:
    text = path.read_text()
    lower = text.lower()
    for needle in bad_json:
        assert needle not in text, f"{needle} found in {path}"
    for phrase in bad_phrases:
        assert phrase not in lower, f"{phrase} found in {path}"

print("forbidden_enablement_scan_green=true")
PY

echo "== result =="
echo "VOID_DATANET_WC_PUBLIC_EARN_STATUS_REVIEWER_FINAL_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1_GREEN"
