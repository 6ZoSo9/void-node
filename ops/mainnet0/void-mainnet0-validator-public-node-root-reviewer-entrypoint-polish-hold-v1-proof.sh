#!/usr/bin/env bash
set -euo pipefail

BRICK="mainnet0-validator-public-node-root-reviewer-entrypoint-polish-hold-v1"
MARKER="VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_REVIEWER_ENTRYPOINT_POLISH_HOLD_V1"

DISCOVERY_BRICK="mainnet0-validator-candidate-public-visibility-chain-closeout-discovery-polish-hold-v1"
DISCOVERY_MARKER="VOID_MAINNET0_VALIDATOR_CANDIDATE_PUBLIC_VISIBILITY_CHAIN_CLOSEOUT_DISCOVERY_POLISH_HOLD_V1"

FINAL_HTML_BRICK="mainnet0-validator-candidate-public-visibility-reviewer-final-seal-html-card-hold-v1"
FINAL_HTML_MARKER="VOID_MAINNET0_VALIDATOR_CANDIDATE_PUBLIC_VISIBILITY_REVIEWER_FINAL_SEAL_HTML_CARD_HOLD_V1"

FINAL_RUNTIME_BRICK="mainnet0-validator-candidate-public-visibility-reviewer-final-seal-html-card-runtime-visibility-hold-v1"
FINAL_RUNTIME_MARKER="VOID_MAINNET0_VALIDATOR_CANDIDATE_PUBLIC_VISIBILITY_REVIEWER_FINAL_SEAL_HTML_CARD_RUNTIME_VISIBILITY_HOLD_V1"

ROOT_INDEX="public/public-node/index.json"
SECTION_INDEX="public/public-node/validators/index.json"
CARD="public/public-node/validators/${BRICK}.json"
DISCOVERY_JSON="public/public-node/validators/${DISCOVERY_BRICK}.json"
FINAL_HTML_CARD="public/public-node/validators/${FINAL_HTML_BRICK}.html"
FINAL_HTML_JSON="public/public-node/validators/${FINAL_HTML_BRICK}.json"
FINAL_RUNTIME_JSON="public/public-node/validators/${FINAL_RUNTIME_BRICK}.json"
DOC="docs/public-node/validators/${BRICK}.md"

echo "== JSON parse =="
python3 -m json.tool "$ROOT_INDEX" >/dev/null
python3 -m json.tool "$SECTION_INDEX" >/dev/null
python3 -m json.tool "$CARD" >/dev/null
python3 -m json.tool "$DISCOVERY_JSON" >/dev/null
python3 -m json.tool "$FINAL_HTML_JSON" >/dev/null
python3 -m json.tool "$FINAL_RUNTIME_JSON" >/dev/null
echo "json_green=true"

echo "== source chain presence =="
grep -F "$DISCOVERY_MARKER" "$DISCOVERY_JSON" >/dev/null
grep -F "$FINAL_HTML_MARKER" "$FINAL_HTML_CARD" >/dev/null
grep -F "$FINAL_HTML_MARKER" "$FINAL_HTML_JSON" >/dev/null
grep -F "$FINAL_RUNTIME_MARKER" "$FINAL_RUNTIME_JSON" >/dev/null
grep -F "No public validator submit." "$FINAL_HTML_CARD" >/dev/null
grep -F '"discovery_polish_only": true' "$DISCOVERY_JSON" >/dev/null
grep -F '"runtime_visibility_only": true' "$FINAL_RUNTIME_JSON" >/dev/null
echo "source_chain_green=true"

echo "== root entrypoint binding =="
python3 - <<'PYCHECK'
import json
from pathlib import Path

brick = "mainnet0-validator-public-node-root-reviewer-entrypoint-polish-hold-v1"
marker = "VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_REVIEWER_ENTRYPOINT_POLISH_HOLD_V1"

root = json.loads(Path("public/public-node/index.json").read_text())
section = json.loads(Path("public/public-node/validators/index.json").read_text())
card = json.loads(Path(f"public/public-node/validators/{brick}.json").read_text())

