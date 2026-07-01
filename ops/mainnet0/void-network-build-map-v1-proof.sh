#!/usr/bin/env bash
set -euo pipefail

MARKER="VOID_NETWORK_BUILD_MAP_V1_HOLD"
SECTION_MARKER="VOID_NETWORK_PUBLIC_NODE_SECTION_INDEX_V1_HOLD"

BUILD_JSON="public/public-node/void-network/build-map-v1.json"
BUILD_HTML="public/public-node/void-network/build-map-v1.html"
SECTION_INDEX="public/public-node/void-network/index.json"
ROOT_INDEX="public/public-node/index.json"
DOC="docs/public-node/void-network-build-map-v1.md"

echo "== VOID Network Build Map v1 proof =="

test -s "$BUILD_JSON"
test -s "$BUILD_HTML"
test -s "$SECTION_INDEX"
test -s "$ROOT_INDEX"
test -s "$DOC"

python3 -m json.tool "$BUILD_JSON" >/tmp/void-network-build-map-v1-json.ok
python3 -m json.tool "$SECTION_INDEX" >/tmp/void-network-section-index-v1-json.ok
python3 -m json.tool "$ROOT_INDEX" >/tmp/void-public-node-root-index-build-map-v1-json.ok

grep -q "$MARKER" "$BUILD_JSON"
grep -q "$MARKER" "$BUILD_HTML"
grep -q "$MARKER" "$DOC"
grep -q "$SECTION_MARKER" "$SECTION_INDEX"
grep -q "$SECTION_MARKER" "$ROOT_INDEX"
grep -q "$MARKER" "$ROOT_INDEX"

python3 - <<'PY2'
import json
from pathlib import Path

build = json.loads(Path("public/public-node/void-network/build-map-v1.json").read_text(encoding="utf-8"))
section = json.loads(Path("public/public-node/void-network/index.json").read_text(encoding="utf-8"))
root = json.loads(Path("public/public-node/index.json").read_text(encoding="utf-8"))
html = Path("public/public-node/void-network/build-map-v1.html").read_text(encoding="utf-8")
doc = Path("docs/public-node/void-network-build-map-v1.md").read_text(encoding="utf-8")

assert build["marker"] == "VOID_NETWORK_BUILD_MAP_V1_HOLD"
assert build["public_safe"] is True
assert build["read_only"] is True
assert build["static_visibility_only"] is True
assert build["canonical_route"] == "/public-node/void-network/build-map-v1.json"
assert build["browser_visible_route"] == "/public-node/void-network/build-map-v1.html"
assert len(build["sections"]) == 6

section_ids = {s["id"] for s in build["sections"]}
expected = {
    "datanet",
    "work_credits",
    "mainnet0_validators",
    "usdc_void_buy_pool",
    "apollyon",
    "public_node",
}
assert section_ids == expected, section_ids

wc = next(s for s in build["sections"] if s["id"] == "work_credits")
assert wc["policy"]["unlimited_uncapped"] is True
assert wc["policy"]["not_a_lifetime_supply_cap"] is True
assert wc["policy"]["operator_review_required"] is True

boundary = build["boundary"]
for key in [
    "mutation_handler",
    "runtime_mutation_route",
    "wallet_connect",
    "signer_access",
    "secret_material",
    "ledger_write",
    "wc_issuance",
    "wc_claim",
    "void_transfer",
    "usdc_transfer",
    "buy_pool_execution",
    "validator_registration",
    "validator_admission",
    "validator_set_write",
    "epoch_activation",
    "datanet_object_write",
    "peer_pin_command",
    "mirror_command",
    "ai_autonomous_write",
]:
    assert boundary[key] is False, key

assert section["marker"] == "VOID_NETWORK_PUBLIC_NODE_SECTION_INDEX_V1_HOLD"
assert section["public_safe"] is True
assert section["read_only"] is True
assert section["static_index_only"] is True
assert section["routes"][0]["json"] == "/public-node/void-network/build-map-v1.json"
assert section["routes"][0]["html"] == "/public-node/void-network/build-map-v1.html"

root_routes = root.get("routes", [])
root_ids = {r.get("id") for r in root_routes if isinstance(r, dict)}
root_markers = {r.get("marker") for r in root_routes if isinstance(r, dict)}

assert "void_network_section_index_v1" in root_ids
assert "void_network_build_map_v1" in root_ids
assert "VOID_NETWORK_PUBLIC_NODE_SECTION_INDEX_V1_HOLD" in root_markers
assert "VOID_NETWORK_BUILD_MAP_V1_HOLD" in root_markers

build_root = next(r for r in root_routes if isinstance(r, dict) and r.get("id") == "void_network_build_map_v1")
assert build_root["route"] == "/public-node/void-network/build-map-v1.html"
assert build_root["json_route"] == "/public-node/void-network/build-map-v1.json"
assert build_root["public_safe"] is True
assert build_root["read_only"] is True
assert build_root["static_visibility_only"] is True

for needle in [
    "VOID_NETWORK_BUILD_MAP_V1_HOLD",
    "/public-node/void-network/build-map-v1.json",
    "no wallet connect",
    "no ledger write",
    "no autonomous AI write",
]:
    assert needle in html, needle

for needle in [
    "VOID_NETWORK_BUILD_MAP_V1_HOLD",
    "unlimited and uncapped",
    "not a lifetime Work Credit supply cap",
    "safe to publish",
]:
    assert needle in doc, needle

print("void_network_build_map_v1_structural_checks_green=true")
PY2

echo "VOID_NETWORK_BUILD_MAP_V1_GREEN"
