#!/usr/bin/env bash
set -euo pipefail

BRICK="datanet-wc-public-earn-status-chain-closeout-discovery-polish-hold-v1"
MARKER="VOID_DATANET_WC_PUBLIC_EARN_STATUS_CHAIN_CLOSEOUT_DISCOVERY_POLISH_HOLD_V1"

INDEX="public/public-node/work-credits/index.json"
CARD="public/public-node/work-credits/${BRICK}.json"
DOC="docs/public-node/work-credits/${BRICK}.md"
PROOF="ops/mainnet0/void-${BRICK}-proof.sh"

CHAIN_CLOSEOUT="public/public-node/work-credits/datanet-wc-public-earn-status-reviewer-chain-closeout-audit-hold-v1.json"
FEATURED_HTML="public/public-node/work-credits/datanet-wc-public-earn-status-reviewer-final-closeout-audit-rollup-html-card-hold-v1.html"
FEATURED_RUNTIME="public/public-node/work-credits/datanet-wc-public-earn-status-reviewer-final-closeout-audit-rollup-html-card-runtime-visibility-hold-v1.json"

echo "== JSON parse =="
python3 -m json.tool "$INDEX" >/dev/null
python3 -m json.tool "$CARD" >/dev/null
python3 -m json.tool "$CHAIN_CLOSEOUT" >/dev/null
python3 -m json.tool "$FEATURED_RUNTIME" >/dev/null
echo "json_green=true"

echo "== source presence =="
test -f "$FEATURED_HTML"
grep -F "VOID_DATANET_WC_PUBLIC_EARN_STATUS_REVIEWER_FINAL_CLOSEOUT_AUDIT_ROLLUP_HTML_CARD_HOLD_V1" "$FEATURED_HTML" >/dev/null
grep -F "Work Credits remain unlimited and uncapped" "$FEATURED_HTML" >/dev/null
grep -F "Earning remains held." "$FEATURED_HTML" >/dev/null
echo "source_files_green=true"

echo "== binding =="
python3 - <<'PY'
import json
from pathlib import Path

brick = "datanet-wc-public-earn-status-chain-closeout-discovery-polish-hold-v1"
marker = "VOID_DATANET_WC_PUBLIC_EARN_STATUS_CHAIN_CLOSEOUT_DISCOVERY_POLISH_HOLD_V1"

index = json.loads(Path("public/public-node/work-credits/index.json").read_text())
entries = {e["id"]: e for e in index["entries"]}
assert brick in entries
for source_id in [
    "datanet-wc-public-earn-status-reviewer-chain-closeout-audit-hold-v1",
    "datanet-wc-public-earn-status-reviewer-final-closeout-audit-rollup-html-card-hold-v1",
    "datanet-wc-public-earn-status-reviewer-final-closeout-audit-rollup-html-card-runtime-visibility-hold-v1",
]:
    assert source_id in entries

entry = entries[brick]
assert entry["status"] == "hold"
assert entry["path"] == f"/public-node/work-credits/{brick}.json"
assert entry["json"] == f"{brick}.json"
assert entry["lane"] == "work_credits"
assert entry["scope"] == "datanet_wc_public_earn_status_chain_closeout_discovery_polish"
assert entry["discovery_polish_only"] is True
assert entry["public_navigation_only"] is True
assert entry["featured_chain_closeout_path"] == "/public-node/work-credits/datanet-wc-public-earn-status-reviewer-chain-closeout-audit-hold-v1.json"
assert entry["featured_html_card_path"].endswith("-html-card-hold-v1.html")
assert entry["featured_runtime_visibility_path"].endswith("-runtime-visibility-hold-v1.json")
assert entry["chain_first_pr"] == 59
assert entry["chain_last_pr"] == 68
assert entry["chain_pr_count"] == 10
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
    "void_allocation_enabled",
    "void_transfer_enabled",
    "wallet_or_signer_required",
    "runtime_route_enabled",
    "runtime_mutation_route_enabled",
    "mutation_handler_enabled",
]:
    assert entry[key] is False, key

