#!/usr/bin/env bash
set -euo pipefail

BRICK="datanet-wc-available-work-public-html-card-runtime-visibility-hold-v1"
MARKER="VOID_DATANET_WC_AVAILABLE_WORK_PUBLIC_HTML_CARD_RUNTIME_VISIBILITY_HOLD_V1"

SOURCE_HTML_PATH="/public-node/work-credits/datanet-wc-available-work-public-html-card-hold-v1.html"
SOURCE_JSON_PATH="/public-node/work-credits/datanet-wc-available-work-public-html-card-hold-v1.json"

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
grep -F "VOID_DATANET_WC_AVAILABLE_WORK_PUBLIC_HTML_CARD_HOLD_V1" "$SOURCE_HTML" >/dev/null
grep -F "Work Credits remain unlimited and uncapped" "$SOURCE_HTML" >/dev/null
echo "source_static_files_green=true"

echo "== binding =="
python3 - <<'PY'
import json
from pathlib import Path

brick = "datanet-wc-available-work-public-html-card-runtime-visibility-hold-v1"
marker = "VOID_DATANET_WC_AVAILABLE_WORK_PUBLIC_HTML_CARD_RUNTIME_VISIBILITY_HOLD_V1"
source_html = "/public-node/work-credits/datanet-wc-available-work-public-html-card-hold-v1.html"
source_json = "/public-node/work-credits/datanet-wc-available-work-public-html-card-hold-v1.json"

index = json.loads(Path("public/public-node/work-credits/index.json").read_text())
entries = {e["id"]: e for e in index["entries"]}
assert brick in entries

entry = entries[brick]
assert entry["status"] == "hold"
assert entry["path"] == f"/public-node/work-credits/{brick}.json"
assert entry["json"] == f"{brick}.json"
assert entry["lane"] == "work_credits"
assert entry["scope"] == "datanet_wc_available_work_public_html_card_runtime_visibility"
assert entry["runtime_visibility_hold_only"] is True
assert entry["source_html_path"] == source_html
assert entry["source_json_path"] == source_json
assert entry["static_html_file_required"] is True
assert entry["runtime_server_required_for_green"] is False
assert entry["runtime_fetch_optional"] is True
assert entry["runtime_mutation_route_added"] is False
assert entry["runtime_mutation_route_enabled"] is False
assert entry["mutation_handler_enabled"] is False
assert entry["public_submission_enabled"] is False
assert entry["wc_issuance_enabled"] is False
assert entry["wc_ledger_write_enabled"] is False
assert entry["void_transfer_enabled"] is False
assert entry["wallet_or_signer_required"] is False
assert entry["wc_supply_unlimited_uncapped"] is True
assert entry["wc_supply_lifetime_cap_declared"] is False
assert entry["marker"] == marker

card = json.loads(Path(f"public/public-node/work-credits/{brick}.json").read_text())
assert card["schema"] == "void.public_node.work_credits.available_work_public_html_card_runtime_visibility.v1"
assert card["id"] == brick
assert card["status"] == "hold"
assert card["marker"] == marker
assert card["runtime_visibility_hold_only"] is True
assert card["source_html_path"] == source_html
assert card["source_json_path"] == source_json

visibility = card["visibility_policy"]
assert visibility["static_html_file_required"] is True
assert visibility["runtime_server_required_for_green"] is False
assert visibility["local_runtime_fetch_optional"] is True
assert visibility["local_runtime_not_seen_static_html_remains_green"] is True
assert visibility["runtime_mutation_route_added"] is False
assert visibility["runtime_mutation_route_enabled"] is False
assert visibility["mutation_handler_enabled"] is False

policy = card["work_credits_policy"]
assert policy["wc_supply_unlimited_uncapped"] is True
assert policy["wc_supply_lifetime_cap_declared"] is False
assert policy["available_work_is_informational_only"] is True
assert policy["public_submission_enabled"] is False
assert policy["wc_issuance_enabled"] is False
assert policy["wc_ledger_write_enabled"] is False

state = card["visibility_state"]
for key in [
    "public_submission_enabled",
    "wc_issuance_enabled",
    "wc_ledger_write_enabled",
    "void_transfer_enabled",
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
    "public_mutation_enabled",
    "runtime_route_enabled",
    "wallet_or_signer_required",
]:
    assert safety[key] is False, key

print("available_work_public_html_card_runtime_visibility_binding_green=true")
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
  grep -F "VOID_DATANET_WC_AVAILABLE_WORK_PUBLIC_HTML_CARD_HOLD_V1" "$OUT" >/dev/null
  grep -F "Work Credits remain unlimited and uncapped" "$OUT" >/dev/null
  echo "runtime_fetch_optional_available=true"
else
  echo "runtime_fetch_optional_available=false"
  echo "runtime_fetch_optional_rc=$FETCH_RC"
fi
echo "runtime_fetch_optional_green=true"

echo "== HTML static safety =="
grep -RInE '<script|<form|method=|onclick=|fetch\(|XMLHttpRequest|private key|seed phrase|secret=|transaction hash: 0x|0x[a-fA-F0-9]{64}' "$SOURCE_HTML" \
  && { echo "html_static_safety_green=false"; exit 1; } \
  || echo "html_static_safety_green=true"

echo "== marker presence =="
grep -R "$MARKER" "$INDEX" "$CARD" "$DOC" "$PROOF" >/dev/null
echo "marker_green=true"

echo "== forbidden enablement scan =="
python3 - <<'PY'
from pathlib import Path

paths = [
    Path("public/public-node/work-credits/index.json"),
    Path("public/public-node/work-credits/datanet-wc-available-work-public-html-card-runtime-visibility-hold-v1.json"),
    Path("docs/public-node/work-credits/datanet-wc-available-work-public-html-card-runtime-visibility-hold-v1.md"),
]

bad = [
    '"wc_supply_lifetime_cap_declared": true',
    '"public_submission_enabled": true',
    '"wc_issuance_enabled": true',
    '"wc_ledger_write_enabled": true',
    '"void_transfer_enabled": true',
    '"wallet_or_signer_required": true',
    '"runtime_mutation_route_added": true',
    '"runtime_mutation_route_enabled": true',
    '"mutation_handler_enabled": true',
    '"public_mutation_enabled": true',
    '"runtime_route_enabled": true',
    '"contains_private_operator_material": true',
    '"contains_wallet_material": true',
    '"contains_secret_material": true',
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
echo "VOID_DATANET_WC_AVAILABLE_WORK_PUBLIC_HTML_CARD_RUNTIME_VISIBILITY_HOLD_V1_GREEN"
