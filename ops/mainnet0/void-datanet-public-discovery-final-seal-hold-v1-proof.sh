#!/usr/bin/env bash
set -euo pipefail

BRICK="datanet-public-discovery-final-seal-hold-v1"
MARKER="VOID_DATANET_PUBLIC_DISCOVERY_FINAL_SEAL_HOLD_V1"

ROOT="public/public-node/index.json"
INDEX="public/public-node/datanet/index.json"
SEAL="public/public-node/datanet/${BRICK}.json"
DOC="docs/public-node/datanet/${BRICK}.md"
PROOF="ops/mainnet0/void-${BRICK}-proof.sh"

CARD_HTML="public/public-node/datanet/datanet-public-discovery-onboarding-card-hold-v1.html"
CARD_JSON="public/public-node/datanet/datanet-public-discovery-onboarding-card-hold-v1.json"
RUNTIME_JSON="public/public-node/datanet/datanet-public-discovery-onboarding-runtime-visibility-hold-v1.json"

echo "== JSON parse =="
python3 -m json.tool "$ROOT" >/dev/null
python3 -m json.tool "$INDEX" >/dev/null
python3 -m json.tool "$SEAL" >/dev/null
python3 -m json.tool "$CARD_JSON" >/dev/null
python3 -m json.tool "$RUNTIME_JSON" >/dev/null
echo "json_green=true"

echo "== file presence =="
test -f "$CARD_HTML"
test -f "$CARD_JSON"
test -f "$RUNTIME_JSON"
test -f "$DOC"
test -f "$PROOF"
echo "files_green=true"

echo "== final seal binding =="
python3 - <<'PY'
import json
from pathlib import Path

brick = "datanet-public-discovery-final-seal-hold-v1"
marker = "VOID_DATANET_PUBLIC_DISCOVERY_FINAL_SEAL_HOLD_V1"

root = json.loads(Path("public/public-node/index.json").read_text())
didx = json.loads(Path("public/public-node/datanet/index.json").read_text())
seal = json.loads(Path(f"public/public-node/datanet/{brick}.json").read_text())

root_routes = [r for r in root.get("routes", []) if r.get("route") == "/public-node/datanet/index.json"]
assert len(root_routes) == 1
root_route = root_routes[0]
assert root_route["public_safe"] is True
assert root_route["read_only"] is True
assert root_route["discovery_only"] is True
assert root_route["runtime_mutation_route_enabled"] is False
assert root_route["mutation_handler_enabled"] is False

assert didx["schema"] == "void.public_node.datanet.index.v1"
assert didx["status"] == "hold"
entries = {e["id"]: e for e in didx.get("entries", [])}
for required in [
    "datanet-public-discovery-onboarding-card-hold-v1",
    "datanet-public-discovery-onboarding-runtime-visibility-hold-v1",
    brick,
]:
    assert required in entries, required

entry = entries[brick]
assert entry["status"] == "hold"
assert entry["path"] == f"/public-node/datanet/{brick}.json"
assert entry["scope"] == "datanet_public_discovery_final_seal"
assert entry["final_seal_hold_only"] is True
assert entry["public_safe"] is True
assert entry["read_only"] is True
assert entry["discovery_only"] is True
assert entry["root_public_node_link_required"] is True
assert entry["onboarding_card_required"] is True
assert entry["runtime_visibility_required"] is True
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

assert seal["schema"] == "void.public_node.datanet.public_discovery_final_seal.v1"
assert seal["id"] == brick
assert seal["status"] == "hold"
assert seal["marker"] == marker

components = seal["sealed_components"]
assert components["root_public_node_index"] == "/public-node/index.json"
assert components["datanet_public_node_index"] == "/public-node/datanet/index.json"
assert components["onboarding_card_html"].endswith("datanet-public-discovery-onboarding-card-hold-v1.html")
assert components["onboarding_card_json"].endswith("datanet-public-discovery-onboarding-card-hold-v1.json")
assert components["runtime_visibility_json"].endswith("datanet-public-discovery-onboarding-runtime-visibility-hold-v1.json")

state = seal["seal_state"]
for key in [
    "root_public_node_link_present",
    "datanet_index_present",
    "onboarding_card_present",
    "runtime_visibility_present",
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

for key, value in seal["public_safety"].items():
    assert value is False, key

print("datanet_public_discovery_final_seal_binding_green=true")
PY

echo "== component proof stack =="
bash ops/mainnet0/void-datanet-public-discovery-onboarding-card-hold-v1-proof.sh >/tmp/void-datanet-final-seal-card-proof.log
bash ops/mainnet0/void-datanet-public-discovery-onboarding-runtime-visibility-hold-v1-proof.sh >/tmp/void-datanet-final-seal-runtime-proof.log
bash ops/mainnet0/void-root-public-node-datanet-discovery-index-link-hold-v1-proof.sh >/tmp/void-datanet-final-seal-root-link-proof.log
grep -F "VOID_DATANET_PUBLIC_DISCOVERY_ONBOARDING_CARD_HOLD_V1_GREEN" /tmp/void-datanet-final-seal-card-proof.log >/dev/null
grep -F "VOID_DATANET_PUBLIC_DISCOVERY_ONBOARDING_RUNTIME_VISIBILITY_HOLD_V1_GREEN" /tmp/void-datanet-final-seal-runtime-proof.log >/dev/null
grep -F "VOID_ROOT_PUBLIC_NODE_DATANET_DISCOVERY_INDEX_LINK_HOLD_V1_GREEN" /tmp/void-datanet-final-seal-root-link-proof.log >/dev/null
echo "component_proof_stack_green=true"

echo "== marker presence =="
grep -R "$MARKER" "$INDEX" "$SEAL" "$DOC" "$PROOF" >/dev/null
echo "marker_green=true"

echo "== forbidden enablement scan =="
python3 - <<'PY'
from pathlib import Path

paths = [
    Path("public/public-node/datanet/index.json"),
    Path("public/public-node/datanet/datanet-public-discovery-final-seal-hold-v1.json"),
    Path("docs/public-node/datanet/datanet-public-discovery-final-seal-hold-v1.md"),
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
echo "VOID_DATANET_PUBLIC_DISCOVERY_FINAL_SEAL_HOLD_V1_GREEN"
