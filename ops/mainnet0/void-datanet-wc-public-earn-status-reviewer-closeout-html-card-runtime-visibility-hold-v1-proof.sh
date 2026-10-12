#!/usr/bin/env bash
set -euo pipefail

BRICK="datanet-wc-public-earn-status-reviewer-closeout-html-card-runtime-visibility-hold-v1"
MARKER="VOID_DATANET_WC_PUBLIC_EARN_STATUS_REVIEWER_CLOSEOUT_HTML_CARD_RUNTIME_VISIBILITY_HOLD_V1"

SOURCE_HTML_PATH="/public-node/work-credits/datanet-wc-public-earn-status-reviewer-closeout-html-card-hold-v1.html"
SOURCE_JSON_PATH="/public-node/work-credits/datanet-wc-public-earn-status-reviewer-closeout-html-card-hold-v1.json"
SOURCE_MARKER="VOID_DATANET_WC_PUBLIC_EARN_STATUS_REVIEWER_CLOSEOUT_HTML_CARD_HOLD_V1"

INDEX="public/public-node/work-credits/index.json"
CARD="public/public-node/work-credits/${BRICK}.json"
DOC="docs/public-node/work-credits/${BRICK}.md"
PROOF="ops/mainnet0/void-${BRICK}-proof.sh"
SOURCE_HTML="public${SOURCE_HTML_PATH}"
SOURCE_JSON="public${SOURCE_JSON_PATH}"

echo "== JSON parse =="
python3 -m json.tool "$INDEX" >/dev/null
python3 -m json.tool "$CARD" >/dev/null
python3 -m json.tool "$SOURCE_JSON" >/dev/null
echo "json_green=true"

echo "== source static file presence =="
test -f "$SOURCE_HTML"
test -f "$SOURCE_JSON"
grep -F "$SOURCE_MARKER" "$SOURCE_HTML" >/dev/null
grep -F "Work Credits remain unlimited and uncapped" "$SOURCE_HTML" >/dev/null
grep -F "Earning remains held." "$SOURCE_HTML" >/dev/null
echo "source_static_files_green=true"

echo "== binding =="
python3 - <<'PY'
import json
from pathlib import Path

brick = "datanet-wc-public-earn-status-reviewer-closeout-html-card-runtime-visibility-hold-v1"
marker = "VOID_DATANET_WC_PUBLIC_EARN_STATUS_REVIEWER_CLOSEOUT_HTML_CARD_RUNTIME_VISIBILITY_HOLD_V1"
source_html = "/public-node/work-credits/datanet-wc-public-earn-status-reviewer-closeout-html-card-hold-v1.html"
source_json = "/public-node/work-credits/datanet-wc-public-earn-status-reviewer-closeout-html-card-hold-v1.json"

index = json.loads(Path("public/public-node/work-credits/index.json").read_text())
entries = {e["id"]: e for e in index["entries"]}
assert brick in entries
assert "datanet-wc-public-earn-status-reviewer-closeout-html-card-hold-v1" in entries

entry = entries[brick]
assert entry["status"] == "hold"
assert entry["path"] == f"/public-node/work-credits/{brick}.json"
assert entry["json"] == f"{brick}.json"
assert entry["lane"] == "work_credits"
assert entry["scope"] == "datanet_wc_public_earn_status_reviewer_closeout_html_card_runtime_visibility"
assert entry["runtime_visibility_hold_only"] is True
assert entry["source_html_path"] == source_html
assert entry["source_json_path"] == source_json
assert entry["static_html_file_required"] is True
assert entry["static_json_file_required"] is True
assert entry["runtime_server_required_for_green"] is False
assert entry["runtime_fetch_optional"] is True
assert entry["runtime_fetch_success_required"] is False
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
assert card["schema"] == "void.public_node.work_credits.datanet_wc_public_earn_status_reviewer_closeout_html_card_runtime_visibility.v1"
assert card["id"] == brick
assert card["status"] == "hold"
assert card["marker"] == marker
assert card["runtime_visibility_hold_only"] is True
assert card["source_html_path"] == source_html
assert card["source_json_path"] == source_json

policy = card["visibility_policy"]
assert policy["static_html_file_required"] is True
assert policy["static_json_file_required"] is True
assert policy["runtime_server_required_for_green"] is False
assert policy["local_runtime_fetch_optional"] is True
assert policy["local_runtime_not_seen_static_html_remains_green"] is True
assert policy["runtime_fetch_success_required"] is False
assert policy["runtime_mutation_route_added"] is False
assert policy["runtime_mutation_route_enabled"] is False
assert policy["mutation_handler_enabled"] is False

