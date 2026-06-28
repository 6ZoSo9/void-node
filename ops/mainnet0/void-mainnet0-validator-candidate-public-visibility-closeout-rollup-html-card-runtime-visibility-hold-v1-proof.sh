#!/usr/bin/env bash
set -euo pipefail

BRICK="mainnet0-validator-candidate-public-visibility-closeout-rollup-html-card-runtime-visibility-hold-v1"
MARKER="VOID_MAINNET0_VALIDATOR_CANDIDATE_PUBLIC_VISIBILITY_CLOSEOUT_ROLLUP_HTML_CARD_RUNTIME_VISIBILITY_HOLD_V1"
HTML_BRICK="mainnet0-validator-candidate-public-visibility-closeout-rollup-html-card-hold-v1"
HTML_MARKER="VOID_MAINNET0_VALIDATOR_CANDIDATE_PUBLIC_VISIBILITY_CLOSEOUT_ROLLUP_HTML_CARD_HOLD_V1"
ROLLUP_BRICK="mainnet0-validator-candidate-public-visibility-closeout-rollup-hold-v1"
ROLLUP_MARKER="VOID_MAINNET0_VALIDATOR_CANDIDATE_PUBLIC_VISIBILITY_CLOSEOUT_ROLLUP_HOLD_V1"

SECTION_INDEX="public/public-node/validators/index.json"
RUNTIME_JSON="public/public-node/validators/${BRICK}.json"
HTML_CARD="public/public-node/validators/${HTML_BRICK}.html"
HTML_JSON="public/public-node/validators/${HTML_BRICK}.json"
ROLLUP_JSON="public/public-node/validators/${ROLLUP_BRICK}.json"
DOC="docs/public-node/validators/${BRICK}.md"

echo "== JSON parse =="
python3 -m json.tool "$SECTION_INDEX" >/dev/null
python3 -m json.tool "$RUNTIME_JSON" >/dev/null
python3 -m json.tool "$HTML_JSON" >/dev/null
python3 -m json.tool "$ROLLUP_JSON" >/dev/null
echo "json_green=true"

echo "== source card presence =="
test -f "$HTML_CARD"
grep -F "$HTML_MARKER" "$HTML_CARD" >/dev/null
grep -F "$HTML_MARKER" "$HTML_JSON" >/dev/null
grep -F "$ROLLUP_MARKER" "$ROLLUP_JSON" >/dev/null
grep -F "No public validator submit." "$HTML_CARD" >/dev/null
grep -F "No stake lock." "$HTML_CARD" >/dev/null
grep -F "No active validator admission." "$HTML_CARD" >/dev/null
echo "source_card_green=true"

echo "== runtime visibility binding =="
python3 - <<'PYCHECK'
import json
from pathlib import Path

brick = "mainnet0-validator-candidate-public-visibility-closeout-rollup-html-card-runtime-visibility-hold-v1"
marker = "VOID_MAINNET0_VALIDATOR_CANDIDATE_PUBLIC_VISIBILITY_CLOSEOUT_ROLLUP_HTML_CARD_RUNTIME_VISIBILITY_HOLD_V1"

html_brick = "mainnet0-validator-candidate-public-visibility-closeout-rollup-html-card-hold-v1"
html_marker = "VOID_MAINNET0_VALIDATOR_CANDIDATE_PUBLIC_VISIBILITY_CLOSEOUT_ROLLUP_HTML_CARD_HOLD_V1"

rollup_brick = "mainnet0-validator-candidate-public-visibility-closeout-rollup-hold-v1"
rollup_marker = "VOID_MAINNET0_VALIDATOR_CANDIDATE_PUBLIC_VISIBILITY_CLOSEOUT_ROLLUP_HOLD_V1"

section = json.loads(Path("public/public-node/validators/index.json").read_text())
runtime = json.loads(Path(f"public/public-node/validators/{brick}.json").read_text())
html_json = json.loads(Path(f"public/public-node/validators/{html_brick}.json").read_text())
rollup = json.loads(Path(f"public/public-node/validators/{rollup_brick}.json").read_text())

