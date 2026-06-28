#!/usr/bin/env bash
set -euo pipefail

BRICK="datanet-wc-public-earn-status-reviewer-final-seal-hold-v1"
MARKER="VOID_DATANET_WC_PUBLIC_EARN_STATUS_REVIEWER_FINAL_SEAL_HOLD_V1"

INDEX="public/public-node/work-credits/index.json"
CARD="public/public-node/work-credits/${BRICK}.json"
DOC="docs/public-node/work-credits/${BRICK}.md"
PROOF="ops/mainnet0/void-${BRICK}-proof.sh"
SRC_ROLLUP="public/public-node/work-credits/datanet-wc-public-earn-status-reviewer-closeout-rollup-hold-v1.json"
SRC_HTML="public/public-node/work-credits/datanet-wc-public-earn-status-reviewer-closeout-html-card-hold-v1.html"
SRC_RUNTIME="public/public-node/work-credits/datanet-wc-public-earn-status-reviewer-closeout-html-card-runtime-visibility-hold-v1.json"

echo "== JSON parse =="
python3 -m json.tool "$INDEX" >/dev/null
python3 -m json.tool "$CARD" >/dev/null
python3 -m json.tool "$SRC_ROLLUP" >/dev/null
python3 -m json.tool "$SRC_RUNTIME" >/dev/null
echo "json_green=true"

echo "== source presence =="
test -f "$SRC_HTML"
test -f "$DOC"
test -f "$PROOF"
grep -F "VOID_DATANET_WC_PUBLIC_EARN_STATUS_REVIEWER_CLOSEOUT_HTML_CARD_HOLD_V1" "$SRC_HTML" >/dev/null
echo "source_files_green=true"

echo "== binding =="
python3 - <<PY
import json
from pathlib import Path

brick = "datanet-wc-public-earn-status-reviewer-final-seal-hold-v1"
marker = "VOID_DATANET_WC_PUBLIC_EARN_STATUS_REVIEWER_FINAL_SEAL_HOLD_V1"

src_rollup = "/public-node/work-credits/datanet-wc-public-earn-status-reviewer-closeout-rollup-hold-v1.json"
src_html = "/public-node/work-credits/datanet-wc-public-earn-status-reviewer-closeout-html-card-hold-v1.html"
src_runtime = "/public-node/work-credits/datanet-wc-public-earn-status-reviewer-closeout-html-card-runtime-visibility-hold-v1.json"

index = json.loads(Path("public/public-node/work-credits/index.json").read_text())
entries = {e["id"]: e for e in index["entries"]}
assert brick in entries

for source_id in [
    "datanet-wc-public-earn-status-reviewer-closeout-rollup-hold-v1",
    "datanet-wc-public-earn-status-reviewer-closeout-html-card-hold-v1",
    "datanet-wc-public-earn-status-reviewer-closeout-html-card-runtime-visibility-hold-v1",
]:
    assert source_id in entries

entry = entries[brick]
assert entry["status"] == "hold"
assert entry["path"] == f"/public-node/work-credits/{brick}.json"
assert entry["json"] == f"{brick}.json"
assert entry["lane"] == "work_credits"
assert entry["scope"] == "datanet_wc_public_earn_status_reviewer_final_seal"
assert entry["public_reviewer_final_seal_only"] is True
assert entry["earn_status_visibility_status"] == "closed_hold"
assert entry["source_closeout_rollup_path"] == src_rollup
assert entry["source_html_card_path"] == src_html
assert entry["source_runtime_visibility_path"] == src_runtime
assert entry["wc_supply_unlimited_uncapped"] is True
assert entry["wc_supply_lifetime_cap_declared"] is False
assert entry["earning_remains_held"] is True
assert entry["marker"] == marker

for key in [
    "live_earn_enabled",
    "public_submission_enabled",
    "accepts_work_packets",
    "review_decision_enabled",
    "wc_approval_enabled",
    "wc_issuance_enabled",
    "wc_ledger_write_enabled",
    "void_transfer_enabled",
    "wallet_or_signer_required",
    "runtime_route_enabled",
    "runtime_mutation_route_enabled",
    "mutation_handler_enabled",
]:
    assert entry[key] is False, key

card = json.loads(Path(f"public/public-node/work-credits/{brick}.json").read_text())
assert card["schema"] == "void.public_node.work_credits.datanet_wc_public_earn_status_reviewer_final_seal.v1"
assert card["id"] == brick
assert card["status"] == "hold"
assert card["marker"] == marker
assert card["public_reviewer_final_seal_only"] is True
assert card["earn_status_visibility_status"] == "closed_hold"

sources = card["sources"]
assert sources["reviewer_closeout_rollup"] == src_rollup
assert sources["reviewer_closeout_html_card"] == src_html
assert sources["reviewer_closeout_runtime_visibility"] == src_runtime

