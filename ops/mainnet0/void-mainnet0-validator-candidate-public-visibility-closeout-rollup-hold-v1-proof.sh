#!/usr/bin/env bash
set -euo pipefail

BRICK="mainnet0-validator-candidate-public-visibility-closeout-rollup-hold-v1"
MARKER="VOID_MAINNET0_VALIDATOR_CANDIDATE_PUBLIC_VISIBILITY_CLOSEOUT_ROLLUP_HOLD_V1"

INDEX_BRICK="mainnet0-validator-candidate-public-visibility-index-hold-v1"
INDEX_MARKER="VOID_MAINNET0_VALIDATOR_CANDIDATE_PUBLIC_VISIBILITY_INDEX_HOLD_V1"

HTML_BRICK="mainnet0-validator-candidate-public-visibility-html-card-hold-v1"
HTML_MARKER="VOID_MAINNET0_VALIDATOR_CANDIDATE_PUBLIC_VISIBILITY_HTML_CARD_HOLD_V1"

RUNTIME_BRICK="mainnet0-validator-candidate-public-visibility-html-card-runtime-visibility-hold-v1"
RUNTIME_MARKER="VOID_MAINNET0_VALIDATOR_CANDIDATE_PUBLIC_VISIBILITY_HTML_CARD_RUNTIME_VISIBILITY_HOLD_V1"

ROOT_INDEX="public/public-node/index.json"
SECTION_INDEX="public/public-node/validators/index.json"
INDEX_JSON="public/public-node/validators/${INDEX_BRICK}.json"
HTML_CARD="public/public-node/validators/${HTML_BRICK}.html"
HTML_JSON="public/public-node/validators/${HTML_BRICK}.json"
RUNTIME_JSON="public/public-node/validators/${RUNTIME_BRICK}.json"
ROLLUP_JSON="public/public-node/validators/${BRICK}.json"
DOC="docs/public-node/validators/${BRICK}.md"

echo "== JSON parse =="
python3 -m json.tool "$ROOT_INDEX" >/dev/null
python3 -m json.tool "$SECTION_INDEX" >/dev/null
python3 -m json.tool "$INDEX_JSON" >/dev/null
python3 -m json.tool "$HTML_JSON" >/dev/null
python3 -m json.tool "$RUNTIME_JSON" >/dev/null
python3 -m json.tool "$ROLLUP_JSON" >/dev/null
echo "json_green=true"

echo "== source chain presence =="
grep -F "$INDEX_MARKER" "$INDEX_JSON" >/dev/null
grep -F "$HTML_MARKER" "$HTML_CARD" >/dev/null
grep -F "$HTML_MARKER" "$HTML_JSON" >/dev/null
grep -F "$RUNTIME_MARKER" "$RUNTIME_JSON" >/dev/null
grep -F '"minimum_validator_self_stake_void": 10000' "$INDEX_JSON" >/dev/null
grep -F "Public validator registration does not equal active validator admission." "$HTML_CARD" >/dev/null
grep -F "No public validator submit." "$HTML_CARD" >/dev/null
grep -F '"runtime_visibility_only": true' "$RUNTIME_JSON" >/dev/null
echo "source_chain_green=true"

echo "== closeout binding =="
python3 - <<'PYCHECK'
import json
from pathlib import Path

brick = "mainnet0-validator-candidate-public-visibility-closeout-rollup-hold-v1"
marker = "VOID_MAINNET0_VALIDATOR_CANDIDATE_PUBLIC_VISIBILITY_CLOSEOUT_ROLLUP_HOLD_V1"

index_brick = "mainnet0-validator-candidate-public-visibility-index-hold-v1"
index_marker = "VOID_MAINNET0_VALIDATOR_CANDIDATE_PUBLIC_VISIBILITY_INDEX_HOLD_V1"

html_brick = "mainnet0-validator-candidate-public-visibility-html-card-hold-v1"
html_marker = "VOID_MAINNET0_VALIDATOR_CANDIDATE_PUBLIC_VISIBILITY_HTML_CARD_HOLD_V1"

runtime_brick = "mainnet0-validator-candidate-public-visibility-html-card-runtime-visibility-hold-v1"
runtime_marker = "VOID_MAINNET0_VALIDATOR_CANDIDATE_PUBLIC_VISIBILITY_HTML_CARD_RUNTIME_VISIBILITY_HOLD_V1"

root = json.loads(Path("public/public-node/index.json").read_text())
section = json.loads(Path("public/public-node/validators/index.json").read_text())
index_json = json.loads(Path(f"public/public-node/validators/{index_brick}.json").read_text())
html_json = json.loads(Path(f"public/public-node/validators/{html_brick}.json").read_text())
runtime_json = json.loads(Path(f"public/public-node/validators/{runtime_brick}.json").read_text())
rollup = json.loads(Path(f"public/public-node/validators/{brick}.json").read_text())

section_route = "/public-node/validators/index.json"
index_route = f"/public-node/validators/{index_brick}.json"
html_route = f"/public-node/validators/{html_brick}.html"
html_json_route = f"/public-node/validators/{html_brick}.json"
runtime_route = f"/public-node/validators/{runtime_brick}.json"
rollup_route = f"/public-node/validators/{brick}.json"

root_matches = [r for r in root.get("routes", []) if r.get("route") == section_route]
assert len(root_matches) == 1, root_matches
assert root_matches[0]["public_safe"] is True
assert root_matches[0]["read_only"] is True

section_matches = [r for r in section.get("routes", []) if r.get("route") == rollup_route]
assert len(section_matches) == 1, section_matches
route = section_matches[0]

assert route["marker"] == marker
assert route["source_visibility_record_route"] == index_route
assert route["html_route"] == html_route
assert route["runtime_visibility_route"] == runtime_route
assert route["public_safe"] is True
assert route["read_only"] is True
assert route["closeout_rollup_only"] is True
assert route["static_index_only"] is True

assert index_json["marker"] == index_marker
assert html_json["marker"] == html_marker
assert runtime_json["marker"] == runtime_marker

assert rollup["marker"] == marker
assert rollup["route"] == rollup_route
assert rollup["section_index_route"] == section_route
assert rollup["public_safe"] is True
assert rollup["read_only"] is True
assert rollup["closeout_rollup_only"] is True
assert rollup["static_index_only"] is True

sources = {(s["route"], s["marker"]) for s in rollup["source_records"]}
assert (index_route, index_marker) in sources
assert (html_route, html_marker) in sources
assert (runtime_route, runtime_marker) in sources

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
    assert rollup["public_surface"][flag] is False, flag

for flag in [
    "public_submit_enabled",
    "stake_lock_enabled",
    "candidate_registration_enabled",
    "active_admission_enabled",
    "runtime_mutation_route_enabled",
    "mutation_handler_enabled",
]:
    assert route[flag] is False, flag

print("validator_candidate_public_visibility_closeout_rollup_binding_green=true")
PYCHECK

echo "== marker presence =="
grep -F "$MARKER" "$SECTION_INDEX" >/dev/null
grep -F "$MARKER" "$ROLLUP_JSON" >/dev/null
grep -F "$MARKER" "$DOC" >/dev/null
grep -F "$MARKER" "$0" >/dev/null
echo "marker_green=true"

echo "== forbidden enablement boundary =="
python3 - <<'PYCHECK'
from pathlib import Path

paths = [
    Path("public/public-node/validators/index.json"),
    Path("public/public-node/validators/mainnet0-validator-candidate-public-visibility-closeout-rollup-hold-v1.json"),
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