card = json.loads(Path(f"public/public-node/work-credits/{brick}.json").read_text())
assert card["schema"] == "void.public_node.work_credits.datanet_wc_public_earn_status_chain_closeout_discovery_polish_hold.v1"
assert card["id"] == brick
assert card["status"] == "hold"
assert card["marker"] == marker
assert card["discovery_polish_only"] is True
assert card["public_navigation_only"] is True
assert card["featured_chain_closeout"]["id"] == "datanet-wc-public-earn-status-reviewer-chain-closeout-audit-hold-v1"
assert card["featured_chain_closeout"]["proof_marker"] == "VOID_DATANET_WC_PUBLIC_EARN_STATUS_REVIEWER_CHAIN_CLOSEOUT_AUDIT_HOLD_V1_GREEN"
assert len(card["safe_public_entry_points"]) == 3
assert card["chain_range"]["first_pr"] == 59
assert card["chain_range"]["last_pr"] == 68
assert card["chain_range"]["reviewer_chain_prs"] == list(range(59, 69))
assert card["chain_range"]["reviewer_chain_pr_count"] == 10

policy = card["work_credits_policy"]
assert policy["wc_supply_unlimited_uncapped"] is True
assert policy["wc_supply_lifetime_cap_declared"] is False
assert policy["earning_remains_held"] is True

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

nav = card["navigation_state"]
assert nav["adds_static_discovery_metadata"] is True
assert nav["adds_public_index_entry"] is True
assert nav["modifies_existing_authority"] is False
assert nav["creates_runtime_route"] is False
assert nav["enables_runtime_route"] is False
assert nav["enables_mutation_handler"] is False

for key, value in card["public_safety"].items():
    assert value is False, key

chain = json.loads(Path("public/public-node/work-credits/datanet-wc-public-earn-status-reviewer-chain-closeout-audit-hold-v1.json").read_text())
assert chain["chain_range"]["first_pr"] == 59
assert chain["chain_range"]["last_pr"] == 67
assert chain["wc_supply_unlimited_uncapped"] is True
assert chain["wc_boundary"]["live_earn_enabled"] is False
assert chain["wc_boundary"]["issues_work_credits"] is False
assert chain["authority_boundary"]["adds_runtime_route"] is False

print("wc_public_earn_status_chain_closeout_discovery_polish_binding_green=true")
PY

echo "== component proof stack =="
mkdir -p .runtime/mainnet0
out=".runtime/mainnet0/${BRICK}.chain-closeout-proof.log"
bash ops/mainnet0/void-datanet-wc-public-earn-status-reviewer-chain-closeout-audit-hold-v1-proof.sh >"$out" 2>&1
grep -F "VOID_DATANET_WC_PUBLIC_EARN_STATUS_REVIEWER_CHAIN_CLOSEOUT_AUDIT_HOLD_V1_GREEN" "$out" >/dev/null
echo "component_proof_stack_green=true"

echo "== marker presence =="
grep -q "$MARKER" "$INDEX"
grep -q "$MARKER" "$CARD"
grep -q "$MARKER" "$DOC"
grep -q "$MARKER" "$PROOF"
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
  "\"void_allocation_enabled\": true"
  "\"void_transfer_enabled\": true"
  "\"wallet_or_signer_required\": true"
  "\"runtime_route_enabled\": true"
  "\"runtime_mutation_route_enabled\": true"
  "\"mutation_handler_enabled\": true"
  "\"modifies_existing_authority\": true"
  "\"creates_runtime_route\": true"
  "\"enables_runtime_route\": true"
  "\"enables_mutation_handler\": true"
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
echo "VOID_DATANET_WC_PUBLIC_EARN_STATUS_CHAIN_CLOSEOUT_DISCOVERY_POLISH_HOLD_V1_GREEN"
