#!/usr/bin/env bash
set -euo pipefail

BRICK="datanet-wc-available-work-public-reviewer-final-seal-hold-v1"
MARKER="VOID_DATANET_WC_AVAILABLE_WORK_PUBLIC_REVIEWER_FINAL_SEAL_HOLD_V1"

INDEX="public/public-node/work-credits/index.json"
CARD="public/public-node/work-credits/${BRICK}.json"
DOC="docs/public-node/work-credits/${BRICK}.md"
PROOF="ops/mainnet0/void-${BRICK}-proof.sh"

SOURCE_HTML="public/public-node/work-credits/datanet-wc-available-work-public-html-card-hold-v1.html"
SOURCE_VISIBILITY="public/public-node/work-credits/datanet-wc-available-work-public-html-card-runtime-visibility-hold-v1.json"

echo "== JSON parse =="
python3 -m json.tool "$INDEX" >/dev/null
python3 -m json.tool "$CARD" >/dev/null
python3 -m json.tool "$SOURCE_VISIBILITY" >/dev/null
echo "json_green=true"

echo "== source presence =="
test -f "$SOURCE_HTML"
test -f "$SOURCE_VISIBILITY"
echo "source_files_green=true"

echo "== binding =="
python3 - <<'PY'
import json
from pathlib import Path

brick = "datanet-wc-available-work-public-reviewer-final-seal-hold-v1"
marker = "VOID_DATANET_WC_AVAILABLE_WORK_PUBLIC_REVIEWER_FINAL_SEAL_HOLD_V1"

source_html = "/public-node/work-credits/datanet-wc-available-work-public-html-card-hold-v1.html"
source_visibility = "/public-node/work-credits/datanet-wc-available-work-public-html-card-runtime-visibility-hold-v1.json"

index = json.loads(Path("public/public-node/work-credits/index.json").read_text())
entries = {e["id"]: e for e in index["entries"]}
assert brick in entries

entry = entries[brick]
assert entry["status"] == "hold"
assert entry["path"] == f"/public-node/work-credits/{brick}.json"
assert entry["json"] == f"{brick}.json"
assert entry["lane"] == "work_credits"
assert entry["scope"] == "datanet_wc_available_work_public_reviewer_final_seal"
assert entry["public_reviewer_final_seal_only"] is True
assert entry["available_work_visibility_status"] == "closed_hold"
assert entry["source_html_path"] == source_html
assert entry["source_runtime_visibility_path"] == source_visibility
assert entry["wc_supply_unlimited_uncapped"] is True
assert entry["wc_supply_lifetime_cap_declared"] is False
assert entry["available_work_is_informational_only"] is True
assert entry["public_submission_enabled"] is False
assert entry["wc_issuance_enabled"] is False
assert entry["wc_ledger_write_enabled"] is False
assert entry["void_transfer_enabled"] is False
assert entry["wallet_or_signer_required"] is False
assert entry["runtime_mutation_route_enabled"] is False
assert entry["mutation_handler_enabled"] is False
assert entry["marker"] == marker

card = json.loads(Path(f"public/public-node/work-credits/{brick}.json").read_text())
assert card["schema"] == "void.public_node.work_credits.available_work_public_reviewer_final_seal.v1"
assert card["id"] == brick
assert card["status"] == "hold"
assert card["marker"] == marker
assert card["public_reviewer_final_seal_only"] is True
assert card["available_work_visibility_status"] == "closed_hold"

sources = card["sources"]
assert sources["available_work_html_card"] == source_html
assert sources["available_work_runtime_visibility"] == source_visibility

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
    "runtime_route_enabled",
    "runtime_mutation_route_enabled",
    "mutation_handler_enabled",
    "wallet_or_signer_required",
]:
    assert safety[key] is False, key

print("available_work_public_reviewer_final_seal_binding_green=true")
PY

echo "== marker presence =="
grep -R "$MARKER" "$INDEX" "$CARD" "$DOC" "$PROOF" >/dev/null
echo "marker_green=true"

echo "== forbidden enablement scan =="
python3 - <<'PY'
from pathlib import Path

paths = [
    Path("public/public-node/work-credits/index.json"),
    Path("public/public-node/work-credits/datanet-wc-available-work-public-reviewer-final-seal-hold-v1.json"),
    Path("docs/public-node/work-credits/datanet-wc-available-work-public-reviewer-final-seal-hold-v1.md"),
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
    '"runtime_route_enabled": true',
    '"contains_private_operator_material": true',
    '"contains_wallet_material": true',
    '"contains_secret_material": true',
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
echo "VOID_DATANET_WC_AVAILABLE_WORK_PUBLIC_REVIEWER_FINAL_SEAL_HOLD_V1_GREEN"
