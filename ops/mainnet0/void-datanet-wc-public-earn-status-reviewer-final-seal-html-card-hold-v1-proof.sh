#!/usr/bin/env bash
set -euo pipefail

BRICK="datanet-wc-public-earn-status-reviewer-final-seal-html-card-hold-v1"
MARKER="VOID_DATANET_WC_PUBLIC_EARN_STATUS_REVIEWER_FINAL_SEAL_HTML_CARD_HOLD_V1"

INDEX="public/public-node/work-credits/index.json"
CARD="public/public-node/work-credits/${BRICK}.json"
HTML="public/public-node/work-credits/${BRICK}.html"
DOC="docs/public-node/work-credits/${BRICK}.md"
PROOF="ops/mainnet0/void-${BRICK}-proof.sh"
SOURCE="public/public-node/work-credits/datanet-wc-public-earn-status-reviewer-final-seal-hold-v1.json"

echo "== JSON parse =="
python3 -m json.tool "$INDEX" >/dev/null
python3 -m json.tool "$CARD" >/dev/null
python3 -m json.tool "$SOURCE" >/dev/null
echo "json_green=true"

echo "== file presence =="
test -f "$HTML"
test -f "$DOC"
test -f "$PROOF"
echo "files_green=true"

echo "== binding =="
python3 - <<'PY'
import json
from pathlib import Path

brick = "datanet-wc-public-earn-status-reviewer-final-seal-html-card-hold-v1"
marker = "VOID_DATANET_WC_PUBLIC_EARN_STATUS_REVIEWER_FINAL_SEAL_HTML_CARD_HOLD_V1"
source = "/public-node/work-credits/datanet-wc-public-earn-status-reviewer-final-seal-hold-v1.json"

index = json.loads(Path("public/public-node/work-credits/index.json").read_text())
entries = {e["id"]: e for e in index["entries"]}
assert brick in entries

entry = entries[brick]
assert entry["status"] == "hold"
assert entry["path"] == f"/public-node/work-credits/{brick}.html"
assert entry["json"] == f"{brick}.json"
assert entry["html"] == f"{brick}.html"
assert entry["lane"] == "work_credits"
assert entry["scope"] == "datanet_wc_public_earn_status_reviewer_final_seal_html_card"
assert entry["html_card_only"] is True
assert entry["static_html_card_created"] is True
assert entry["source_final_seal"] == source
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
    "ledger_append_performed",
    "void_allocation_enabled",
    "void_transfer_enabled",
    "wallet_or_signer_required",
    "runtime_route_enabled",
    "runtime_mutation_route_enabled",
    "mutation_handler_enabled",
]:
    assert entry[key] is False, key

card = json.loads(Path(f"public/public-node/work-credits/{brick}.json").read_text())
assert card["schema"] == "void.public_node.work_credits.datanet_wc_public_earn_status_reviewer_final_seal_html_card.v1"
assert card["id"] == brick
assert card["status"] == "hold"
assert card["marker"] == marker
assert card["html_card_only"] is True
assert card["static_html_card_created"] is True
assert card["html_path"] == f"/public-node/work-credits/{brick}.html"
assert card["source_final_seal"] == source

policy = card["work_credits_policy"]
assert policy["wc_supply_unlimited_uncapped"] is True
assert policy["wc_supply_lifetime_cap_declared"] is False
assert policy["earning_remains_held"] is True
assert policy["available_work_is_informational_only"] is True
assert policy["public_submission_enabled"] is False
assert policy["wc_issuance_enabled"] is False
assert policy["wc_ledger_write_enabled"] is False

state = card["html_card_state"]
assert state["final_seal_source_present"] is True

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

safety = card["public_safety"]
for key in [
    "contains_private_operator_material",
    "contains_wallet_material",
    "contains_secret_material",
    "contains_transaction_hash",
    "public_mutation_enabled",
    "runtime_route_enabled",
    "wallet_or_signer_required",
]:
    assert safety[key] is False, key

source_card = json.loads(Path("public/public-node/work-credits/datanet-wc-public-earn-status-reviewer-final-seal-hold-v1.json").read_text())
assert source_card["id"] == "datanet-wc-public-earn-status-reviewer-final-seal-hold-v1"
assert source_card["marker"] == "VOID_DATANET_WC_PUBLIC_EARN_STATUS_REVIEWER_FINAL_SEAL_HOLD_V1"
assert source_card["work_credits_policy"]["wc_supply_unlimited_uncapped"] is True
assert source_card["work_credits_policy"]["wc_supply_lifetime_cap_declared"] is False
assert source_card["work_credits_policy"]["public_submission_enabled"] is False
assert source_card["work_credits_policy"]["accepts_work_packets"] is False
assert source_card["work_credits_policy"]["wc_issuance_enabled"] is False
assert source_card["work_credits_policy"]["wc_ledger_write_enabled"] is False
assert source_card["work_credits_policy"]["void_transfer_enabled"] is False

print("wc_public_earn_status_reviewer_final_seal_html_card_binding_green=true")
PY

echo "== source proof stack =="
out=".runtime/mainnet0/${BRICK}.source-rollup-proof.log"
mkdir -p .runtime/mainnet0
bash ops/mainnet0/void-datanet-wc-public-earn-status-reviewer-final-seal-hold-v1-proof.sh >"$out" 2>&1
grep -F "VOID_DATANET_WC_PUBLIC_EARN_STATUS_REVIEWER_FINAL_SEAL_HOLD_V1_GREEN" "$out" >/dev/null
echo "source_proof_stack_green=true"

echo "== HTML static safety =="
grep -F "$MARKER" "$HTML" >/dev/null
grep -F "Work Credits remain unlimited and uncapped" "$HTML" >/dev/null
grep -F "Earning remains held." "$HTML" >/dev/null
grep -F "No public submission endpoint is enabled." "$HTML" >/dev/null
grep -F "No WC approval, issuance, or ledger write is enabled or performed." "$HTML" >/dev/null
grep -F "No runtime mutation route or mutation handler is enabled." "$HTML" >/dev/null
grep -RInE '<script|<form|method=|onclick=|fetch\(|XMLHttpRequest|transaction hash: 0x|0x[a-fA-F0-9]{64}' "$HTML" \
  && { echo "html_static_safety_green=false"; exit 1; } \
  || echo "html_static_safety_green=true"

echo "== marker presence =="
grep -R "$MARKER" "$INDEX" "$CARD" "$HTML" "$DOC" "$PROOF" >/dev/null
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
  "\"void_allocation_enabled\": true"
  "\"void_allocation_performed\": true"
  "\"void_transfer_enabled\": true"
  "\"void_transfer_performed\": true"
  "\"transaction_created\": true"
  "\"transaction_signed\": true"
  "\"transaction_broadcast\": true"
  "\"wallet_or_signer_accessed\": true"
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
for path in "$INDEX" "$CARD" "$HTML" "$DOC"; do
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
echo "VOID_DATANET_WC_PUBLIC_EARN_STATUS_REVIEWER_FINAL_SEAL_HTML_CARD_HOLD_V1_GREEN"
