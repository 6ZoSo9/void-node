#!/usr/bin/env bash
set -euo pipefail

BRICK="mainnet0-validator-public-visibility-root-to-reviewer-chain-audit-rollup-html-runtime-visibility-hold-v1"
MARKER="VOID_MAINNET0_VALIDATOR_PUBLIC_VISIBILITY_ROOT_TO_REVIEWER_CHAIN_AUDIT_ROLLUP_HTML_RUNTIME_VISIBILITY_HOLD_V1"
CARD_BRICK="mainnet0-validator-public-visibility-root-to-reviewer-chain-audit-rollup-html-card-hold-v1"
CARD_MARKER="VOID_MAINNET0_VALIDATOR_PUBLIC_VISIBILITY_ROOT_TO_REVIEWER_CHAIN_AUDIT_ROLLUP_HTML_CARD_HOLD_V1"
AUDIT_BRICK="mainnet0-validator-public-visibility-root-to-reviewer-chain-audit-rollup-hold-v1"
AUDIT_MARKER="VOID_MAINNET0_VALIDATOR_PUBLIC_VISIBILITY_ROOT_TO_REVIEWER_CHAIN_AUDIT_ROLLUP_HOLD_V1"

SECTION_INDEX="public/public-node/validators/index.json"
RUNTIME_JSON="public/public-node/validators/${BRICK}.json"
CARD_JSON="public/public-node/validators/${CARD_BRICK}.json"
CARD_HTML="public/public-node/validators/${CARD_BRICK}.html"
AUDIT_JSON="public/public-node/validators/${AUDIT_BRICK}.json"
DOC="docs/public-node/validators/${BRICK}.md"

echo "== JSON parse =="
python3 -m json.tool "$SECTION_INDEX" >/dev/null
python3 -m json.tool "$RUNTIME_JSON" >/dev/null
python3 -m json.tool "$CARD_JSON" >/dev/null
python3 -m json.tool "$AUDIT_JSON" >/dev/null
echo "json_green=true"

echo "== source card presence =="
grep -F "$CARD_MARKER" "$CARD_JSON" >/dev/null
grep -F "$CARD_MARKER" "$CARD_HTML" >/dev/null
grep -F "$AUDIT_MARKER" "$AUDIT_JSON" >/dev/null
grep -F '"browser_visible": true' "$CARD_JSON" >/dev/null
grep -F '"static_html_only": true' "$CARD_JSON" >/dev/null
grep -F "Boundary: static public audit discovery only." "$CARD_HTML" >/dev/null
echo "source_card_green=true"

echo "== runtime visibility binding =="
python3 - <<'PYCHECK'
import json
from pathlib import Path

brick = "mainnet0-validator-public-visibility-root-to-reviewer-chain-audit-rollup-html-runtime-visibility-hold-v1"
marker = "VOID_MAINNET0_VALIDATOR_PUBLIC_VISIBILITY_ROOT_TO_REVIEWER_CHAIN_AUDIT_ROLLUP_HTML_RUNTIME_VISIBILITY_HOLD_V1"

card_brick = "mainnet0-validator-public-visibility-root-to-reviewer-chain-audit-rollup-html-card-hold-v1"
card_marker = "VOID_MAINNET0_VALIDATOR_PUBLIC_VISIBILITY_ROOT_TO_REVIEWER_CHAIN_AUDIT_ROLLUP_HTML_CARD_HOLD_V1"

audit_brick = "mainnet0-validator-public-visibility-root-to-reviewer-chain-audit-rollup-hold-v1"
audit_marker = "VOID_MAINNET0_VALIDATOR_PUBLIC_VISIBILITY_ROOT_TO_REVIEWER_CHAIN_AUDIT_ROLLUP_HOLD_V1"

section = json.loads(Path("public/public-node/validators/index.json").read_text())
runtime = json.loads(Path(f"public/public-node/validators/{brick}.json").read_text())
card = json.loads(Path(f"public/public-node/validators/{card_brick}.json").read_text())
audit = json.loads(Path(f"public/public-node/validators/{audit_brick}.json").read_text())

runtime_route = f"/public-node/validators/{brick}.json"
card_route = f"/public-node/validators/{card_brick}.html"
card_json_route = f"/public-node/validators/{card_brick}.json"
audit_route = f"/public-node/validators/{audit_brick}.json"

matches = [r for r in section.get("routes", []) if r.get("route") == runtime_route]
assert len(matches) == 1, matches
route = matches[0]

assert route["marker"] == marker
assert route["source_html_card_route"] == card_route
assert route["source_html_card_json_route"] == card_json_route
assert route["source_audit_rollup_route"] == audit_route
assert route["public_safe"] is True
assert route["read_only"] is True
assert route["runtime_visibility_only"] is True
assert route["browser_visible_card_runtime_visibility_only"] is True
assert route["static_html_only"] is True
assert route["static_index_only"] is True

assert runtime["marker"] == marker
assert runtime["route"] == runtime_route
assert runtime["source_html_card_route"] == card_route
assert runtime["source_html_card_json_route"] == card_json_route
assert runtime["source_html_card_marker"] == card_marker
assert runtime["source_audit_rollup_route"] == audit_route
assert runtime["source_audit_rollup_marker"] == audit_marker
assert runtime["public_safe"] is True
assert runtime["read_only"] is True
assert runtime["runtime_visibility_only"] is True
assert runtime["browser_visible_card_runtime_visibility_only"] is True
assert runtime["static_html_only"] is True
assert runtime["static_index_only"] is True

assert card["marker"] == card_marker
assert card["browser_visible"] is True
assert card["static_html_only"] is True
assert audit["marker"] == audit_marker
assert audit["audit_rollup_only"] is True

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
    "epoch_mutation_enabled",
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

print("validator_public_visibility_root_to_reviewer_chain_audit_rollup_html_runtime_binding_green=true")
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
    Path("public/public-node/validators/mainnet0-validator-public-visibility-root-to-reviewer-chain-audit-rollup-html-runtime-visibility-hold-v1.json"),
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
    '"epoch_mutation_enabled": true',
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