section_route = "/public-node/validators/index.json"
card_route = f"/public-node/validators/{brick}.json"
preferred = "/public-node/validators/mainnet0-validator-candidate-public-visibility-reviewer-final-seal-html-card-hold-v1.html"

root_matches = [r for r in root.get("routes", []) if r.get("route") == preferred]
assert len(root_matches) == 1, root_matches
root_route = root_matches[0]
assert root_route["marker"] == marker
assert root_route["section_index_route"] == section_route
assert root_route["browser_visible"] is True
assert root_route["public_safe"] is True
assert root_route["read_only"] is True
assert root_route["root_entrypoint_polish_only"] is True
assert root_route["static_index_only"] is True

section_matches = [r for r in section.get("routes", []) if r.get("route") == card_route]
assert len(section_matches) == 1, section_matches
section_route_record = section_matches[0]
assert section_route_record["marker"] == marker
assert section_route_record["preferred_reviewer_entrypoint"] == preferred
assert section_route_record["root_index_route"] == "/public-node/index.json"
assert section_route_record["public_safe"] is True
assert section_route_record["read_only"] is True
assert section_route_record["root_entrypoint_polish_only"] is True
assert section_route_record["static_index_only"] is True

assert card["marker"] == marker
assert card["route"] == card_route
assert card["preferred_reviewer_entrypoint"]["route"] == preferred
assert card["public_safe"] is True
assert card["read_only"] is True
assert card["root_entrypoint_polish_only"] is True
assert card["static_index_only"] is True

for flag in [
    "public_submit_enabled",
    "stake_lock_enabled",
    "wallet_connect_enabled",
    "candidate_registration_enabled",
    "candidate_intake_enabled",
    "active_admission_enabled",
    "activation_enabled",
    "epoch_mutation_enabled",
    "validator_set_write_enabled",
    "validator_runtime_truth_write_enabled",
    "runtime_mutation_route_enabled",
    "mutation_handler_enabled",
    "signer_or_wallet_required",
]:
    assert card["public_surface"][flag] is False, flag

for container in [root_route, section_route_record]:
    for flag in [
        "public_submit_enabled",
        "stake_lock_enabled",
        "candidate_registration_enabled",
        "active_admission_enabled",
        "runtime_mutation_route_enabled",
        "mutation_handler_enabled",
    ]:
        assert container[flag] is False, (container.get("route"), flag)

print("validator_public_node_root_reviewer_entrypoint_polish_binding_green=true")
PYCHECK

echo "== marker presence =="
grep -F "$MARKER" "$ROOT_INDEX" >/dev/null
grep -F "$MARKER" "$SECTION_INDEX" >/dev/null
grep -F "$MARKER" "$CARD" >/dev/null
grep -F "$MARKER" "$DOC" >/dev/null
grep -F "$MARKER" "$0" >/dev/null
echo "marker_green=true"

echo "== forbidden enablement boundary =="
python3 - <<'PYCHECK'
from pathlib import Path

paths = [
    Path("public/public-node/index.json"),
    Path("public/public-node/validators/index.json"),
    Path("public/public-node/validators/mainnet0-validator-public-node-root-reviewer-entrypoint-polish-hold-v1.json"),
]

needles = [
    '"public_submit_enabled": true',
    '"stake_lock_enabled": true',
    '"wallet_connect_enabled": true',
    '"candidate_registration_enabled": true',
    '"candidate_intake_enabled": true',
    '"active_admission_enabled": true',
    '"activation_enabled": true',
    '"epoch_mutation_enabled": true',
    '"validator_set_write_enabled": true',
    '"validator_runtime_truth_write_enabled": true',
    '"runtime_mutation_route_enabled": true',
    '"mutation_handler_enabled": true',
    '"signer_or_wallet_required": true',
]

for path in paths:
    text = path.read_text()
    for needle in needles:
        assert needle not in text, (path, needle)

print("forbidden_enablement_scan_green=true")
PYCHECK

echo "== result =="
echo "${MARKER}_GREEN"