expected = {
    "datanet-wc-public-earn-status-reviewer-closeout-rollup-hold-v1": "VOID_DATANET_WC_PUBLIC_EARN_STATUS_REVIEWER_CLOSEOUT_ROLLUP_HOLD_V1_GREEN",
    "datanet-wc-public-earn-status-reviewer-closeout-html-card-hold-v1": "VOID_DATANET_WC_PUBLIC_EARN_STATUS_REVIEWER_CLOSEOUT_HTML_CARD_HOLD_V1_GREEN",
    "datanet-wc-public-earn-status-reviewer-closeout-html-card-runtime-visibility-hold-v1": "VOID_DATANET_WC_PUBLIC_EARN_STATUS_REVIEWER_CLOSEOUT_HTML_CARD_RUNTIME_VISIBILITY_HOLD_V1_GREEN",
}
sealed = {e["id"]: e for e in card["sealed_entries"]}
assert set(sealed) == set(expected)
for sid, proof_marker in expected.items():
    assert sealed[sid]["proof_marker"] == proof_marker
    assert sealed[sid]["path"].startswith("/public-node/work-credits/")

policy = card["work_credits_policy"]
for key in [
    "public_submission_enabled",
    "accepts_work_packets",
    "review_decision_enabled",
    "wc_approval_enabled",
    "wc_issuance_enabled",
    "wc_ledger_write_enabled",
    "void_transfer_enabled",
]:
    assert policy[key] is False, key
assert policy["wc_supply_unlimited_uncapped"] is True
assert policy["wc_supply_lifetime_cap_declared"] is False
assert policy["earning_remains_held"] is True
assert policy["available_work_is_informational_only"] is True

for key, value in card["public_safety"].items():
    assert value is False, key

rollup = json.loads(Path("public/public-node/work-credits/datanet-wc-public-earn-status-reviewer-closeout-rollup-hold-v1.json").read_text())
runtime = json.loads(Path("public/public-node/work-credits/datanet-wc-public-earn-status-reviewer-closeout-html-card-runtime-visibility-hold-v1.json").read_text())
assert rollup["wc_supply_unlimited_uncapped"] is True
assert rollup["wc_supply_lifetime_cap_declared"] is False
assert runtime["work_credits_policy"]["earning_remains_held"] is True
assert runtime["visibility_state"]["runtime_route_enabled"] is False
assert runtime["visibility_state"]["mutation_handler_enabled"] is False

print("wc_public_earn_status_reviewer_final_seal_binding_green=true")
PY

echo "== source proof stack =="
declare -A PROOFS=(
  [VOID_DATANET_WC_PUBLIC_EARN_STATUS_REVIEWER_CLOSEOUT_ROLLUP_HOLD_V1_GREEN]="ops/mainnet0/void-datanet-wc-public-earn-status-reviewer-closeout-rollup-hold-v1-proof.sh"
  [VOID_DATANET_WC_PUBLIC_EARN_STATUS_REVIEWER_CLOSEOUT_HTML_CARD_HOLD_V1_GREEN]="ops/mainnet0/void-datanet-wc-public-earn-status-reviewer-closeout-html-card-hold-v1-proof.sh"
  [VOID_DATANET_WC_PUBLIC_EARN_STATUS_REVIEWER_CLOSEOUT_HTML_CARD_RUNTIME_VISIBILITY_HOLD_V1_GREEN]="ops/mainnet0/void-datanet-wc-public-earn-status-reviewer-closeout-html-card-runtime-visibility-hold-v1-proof.sh"
)
mkdir -p .runtime/mainnet0
for proof_marker in "${!PROOFS[@]}"; do
  out=".runtime/mainnet0/${BRICK}.${proof_marker}.log"
  bash "${PROOFS[$proof_marker]}" >"$out" 2>&1
  grep -F "$proof_marker" "$out" >/dev/null
done
echo "source_proof_stack_green=true"

echo "== marker presence =="
grep -R "$MARKER" "$INDEX" "$CARD" "$DOC" "$PROOF" >/dev/null
echo "marker_green=true"

echo "== forbidden enablement scan =="
bad=(
  "\"wc_supply_lifetime_cap_declared\": true"
  "\"earning_remains_held\": false"
  "\"live_earn_enabled\": true"
  "\"public_submission_enabled\": true"
  "\"accepts_work_packets\": true"
  "\"review_decision_enabled\": true"
  "\"wc_approval_enabled\": true"
  "\"wc_issuance_enabled\": true"
  "\"wc_ledger_write_enabled\": true"
  "\"void_transfer_enabled\": true"
  "\"wallet_or_signer_required\": true"
  "\"runtime_route_enabled\": true"
  "\"runtime_mutation_route_enabled\": true"
  "\"mutation_handler_enabled\": true"
  "\"public_mutation_enabled\": true"
  "\"contains_private_operator_material\": true"
  "\"contains_wallet_material\": true"
  "\"contains_secret_material\": true"
  "\"contains_transaction_hash\": true"
  "transaction hash: 0x"
)
for path in "$INDEX" "$CARD" "$DOC"; do
  for needle in "${bad[@]}"; do
    if grep -F "$needle" "$path" >/dev/null; then
      echo "$path:$needle"
      echo "forbidden_enablement_scan_green=false"
      exit 1
    fi
  done
done
echo "forbidden_enablement_scan_green=true"

echo "== result =="
echo "VOID_DATANET_WC_PUBLIC_EARN_STATUS_REVIEWER_FINAL_SEAL_HOLD_V1_GREEN"
