#!/usr/bin/env bash
set -euo pipefail

BRICK="datanet-wc-available-work-public-html-card-hold-v1"
MARKER="VOID_DATANET_WC_AVAILABLE_WORK_PUBLIC_HTML_CARD_HOLD_V1"

INDEX="public/public-node/work-credits/index.json"
CARD="public/public-node/work-credits/${BRICK}.json"
HTML="public/public-node/work-credits/${BRICK}.html"
DOC="docs/public-node/work-credits/${BRICK}.md"
PROOF="ops/mainnet0/void-${BRICK}-proof.sh"

SOURCE_ROLLUP="public/public-node/work-credits/datanet-wc-public-earn-readiness-summary-hold-v1.json"
SOURCE_TEMPLATE="public/public-node/work-credits/datanet-wc-available-work-packet-template-hold-v1.json"
SOURCE_EXAMPLE="public/public-node/work-credits/datanet-wc-available-work-packet-example-hold-v1.json"

echo "== JSON parse =="
python3 -m json.tool "$INDEX" >/dev/null
python3 -m json.tool "$CARD" >/dev/null
python3 -m json.tool "$SOURCE_ROLLUP" >/dev/null
python3 -m json.tool "$SOURCE_TEMPLATE" >/dev/null
python3 -m json.tool "$SOURCE_EXAMPLE" >/dev/null
echo "json_green=true"

echo "== file presence =="
test -f "$HTML"
test -f "$DOC"
echo "files_green=true"

echo "== binding =="
python3 - <<'PY'
import json
from pathlib import Path

brick = "datanet-wc-available-work-public-html-card-hold-v1"
marker = "VOID_DATANET_WC_AVAILABLE_WORK_PUBLIC_HTML_CARD_HOLD_V1"

source_rollup = "/public-node/work-credits/datanet-wc-public-earn-readiness-summary-hold-v1.json"
source_template = "/public-node/work-credits/datanet-wc-available-work-packet-template-hold-v1.json"
source_example = "/public-node/work-credits/datanet-wc-available-work-packet-example-hold-v1.json"

index = json.loads(Path("public/public-node/work-credits/index.json").read_text())
entries = {e["id"]: e for e in index["entries"]}
assert brick in entries

entry = entries[brick]
assert entry["status"] == "hold"
assert entry["path"] == f"/public-node/work-credits/{brick}.html"
assert entry["json"] == f"{brick}.json"
assert entry["html"] == f"{brick}.html"
assert entry["lane"] == "work_credits"
assert entry["scope"] == "datanet_wc_available_work_public_html_card"
assert entry["html_card_only"] is True
assert entry["available_work_visibility_only"] is True
assert entry["public_submission_enabled"] is False
assert entry["wc_issuance_enabled"] is False
assert entry["wc_ledger_write_enabled"] is False
assert entry["void_transfer_enabled"] is False
assert entry["wallet_or_signer_required"] is False
assert entry["runtime_mutation_route_enabled"] is False
assert entry["mutation_handler_enabled"] is False
assert entry["wc_supply_unlimited_uncapped"] is True
assert entry["wc_supply_lifetime_cap_declared"] is False
assert entry["marker"] == marker

card = json.loads(Path(f"public/public-node/work-credits/{brick}.json").read_text())
assert card["schema"] == "void.public_node.work_credits.available_work_public_html_card.v1"
assert card["id"] == brick
assert card["status"] == "hold"
assert card["marker"] == marker
assert card["html_card_only"] is True
assert card["html_path"] == f"/public-node/work-credits/{brick}.html"

sources = card["sources"]
assert sources["earn_readiness_summary"] == source_rollup
assert sources["available_work_template"] == source_template
assert sources["available_work_example"] == source_example

policy = card["work_credits_policy"]
assert policy["wc_supply_unlimited_uncapped"] is True
assert policy["wc_supply_lifetime_cap_declared"] is False
assert policy["available_work_is_informational_only"] is True
assert policy["public_submission_enabled"] is False
assert policy["wc_issuance_enabled"] is False
assert policy["wc_ledger_write_enabled"] is False

safety = card["public_safety"]
for key in [
    "contains_private_operator_material",
    "contains_wallet_material",
    "contains_secret_material",
    "public_mutation_enabled",
    "runtime_mutation_route_enabled",
    "mutation_handler_enabled",
    "wallet_or_signer_required",
]:
    assert safety[key] is False, key

print("available_work_public_html_card_binding_green=true")
PY

echo "== HTML static safety =="
grep -F "$MARKER" "$HTML" >/dev/null
grep -F "Work Credits remain unlimited and uncapped" "$HTML" >/dev/null
grep -F "No public submission endpoint is enabled." "$HTML" >/dev/null
grep -F "No WC issuance is enabled or performed." "$HTML" >/dev/null
grep -F "No runtime mutation route or mutation handler is enabled." "$HTML" >/dev/null
grep -RInE '<script|<form|method=|onclick=|fetch\(|XMLHttpRequest|private key|seed phrase|secret=|transaction hash: 0x|0x[a-fA-F0-9]{64}' "$HTML" \
  && { echo "html_static_safety_green=false"; exit 1; } \
  || echo "html_static_safety_green=true"

echo "== marker presence =="
grep -R "$MARKER" "$INDEX" "$CARD" "$HTML" "$DOC" "$PROOF" >/dev/null
echo "marker_green=true"

echo "== forbidden enablement scan =="
python3 - <<'PY'
from pathlib import Path

paths = [
    Path("public/public-node/work-credits/index.json"),
    Path("public/public-node/work-credits/datanet-wc-available-work-public-html-card-hold-v1.json"),
    Path("public/public-node/work-credits/datanet-wc-available-work-public-html-card-hold-v1.html"),
    Path("docs/public-node/work-credits/datanet-wc-available-work-public-html-card-hold-v1.md"),
]

bad = [
    '"wc_supply_lifetime_cap_declared": true',
    '"public_submission_enabled": true',
    '"wc_issuance_enabled": true',
    '"wc_ledger_write_enabled": true',
    '"void_transfer_enabled": true',
    '"wallet_or_signer_required": true',
    '"runtime_mutation_route_enabled": true',
    '"mutation_handler_enabled": true',
    '"public_mutation_enabled": true',
    '"contains_private_operator_material": true',
    '"contains_wallet_material": true',
    '"contains_secret_material": true',
    "live submission",
    "live WC issuance",
    "automatic payout",
    "transaction hash: 0x",
]

hits = []
for path in paths:
    text = path.read_text()
    lower = text.lower()
    for needle in bad:
        if needle.startswith('"'):
            if needle in text:
                hits.append(f"{path}:{needle}")
        else:
            if needle.lower() in lower:
                hits.append(f"{path}:{needle}")

if hits:
    print("\n".join(hits))
    raise SystemExit("forbidden_enablement_scan_green=false")

print("forbidden_enablement_scan_green=true")
PY

echo "== result =="
echo "VOID_DATANET_WC_AVAILABLE_WORK_PUBLIC_HTML_CARD_HOLD_V1_GREEN"
