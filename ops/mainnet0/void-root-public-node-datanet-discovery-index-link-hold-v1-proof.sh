#!/usr/bin/env bash
set -euo pipefail

BRICK="root-public-node-datanet-discovery-index-link-hold-v1"
MARKER="VOID_ROOT_PUBLIC_NODE_DATANET_DISCOVERY_INDEX_LINK_HOLD_V1"

ROOT="public/public-node/index.json"
DATANET_INDEX="public/public-node/datanet/index.json"
DOC="docs/public-node/datanet/${BRICK}.md"
PROOF="ops/mainnet0/void-${BRICK}-proof.sh"

echo "== JSON parse =="
python3 -m json.tool "$ROOT" >/dev/null
python3 -m json.tool "$DATANET_INDEX" >/dev/null
echo "json_green=true"

echo "== file presence =="
test -f "$DOC"
test -f "$PROOF"
echo "files_green=true"

echo "== root DataNet route binding =="
python3 - <<'PY'
import json
from pathlib import Path

marker = "VOID_ROOT_PUBLIC_NODE_DATANET_DISCOVERY_INDEX_LINK_HOLD_V1"
route_path = "/public-node/datanet/index.json"

root = json.loads(Path("public/public-node/index.json").read_text())
assert root["kind"] == "public_node_index"
assert root["marker"] == "VOID_PUBLIC_NODE_INDEX_V1"
assert root["public_safe"] is True
assert root["read_only"] is True

routes = root.get("routes", [])
matches = [r for r in routes if r.get("route") == route_path]
assert len(matches) == 1, f"expected one DataNet route, found {len(matches)}"
route = matches[0]

assert route["kind"] == "public_node_section_index"
assert route["label"] == "DataNet public discovery"
assert route["method"] == "GET"
assert route["status"] == "hold"
assert route["public_safe"] is True
assert route["read_only"] is True
assert route["discovery_only"] is True
assert route["static_index_only"] is True
assert route["marker"] == marker

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
    assert route[key] is False, key

datanet = json.loads(Path("public/public-node/datanet/index.json").read_text())
assert datanet["schema"] == "void.public_node.datanet.index.v1"
assert datanet["status"] == "hold"
assert len(datanet.get("entries", [])) >= 2

print("root_public_node_datanet_discovery_index_link_binding_green=true")
PY

echo "== existing DataNet proofs =="
bash ops/mainnet0/void-datanet-public-discovery-onboarding-card-hold-v1-proof.sh >/tmp/void-root-datanet-link-card-proof.log
bash ops/mainnet0/void-datanet-public-discovery-onboarding-runtime-visibility-hold-v1-proof.sh >/tmp/void-root-datanet-link-runtime-proof.log
grep -F "VOID_DATANET_PUBLIC_DISCOVERY_ONBOARDING_CARD_HOLD_V1_GREEN" /tmp/void-root-datanet-link-card-proof.log >/dev/null
grep -F "VOID_DATANET_PUBLIC_DISCOVERY_ONBOARDING_RUNTIME_VISIBILITY_HOLD_V1_GREEN" /tmp/void-root-datanet-link-runtime-proof.log >/dev/null
echo "existing_datanet_proofs_green=true"

echo "== marker presence =="
grep -R "$MARKER" "$ROOT" "$DOC" "$PROOF" >/dev/null
echo "marker_green=true"

echo "== forbidden enablement scan =="
python3 - <<'PY'
from pathlib import Path

paths = [
    Path("public/public-node/index.json"),
    Path("docs/public-node/datanet/root-public-node-datanet-discovery-index-link-hold-v1.md"),
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
    '"public_safe": false',
    '"read_only": false',
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
echo "VOID_ROOT_PUBLIC_NODE_DATANET_DISCOVERY_INDEX_LINK_HOLD_V1_GREEN"
