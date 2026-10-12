#!/usr/bin/env bash
set -euo pipefail

BRICK="datanet-public-discovery-onboarding-card-hold-v1"
MARKER="VOID_DATANET_PUBLIC_DISCOVERY_ONBOARDING_CARD_HOLD_V1"

INDEX="public/public-node/datanet/index.json"
CARD="public/public-node/datanet/${BRICK}.json"
HTML="public/public-node/datanet/${BRICK}.html"
DOC="docs/public-node/datanet/${BRICK}.md"
PROOF="ops/mainnet0/void-${BRICK}-proof.sh"

DEMO="public/demo/datanet/index.html"
WC_AVAILABLE="public/public-node/work-credits/datanet-wc-available-work-public-html-card-hold-v1.html"

echo "== JSON parse =="
python3 -m json.tool "$INDEX" >/dev/null
python3 -m json.tool "$CARD" >/dev/null
echo "json_green=true"

echo "== file presence =="
test -f "$HTML"
test -f "$DOC"
test -f "$DEMO"
test -f "$WC_AVAILABLE"
echo "files_green=true"

echo "== binding =="
python3 - <<'PY'
import json
from pathlib import Path

brick = "datanet-public-discovery-onboarding-card-hold-v1"
marker = "VOID_DATANET_PUBLIC_DISCOVERY_ONBOARDING_CARD_HOLD_V1"

index = json.loads(Path("public/public-node/datanet/index.json").read_text())
assert index["schema"] == "void.public_node.datanet.index.v1"
assert index["status"] == "hold"
assert index["marker"] == marker
entries = {e["id"]: e for e in index["entries"]}
assert brick in entries

entry = entries[brick]
assert entry["status"] == "hold"
assert entry["path"] == f"/public-node/datanet/{brick}.html"
assert entry["json"] == f"{brick}.json"
assert entry["html"] == f"{brick}.html"
assert entry["scope"] == "datanet_public_discovery_onboarding"
assert entry["static_discovery_only"] is True
assert entry["public_intake_enabled"] is False
assert entry["upload_enabled"] is False
assert entry["mirror_command_enabled"] is False
assert entry["peer_pin_command_enabled"] is False
assert entry["wc_claim_enabled"] is False
assert entry["runtime_mutation_route_enabled"] is False
assert entry["mutation_handler_enabled"] is False
assert entry["marker"] == marker

card = json.loads(Path(f"public/public-node/datanet/{brick}.json").read_text())
assert card["schema"] == "void.public_node.datanet.public_discovery_onboarding_card.v1"
assert card["id"] == brick
assert card["status"] == "hold"
assert card["marker"] == marker
assert card["scope"] == "datanet_public_discovery_onboarding"
assert card["html_path"] == f"/public-node/datanet/{brick}.html"
assert card["index_path"] == "/public-node/datanet/index.json"

state = card["discovery_state"]
assert state["static_discovery_only"] is True
assert state["public_node_datanet_index_created"] is True
assert state["browser_visible_html_card_created"] is True

for key in [
    "public_intake_enabled",
    "upload_enabled",
    "object_write_enabled",
    "mirror_command_enabled",
    "peer_pin_command_enabled",
    "wc_claim_enabled",
    "wc_issuance_enabled",
    "wallet_or_signer_required",
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

print("datanet_public_discovery_onboarding_binding_green=true")
PY

echo "== HTML static safety =="
grep -F "$MARKER" "$HTML" >/dev/null
grep -F "STATUS: HOLD / READ-ONLY DISCOVERY" "$HTML" >/dev/null
grep -F "No public intake endpoint is enabled." "$HTML" >/dev/null
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
    Path("public/public-node/datanet/index.json"),
    Path("public/public-node/datanet/datanet-public-discovery-onboarding-card-hold-v1.json"),
    Path("public/public-node/datanet/datanet-public-discovery-onboarding-card-hold-v1.html"),
    Path("docs/public-node/datanet/datanet-public-discovery-onboarding-card-hold-v1.md"),
]

bad = [
    '"public_intake_enabled": true',
    '"upload_enabled": true',
    '"object_write_enabled": true',
    '"mirror_command_enabled": true',
    '"peer_pin_command_enabled": true',
    '"wc_claim_enabled": true',
    '"wc_issuance_enabled": true',
    '"wallet_or_signer_required": true',
    '"runtime_mutation_route_enabled": true',
    '"mutation_handler_enabled": true',
    '"public_mutation_enabled": true',
    '"runtime_route_enabled": true',
    '"contains_private_operator_material": true',
    '"contains_wallet_material": true',
    '"contains_secret_material": true',
    "live upload",
    "live intake",
    "submit claim",
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
        elif needle.lower() in lower:
            hits.append(f"{path}:{needle}")

if hits:
    print("\n".join(hits))
    raise SystemExit("forbidden_enablement_scan_green=false")

print("forbidden_enablement_scan_green=true")
PY

echo "== result =="
echo "VOID_DATANET_PUBLIC_DISCOVERY_ONBOARDING_CARD_HOLD_V1_GREEN"
