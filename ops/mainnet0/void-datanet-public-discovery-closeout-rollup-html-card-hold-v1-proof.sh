#!/usr/bin/env bash
set -euo pipefail

BRICK="datanet-public-discovery-closeout-rollup-html-card-hold-v1"
MARKER="VOID_DATANET_PUBLIC_DISCOVERY_CLOSEOUT_ROLLUP_HTML_CARD_HOLD_V1"

INDEX="public/public-node/datanet/index.json"
META="public/public-node/datanet/${BRICK}.json"
HTML="public/public-node/datanet/${BRICK}.html"
DOC="docs/public-node/datanet/${BRICK}.md"
PROOF="ops/mainnet0/void-${BRICK}-proof.sh"

ROLLUP="public/public-node/datanet/datanet-public-discovery-closeout-rollup-hold-v1.json"
ROOT="public/public-node/index.json"

echo "== JSON parse =="
python3 -m json.tool "$INDEX" >/dev/null
python3 -m json.tool "$META" >/dev/null
python3 -m json.tool "$ROLLUP" >/dev/null
python3 -m json.tool "$ROOT" >/dev/null
echo "json_green=true"

echo "== file presence =="
test -f "$HTML"
test -f "$DOC"
test -f "$PROOF"
test -f "$ROLLUP"
echo "files_green=true"

echo "== HTML static safety =="
grep -F "$MARKER" "$HTML" >/dev/null
grep -F "STATUS: HOLD / REVIEWER-FACING / READ-ONLY" "$HTML" >/dev/null
grep -F "No public intake endpoint is enabled." "$HTML" >/dev/null
grep -F "No runtime mutation route or mutation handler is enabled." "$HTML" >/dev/null
grep -RInE '<script|<form|method=|onclick=|fetch\(|XMLHttpRequest|private key|seed phrase|secret=|transaction hash: 0x|0x[a-fA-F0-9]{64}' "$HTML" \
  && { echo "html_static_safety_green=false"; exit 1; } \
  || echo "html_static_safety_green=true"

echo "== HTML card binding =="
python3 - <<'PY'
import json
from pathlib import Path

brick = "datanet-public-discovery-closeout-rollup-html-card-hold-v1"
marker = "VOID_DATANET_PUBLIC_DISCOVERY_CLOSEOUT_ROLLUP_HTML_CARD_HOLD_V1"

idx = json.loads(Path("public/public-node/datanet/index.json").read_text())
meta = json.loads(Path(f"public/public-node/datanet/{brick}.json").read_text())
html = Path(f"public/public-node/datanet/{brick}.html").read_text()
rollup = json.loads(Path("public/public-node/datanet/datanet-public-discovery-closeout-rollup-hold-v1.json").read_text())

entries = {e["id"]: e for e in idx.get("entries", [])}
assert brick in entries
entry = entries[brick]

assert entry["status"] == "hold"
assert entry["path"] == f"/public-node/datanet/{brick}.html"
assert entry["json"] == f"{brick}.json"
assert entry["html"] == f"{brick}.html"
assert entry["scope"] == "datanet_public_discovery_closeout_rollup_html_card"
assert entry["browser_visible_closeout_rollup_card"] is True
assert entry["closeout_rollup_json_required"] is True
assert entry["public_safe"] is True
assert entry["read_only"] is True
assert entry["discovery_only"] is True
assert entry["runtime_fetch_required"] is False
assert entry["runtime_fetch_optional"] is True
assert entry["marker"] == marker

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
    assert entry[key] is False, key

assert meta["schema"] == "void.public_node.datanet.public_discovery_closeout_rollup_html_card.v1"
assert meta["id"] == brick
assert meta["status"] == "hold"
assert meta["marker"] == marker
assert meta["html_path"] == f"/public-node/datanet/{brick}.html"
assert meta["closeout_rollup_json"] == "/public-node/datanet/datanet-public-discovery-closeout-rollup-hold-v1.json"

links = meta["linked_surfaces"]
assert links["root_public_node_index"] == "/public-node/index.json"
assert links["datanet_public_node_index"] == "/public-node/datanet/index.json"
assert links["onboarding_card_html"].endswith("datanet-public-discovery-onboarding-card-hold-v1.html")
assert links["final_seal_html_card"].endswith("datanet-public-discovery-final-seal-html-card-hold-v1.html")
assert links["final_seal_html_runtime_visibility"].endswith("datanet-public-discovery-final-seal-html-card-runtime-visibility-hold-v1.json")
assert links["closeout_rollup_json"].endswith("datanet-public-discovery-closeout-rollup-hold-v1.json")

state = meta["visibility_state"]
for key in [
    "browser_visible_html_card_created",
    "closeout_rollup_json_present",
    "root_public_node_link_present",
    "datanet_index_present",
    "runtime_fetch_optional",
]:
    assert state[key] is True, key

assert state["runtime_fetch_required"] is False

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

for key, value in meta["public_safety"].items():
    assert value is False, key

assert rollup["status"] == "hold"
assert rollup["marker"] == "VOID_DATANET_PUBLIC_DISCOVERY_CLOSEOUT_ROLLUP_HOLD_V1"
assert len(rollup.get("sealed_entries", [])) == 6

for expected in [
    "VOID DataNet Public Discovery Closeout Rollup",
    "STATUS: HOLD / REVIEWER-FACING / READ-ONLY",
    "/public-node/index.json",
    "/public-node/datanet/index.json",
    "/public-node/datanet/datanet-public-discovery-closeout-rollup-hold-v1.json",
    "No public intake endpoint is enabled.",
    "No runtime mutation route or mutation handler is enabled.",
]:
    assert expected in html, expected

print("datanet_public_discovery_closeout_rollup_html_card_binding_green=true")
PY

echo "== component proof stack =="
bash ops/mainnet0/void-datanet-public-discovery-closeout-rollup-hold-v1-proof.sh >/tmp/void-datanet-closeout-rollup-html-card-rollup-proof.log
grep -F "VOID_DATANET_PUBLIC_DISCOVERY_CLOSEOUT_ROLLUP_HOLD_V1_GREEN" /tmp/void-datanet-closeout-rollup-html-card-rollup-proof.log >/dev/null
echo "component_proof_stack_green=true"

echo "== marker presence =="
grep -R "$MARKER" "$INDEX" "$META" "$HTML" "$DOC" "$PROOF" >/dev/null
echo "marker_green=true"

echo "== forbidden enablement scan =="
python3 - <<'PY'
from pathlib import Path

paths = [
    Path("public/public-node/datanet/index.json"),
    Path("public/public-node/datanet/datanet-public-discovery-closeout-rollup-html-card-hold-v1.json"),
    Path("public/public-node/datanet/datanet-public-discovery-closeout-rollup-html-card-hold-v1.html"),
    Path("docs/public-node/datanet/datanet-public-discovery-closeout-rollup-html-card-hold-v1.md"),
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
echo "VOID_DATANET_PUBLIC_DISCOVERY_CLOSEOUT_ROLLUP_HTML_CARD_HOLD_V1_GREEN"