wc = card["work_credits_policy"]
assert wc["wc_supply_unlimited_uncapped"] is True
assert wc["wc_supply_lifetime_cap_declared"] is False
assert wc["earning_remains_held"] is True
assert wc["available_work_is_informational_only"] is True
assert wc["public_submission_enabled"] is False
assert wc["wc_issuance_enabled"] is False
assert wc["wc_ledger_write_enabled"] is False

state = card["visibility_state"]
assert state["source_static_html_present"] is True
assert state["source_static_json_present"] is True
assert state["source_index_entry_present"] is True
assert state["runtime_visibility_checked_by_proof"] is True
assert state["runtime_fetch_required"] is False
assert state["runtime_fetch_success_required"] is False

for key in [
    "live_earn_enabled",
    "public_submission_enabled",
    "accepts_work_packets",
    "review_decision_enabled",
    "wc_approval_enabled",
    "wc_issuance_enabled",
    "wc_ledger_write_enabled",
    "ledger_append_performed",
    "void_allocation_performed",
    "void_transfer_performed",
    "transaction_created",
    "transaction_signed",
    "transaction_broadcast",
    "wallet_or_signer_accessed",
    "runtime_route_enabled",
    "runtime_mutation_route_enabled",
    "mutation_handler_enabled",
]:
    assert state[key] is False, key

for key, value in card["public_safety"].items():
    assert value is False, key

source = json.loads(Path("public/public-node/work-credits/datanet-wc-public-earn-status-reviewer-closeout-html-card-hold-v1.json").read_text())
assert source["id"] == "datanet-wc-public-earn-status-reviewer-closeout-html-card-hold-v1"
assert source["marker"] == "VOID_DATANET_WC_PUBLIC_EARN_STATUS_REVIEWER_CLOSEOUT_HTML_CARD_HOLD_V1"
assert source["work_credits_policy"]["wc_supply_unlimited_uncapped"] is True
assert source["work_credits_policy"]["wc_supply_lifetime_cap_declared"] is False
assert source["work_credits_policy"]["earning_remains_held"] is True
assert source["html_card_state"]["live_earn_enabled"] is False
assert source["html_card_state"]["public_submission_enabled"] is False
assert source["html_card_state"]["wc_issuance_enabled"] is False
assert source["html_card_state"]["wc_ledger_write_enabled"] is False
assert source["html_card_state"]["void_transfer_performed"] is False
assert source["html_card_state"]["runtime_mutation_route_enabled"] is False
assert source["html_card_state"]["mutation_handler_enabled"] is False

print("wc_public_earn_status_reviewer_closeout_html_card_runtime_visibility_binding_green=true")
PY

echo "== optional local runtime fetch =="
mkdir -p .runtime/mainnet0
BASE="${BASE:-http://127.0.0.1:${HTTP_PORT:-4100}}"
OUT=".runtime/mainnet0/${BRICK}.runtime-fetch.html"

set +e
curl -fsS --max-time 5 "$BASE$SOURCE_HTML_PATH" > "$OUT"
FETCH_RC="$?"
set -e

if [ "$FETCH_RC" = "0" ]; then
  grep -F "$SOURCE_MARKER" "$OUT" >/dev/null
  grep -F "Work Credits remain unlimited and uncapped" "$OUT" >/dev/null
  grep -F "Earning remains held." "$OUT" >/dev/null
  echo "runtime_fetch_optional_available=true"
else
  echo "runtime_fetch_optional_available=false"
  echo "runtime_fetch_optional_rc=$FETCH_RC"
fi
echo "runtime_fetch_optional_green=true"

echo "== source proof stack =="
out=".runtime/mainnet0/${BRICK}.source-html-card-proof.log"
bash ops/mainnet0/void-datanet-wc-public-earn-status-reviewer-closeout-html-card-hold-v1-proof.sh >"$out" 2>&1
grep -F "VOID_DATANET_WC_PUBLIC_EARN_STATUS_REVIEWER_CLOSEOUT_HTML_CARD_HOLD_V1_GREEN" "$out" >/dev/null
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
  "\"ledger_append_performed\": true"
  "\"void_allocation_performed\": true"
  "\"void_transfer_enabled\": true"
  "\"void_transfer_performed\": true"
  "\"transaction_created\": true"
  "\"transaction_signed\": true"
  "\"transaction_broadcast\": true"
  "\"wallet_or_signer_accessed\": true"
  "\"wallet_or_signer_required\": true"
  "\"runtime_route_enabled\": true"
  "\"runtime_mutation_route_added\": true"
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
echo "VOID_DATANET_WC_PUBLIC_EARN_STATUS_REVIEWER_CLOSEOUT_HTML_CARD_RUNTIME_VISIBILITY_HOLD_V1_GREEN"
