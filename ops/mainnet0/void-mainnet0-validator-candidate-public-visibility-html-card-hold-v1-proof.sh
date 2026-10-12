#!/usr/bin/env bash
set -euo pipefail

BRICK="mainnet0-validator-candidate-public-visibility-html-card-hold-v1"
MARKER="VOID_MAINNET0_VALIDATOR_CANDIDATE_PUBLIC_VISIBILITY_HTML_CARD_HOLD_V1"
SOURCE_BRICK="mainnet0-validator-candidate-public-visibility-index-hold-v1"
SOURCE_MARKER="VOID_MAINNET0_VALIDATOR_CANDIDATE_PUBLIC_VISIBILITY_INDEX_HOLD_V1"

SECTION_INDEX="public/public-node/validators/index.json"
CARD_JSON="public/public-node/validators/${BRICK}.json"
CARD_HTML="public/public-node/validators/${BRICK}.html"
SOURCE_CARD="public/public-node/validators/${SOURCE_BRICK}.json"
DOC="docs/public-node/validators/${BRICK}.md"

echo "== JSON parse =="
python3 -m json.tool "$SECTION_INDEX" >/dev/null
python3 -m json.tool "$CARD_JSON" >/dev/null
python3 -m json.tool "$SOURCE_CARD" >/dev/null
echo "json_green=true"

echo "== source visibility record =="
grep -F "$SOURCE_MARKER" "$SOURCE_CARD" >/dev/null
grep -F '"minimum_validator_self_stake_void": 10000' "$SOURCE_CARD" >/dev/null
grep -F '"public_registration_does_not_equal_active_admission": true' "$SOURCE_CARD" >/dev/null
grep -F '"active_validator_runtime_truth_must_not_change_from_public_visibility": true' "$SOURCE_CARD" >/dev/null
echo "source_visibility_record_green=true"

echo "== html source =="
test -f "$CARD_HTML"
grep -F "$MARKER" "$CARD_HTML" >/dev/null
grep -F "Public validator registration does not equal active validator admission." "$CARD_HTML" >/dev/null
grep -F "No public validator submit." "$CARD_HTML" >/dev/null
grep -F "No stake lock." "$CARD_HTML" >/dev/null
grep -F "No active validator admission." "$CARD_HTML" >/dev/null
grep -F "Boundary: static public discovery only." "$CARD_HTML" >/dev/null
echo "html_source_green=true"

echo "== binding =="
python3 - <<'PYCHECK'
import json
from pathlib import Path

brick = "mainnet0-validator-candidate-public-visibility-html-card-hold-v1"
marker = "VOID_MAINNET0_VALIDATOR_CANDIDATE_PUBLIC_VISIBILITY_HTML_CARD_HOLD_V1"
source_brick = "mainnet0-validator-candidate-public-visibility-index-hold-v1"
source_marker = "VOID_MAINNET0_VALIDATOR_CANDIDATE_PUBLIC_VISIBILITY_INDEX_HOLD_V1"

section = json.loads(Path("public/public-node/validators/index.json").read_text())
card = json.loads(Path(f"public/public-node/validators/{brick}.json").read_text())
source = json.loads(Path(f"public/public-node/validators/{source_brick}.json").read_text())

html_route = f"/public-node/validators/{brick}.html"
json_route = f"/public-node/validators/{brick}.json"
source_route = f"/public-node/validators/{source_brick}.json"

matches = [r for r in section.get("routes", []) if r.get("route") == html_route]
assert len(matches) == 1, matches
route = matches[0]

assert route["marker"] == marker
assert route["json_route"] == json_route
assert route["source_visibility_record_route"] == source_route
assert route["public_safe"] is True
assert route["read_only"] is True
assert route["browser_visible"] is True
assert route["static_html_only"] is True

assert card["marker"] == marker
assert card["route"] == html_route
assert card["json_route"] == json_route
assert card["source_visibility_record_route"] == source_route
assert card["source_visibility_record_marker"] == source_marker
assert card["public_safe"] is True
assert card["read_only"] is True
assert card["browser_visible"] is True
assert card["static_html_only"] is True

assert source["marker"] == source_marker
assert source["mainnet0_validator_policy"]["minimum_validator_self_stake_void"] == 10000
assert source["mainnet0_validator_policy"]["public_registration_does_not_equal_active_admission"] is True

for flag in [
    "public_submit_enabled",
    "stake_lock_enabled",
    "wallet_connect_enabled",
    "candidate_registration_enabled",
    "candidate_intake_enabled",
    "active_admission_enabled",
    "activation_enabled",
    "epoch_mutation_enabled",
    "runtime_mutation_route_enabled",
    "mutation_handler_enabled",
    "signer_or_wallet_required",
    "validator_set_write_enabled",
    "validator_runtime_truth_write_enabled",
]:
    assert card["public_surface"][flag] is False, flag

for flag in [
    "public_submit_enabled",
    "stake_lock_enabled",
    "candidate_registration_enabled",
    "active_admission_enabled",
    "runtime_mutation_route_enabled",
    "mutation_handler_enabled",
]:
    assert route[flag] is False, flag

print("validator_candidate_public_visibility_html_binding_green=true")
PYCHECK

echo "== marker presence =="
grep -F "$MARKER" "$SECTION_INDEX" >/dev/null
grep -F "$MARKER" "$CARD_JSON" >/dev/null
grep -F "$MARKER" "$CARD_HTML" >/dev/null
grep -F "$MARKER" "$DOC" >/dev/null
grep -F "$MARKER" "$0" >/dev/null
echo "marker_green=true"

echo "== forbidden enablement boundary =="
python3 - <<'PYCHECK'
from pathlib import Path

paths = [
    Path("public/public-node/validators/index.json"),
    Path("public/public-node/validators/mainnet0-validator-candidate-public-visibility-html-card-hold-v1.json"),
    Path("public/public-node/validators/mainnet0-validator-candidate-public-visibility-html-card-hold-v1.html"),
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
    '"runtime_mutation_route_enabled": true',
    '"mutation_handler_enabled": true',
    '"signer_or_wallet_required": true',
    '"validator_set_write_enabled": true',
    '"validator_runtime_truth_write_enabled": true',
]

for path in paths:
    text = path.read_text()
    for needle in needles:
        assert needle not in text, (path, needle)

print("forbidden_enablement_scan_green=true")
PYCHECK

echo "== result =="
echo "${MARKER}_GREEN"
