#!/usr/bin/env bash
set -euo pipefail

BRICK="datanet-wc-held-settlement-final-seal-html-card-runtime-visibility-hold-v1"
MARKER="VOID_DATANET_WC_HELD_SETTLEMENT_FINAL_SEAL_HTML_CARD_RUNTIME_VISIBILITY_HOLD_V1"

SOURCE_HTML_PATH="/public-node/work-credits/datanet-wc-held-settlement-final-seal-html-card-hold-v1.html"
SOURCE_JSON_PATH="/public-node/work-credits/datanet-wc-held-settlement-final-seal-html-card-hold-v1.json"

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
grep -F "VOID_DATANET_WC_HELD_SETTLEMENT_FINAL_SEAL_HTML_CARD_HOLD_V1" "$SOURCE_HTML" >/dev/null
grep -F "Work Credits remain unlimited and uncapped" "$SOURCE_HTML" >/dev/null
echo "source_static_files_green=true"

echo "== binding =="
python3 - <<'PY'
import json
from pathlib import Path

brick = "datanet-wc-held-settlement-final-seal-html-card-runtime-visibility-hold-v1"
marker = "VOID_DATANET_WC_HELD_SETTLEMENT_FINAL_SEAL_HTML_CARD_RUNTIME_VISIBILITY_HOLD_V1"
source_html = "/public-node/work-credits/datanet-wc-held-settlement-final-seal-html-card-hold-v1.html"
source_json = "/public-node/work-credits/datanet-wc-held-settlement-final-seal-html-card-hold-v1.json"

index = json.loads(Path("public/public-node/work-credits/index.json").read_text())
entries = {e["id"]: e for e in index["entries"]}
assert brick in entries

entry = entries[brick]
assert entry["status"] == "hold"
assert entry["path"] == f"/public-node/work-credits/{brick}.json"
assert entry["json"] == f"{brick}.json"
assert entry["lane"] == "work_credits"
assert entry["scope"] == "datanet_held_settlement_final_seal_html_card_runtime_visibility"
assert entry["runtime_visibility_hold_only"] is True
assert entry["source_html_path"] == source_html
assert entry["source_json_path"] == source_json
assert entry["static_html_file_required"] is True
assert entry["runtime_server_required_for_green"] is False
assert entry["runtime_mutation_route_added"] is False
assert entry["runtime_mutation_route_enabled"] is False
assert entry["mutation_handler_enabled"] is False
assert entry["wc_supply_unlimited_uncapped"] is True
assert entry["wc_supply_lifetime_cap_declared"] is False
assert entry["candidate_zero_amount_is_supply_cap"] is False
assert entry["wc_amount"] == 0
assert entry["void_amount"] == 0
assert entry["marker"] == marker

for key in [
    "wc_issuance_performed",
    "ledger_append_performed",
    "void_allocation_performed",
    "void_transfer_performed",
    "transaction_hash_exposed",
    "wallet_or_signer_required",
]:
    assert entry[key] is False, key

card = json.loads(Path(f"public/public-node/work-credits/{brick}.json").read_text())
assert card["schema"] == "void.public_node.work_credits.held_settlement_final_seal_html_card_runtime_visibility.v1"
assert card["id"] == brick
assert card["status"] == "hold"
assert card["marker"] == marker
assert card["runtime_visibility_hold_only"] is True
assert card["source_html_path"] == source_html
assert card["source_json_path"] == source_json

policy = card["visibility_policy"]
assert policy["static_html_file_required"] is True
assert policy["runtime_server_required_for_green"] is False
assert policy["local_runtime_fetch_optional"] is True
assert policy["local_runtime_not_seen_static_html_remains_green"] is True
assert policy["runtime_mutation_route_added"] is False
assert policy["runtime_mutation_route_enabled"] is False
assert policy["mutation_handler_enabled"] is False

wc = card["work_credits_policy"]
assert wc["wc_supply_unlimited_uncapped"] is True
assert wc["wc_supply_lifetime_cap_declared"] is False
assert wc["candidate_zero_amount_is_supply_cap"] is False
assert wc["candidate_amounts_are_placeholders_only"] is True

