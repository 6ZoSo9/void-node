#!/usr/bin/env bash
set -euo pipefail

BRICK="datanet-wc-availability-public-earn-status-index-apply-hold-v1"
MARKER="VOID_DATANET_WC_AVAILABILITY_PUBLIC_EARN_STATUS_INDEX_APPLY_HOLD_V1"

INDEX="public/public-node/work-credits/index.json"
CARD="public/public-node/work-credits/${BRICK}.json"
EXISTING="public/public-node/work-credits/datanet-wc-availability/earn-status-card-v1.json"
DOC="docs/public-node/work-credits/${BRICK}.md"
PROOF="ops/mainnet0/void-datanet-wc-availability-public-earn-status-index-apply-hold-v1-proof.sh"

echo "== JSON parse =="
python3 -m json.tool "$INDEX" >/dev/null
python3 -m json.tool "$CARD" >/dev/null
python3 -m json.tool "$EXISTING" >/dev/null
echo "json_green=true"

echo "== index binding =="
python3 - <<'PY'
import json
from pathlib import Path

index = json.loads(Path("public/public-node/work-credits/index.json").read_text())
marker = "VOID_DATANET_WC_AVAILABILITY_PUBLIC_EARN_STATUS_INDEX_APPLY_HOLD_V1"

assert index["schema"] == "void.public_node.work_credits.index.v1"
assert index["status"] == "hold"
assert index["marker"] == marker
assert index["public_boundary"]["public_index_created"] is True
assert index["public_boundary"]["public_discovery_only"] is True
assert index["public_boundary"]["read_only"] is True

for key in [
    "live_earn_enabled",
    "wc_issuance_enabled",
    "wc_ledger_write_enabled",
    "void_allocation_enabled",
    "usdc_autofulfillment_enabled",
    "wallet_or_signer_required",
    "runtime_mutation_route_enabled",
]:
    assert index["public_boundary"][key] is False, key

entries = {entry["id"]: entry for entry in index["entries"]}
assert "datanet-wc-availability" in entries
assert "datanet-wc-availability-public-earn-status-index-apply-hold-v1" in entries

availability = entries["datanet-wc-availability"]
assert availability["path"] == "/public-node/work-credits/datanet-wc-availability/earn-status-card-v1.json"
assert availability["live_earn_enabled"] is False
assert availability["wc_issuance_enabled"] is False
assert availability["wc_ledger_write_enabled"] is False
assert availability["void_allocation_enabled"] is False
assert availability["marker"] == marker

seal = entries["datanet-wc-availability-public-earn-status-index-apply-hold-v1"]
assert seal["path"] == "/public-node/work-credits/datanet-wc-availability-public-earn-status-index-apply-hold-v1.json"
assert seal["live_earn_enabled"] is False
assert seal["wc_issuance_enabled"] is False
assert seal["wc_ledger_write_enabled"] is False
assert seal["void_allocation_enabled"] is False
assert seal["marker"] == marker

print("index_binding_green=true")
PY

echo "== status card binding =="
python3 - <<'PY'
import json
from pathlib import Path

card = json.loads(Path("public/public-node/work-credits/datanet-wc-availability-public-earn-status-index-apply-hold-v1.json").read_text())
marker = "VOID_DATANET_WC_AVAILABILITY_PUBLIC_EARN_STATUS_INDEX_APPLY_HOLD_V1"

assert card["status"] == "hold"
assert card["marker"] == marker
assert card["public_boundary"]["public_index_created"] is True
assert card["public_boundary"]["public_discovery_only"] is True
assert card["public_boundary"]["read_only"] is True

for key in [
    "live_earn_enabled",
    "wc_issuance_enabled",
    "wc_ledger_write_enabled",
    "wc_ledger_append_enabled",
    "void_allocation_enabled",
    "void_transfer_enabled",
    "usdc_payment_handling_enabled",
    "usdc_autofulfillment_enabled",
    "wallet_access_enabled",
    "signer_access_enabled",
    "runtime_mutation_route_enabled",
    "operator_execution_enabled",
]:
    assert card["public_boundary"][key] is False, key

print("status_card_binding_green=true")
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
    Path("public/public-node/work-credits/datanet-wc-availability-public-earn-status-index-apply-hold-v1.json"),
    Path("docs/public-node/work-credits/datanet-wc-availability-public-earn-status-index-apply-hold-v1.md"),
]

bad_phrases = [
    "live earning is enabled",
    "earning is live",
    "wc issuance enabled",
    "ledger write enabled",
    "void allocation enabled",
    "usdc autofulfillment enabled",
    "wallet access enabled",
    "signer access enabled",
    "operator execution enabled",
]

for path in files:
    text = path.read_text().lower()
    for phrase in bad_phrases:
        assert phrase not in text, f"{phrase} found in {path}"

print("forbidden_enablement_scan_green=true")
PY

echo "== result =="
echo "${MARKER}_GREEN"