runtime_route = f"/public-node/validators/{brick}.json"
html_route = f"/public-node/validators/{html_brick}.html"
html_json_route = f"/public-node/validators/{html_brick}.json"
rollup_route = f"/public-node/validators/{rollup_brick}.json"

matches = [r for r in section.get("routes", []) if r.get("route") == runtime_route]
assert len(matches) == 1, matches
route = matches[0]

assert route["marker"] == marker
assert route["html_route"] == html_route
assert route["html_json_route"] == html_json_route
assert route["source_closeout_rollup_route"] == rollup_route
assert route["public_safe"] is True
assert route["read_only"] is True
assert route["runtime_visibility_only"] is True
assert route["static_html_visible"] is True
assert route["static_index_only"] is True

assert runtime["marker"] == marker
assert runtime["route"] == runtime_route
assert runtime["html_route"] == html_route
assert runtime["html_json_route"] == html_json_route
assert runtime["source_closeout_rollup_route"] == rollup_route
assert runtime["html_card_marker"] == html_marker
assert runtime["source_closeout_rollup_marker"] == rollup_marker
assert runtime["public_safe"] is True
assert runtime["read_only"] is True
assert runtime["runtime_visibility_only"] is True
assert runtime["static_html_visible"] is True
assert runtime["static_index_only"] is True

assert html_json["marker"] == html_marker
assert rollup["marker"] == rollup_marker

for flag in [
    "requires_runtime_mutation_handler",
    "requires_wallet_or_signer",
    "public_submit_enabled",
    "stake_lock_enabled",
    "wallet_connect_enabled",
    "candidate_registration_enabled",
    "candidate_intake_enabled",
    "active_admission_enabled",
    "activation_enabled",
    "validator_set_write_enabled",
    "validator_runtime_truth_write_enabled",
    "runtime_mutation_route_enabled",
    "mutation_handler_enabled",
]:
    assert runtime["runtime_surface"][flag] is False, flag

for flag in [
    "public_submit_enabled",
    "stake_lock_enabled",
    "candidate_registration_enabled",
    "active_admission_enabled",
    "runtime_mutation_route_enabled",
    "mutation_handler_enabled",
]:
    assert route[flag] is False, flag

print("validator_candidate_public_visibility_closeout_rollup_html_runtime_binding_green=true")
PYCHECK

echo "== marker presence =="
grep -F "$MARKER" "$SECTION_INDEX" >/dev/null
grep -F "$MARKER" "$RUNTIME_JSON" >/dev/null
grep -F "$MARKER" "$DOC" >/dev/null
grep -F "$MARKER" "$0" >/dev/null
echo "marker_green=true"

echo "== forbidden enablement boundary =="
python3 - <<'PYCHECK'
from pathlib import Path

paths = [
    Path("public/public-node/validators/index.json"),
    Path("public/public-node/validators/mainnet0-validator-candidate-public-visibility-closeout-rollup-html-card-runtime-visibility-hold-v1.json"),
]

needles = [
    '"requires_runtime_mutation_handler": true',
    '"requires_wallet_or_signer": true',
    '"public_submit_enabled": true',
    '"stake_lock_enabled": true',
    '"wallet_connect_enabled": true',
    '"candidate_registration_enabled": true',
    '"candidate_intake_enabled": true',
    '"active_admission_enabled": true',
    '"activation_enabled": true',
    '"validator_set_write_enabled": true',
    '"validator_runtime_truth_write_enabled": true',
    '"runtime_mutation_route_enabled": true',
    '"mutation_handler_enabled": true',
]

for path in paths:
    text = path.read_text()
    for needle in needles:
        assert needle not in text, (path, needle)

print("forbidden_enablement_scan_green=true")
PYCHECK

echo "== result =="
echo "${MARKER}_GREEN"