amounts = card["candidate_amounts"]
assert amounts["wc_amount"] == 0
assert amounts["void_amount"] == 0

state = card["visibility_state"]
assert state["source_static_html_present"] is True
assert state["source_static_json_present"] is True
assert state["source_index_entry_present"] is True
assert state["runtime_visibility_checked_by_proof"] is True
assert state["runtime_fetch_required"] is False
assert state["runtime_fetch_success_required"] is False
assert state["transaction_hash"] is None

for key in [
    "wc_issuance_performed",
    "ledger_append_performed",
    "void_allocation_performed",
    "void_transfer_performed",
    "transaction_created",
    "transaction_signed",
    "transaction_broadcast",
    "transaction_hash_exposed",
    "settlement_receipt_created",
    "verify_pack_created",
    "wallet_or_signer_accessed",
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
    "contains_private_ledger_path",
    "contains_worker_private_identity",
    "public_mutation_enabled",
    "runtime_route_enabled",
    "wallet_or_signer_required",
]:
    assert safety[key] is False, key

print("held_settlement_final_seal_html_card_runtime_visibility_binding_green=true")
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
  grep -F "VOID_DATANET_WC_HELD_SETTLEMENT_FINAL_SEAL_HTML_CARD_HOLD_V1" "$OUT" >/dev/null
  grep -F "Work Credits remain unlimited and uncapped" "$OUT" >/dev/null
  echo "runtime_fetch_optional_available=true"
else
  echo "runtime_fetch_optional_available=false"
  echo "runtime_fetch_optional_rc=$FETCH_RC"
fi
echo "runtime_fetch_optional_green=true"

echo "== marker presence =="
grep -R "$MARKER" "$INDEX" "$CARD" "$DOC" "$PROOF" >/dev/null
echo "marker_green=true"

echo "== forbidden enablement scan =="
python3 - <<'PY'
from pathlib import Path

paths = [
    Path("public/public-node/work-credits/index.json"),
    Path("public/public-node/work-credits/datanet-wc-held-settlement-final-seal-html-card-runtime-visibility-hold-v1.json"),
    Path("docs/public-node/work-credits/datanet-wc-held-settlement-final-seal-html-card-runtime-visibility-hold-v1.md"),
]

bad = [
    '"wc_supply_lifetime_cap_declared": true',
    '"candidate_zero_amount_is_supply_cap": true',
    '"wc_issuance_performed": true',
    '"ledger_append_performed": true',
    '"void_allocation_performed": true',
    '"void_transfer_performed": true',
    '"transaction_created": true',
    '"transaction_signed": true',
    '"transaction_broadcast": true',
    '"transaction_hash_exposed": true',
    '"settlement_receipt_created": true',
    '"verify_pack_created": true',
    '"wallet_or_signer_accessed": true',
    '"runtime_mutation_route_added": true',
    '"runtime_mutation_route_enabled": true',
    '"mutation_handler_enabled": true',
    '"wallet_or_signer_required": true',
    '"public_mutation_enabled": true',
    '"runtime_route_enabled": true',
    '"contains_private_operator_material": true',
    '"contains_wallet_material": true',
    '"contains_secret_material": true',
    '"contains_transaction_hash": true',
    '"contains_private_ledger_path": true',
    '"contains_worker_private_identity": true',
    '"transaction_hash": "0x',
]

hits = []
for path in paths:
    text = path.read_text()
    for needle in bad:
        if needle in text:
            hits.append(f"{path}:{needle}")

if hits:
    print("\n".join(hits))
    raise SystemExit("forbidden_enablement_scan_green=false")

print("forbidden_enablement_scan_green=true")
PY

echo "== result =="
echo "VOID_DATANET_WC_HELD_SETTLEMENT_FINAL_SEAL_HTML_CARD_RUNTIME_VISIBILITY_HOLD_V1_GREEN"
