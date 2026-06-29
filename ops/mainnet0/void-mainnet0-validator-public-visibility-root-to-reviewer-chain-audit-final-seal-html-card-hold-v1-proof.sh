#!/usr/bin/env bash
set -euo pipefail

BRICK="mainnet0-validator-public-visibility-root-to-reviewer-chain-audit-final-seal-html-card-hold-v1"
MARKER="VOID_MAINNET0_VALIDATOR_PUBLIC_VISIBILITY_ROOT_TO_REVIEWER_CHAIN_AUDIT_FINAL_SEAL_HTML_CARD_HOLD_V1"

SEAL_BRICK="mainnet0-validator-public-visibility-root-to-reviewer-chain-audit-final-seal-hold-v1"
SEAL_MARKER="VOID_MAINNET0_VALIDATOR_PUBLIC_VISIBILITY_ROOT_TO_REVIEWER_CHAIN_AUDIT_FINAL_SEAL_HOLD_V1"

AUDIT_BRICK="mainnet0-validator-public-visibility-root-to-reviewer-chain-audit-rollup-hold-v1"
AUDIT_MARKER="VOID_MAINNET0_VALIDATOR_PUBLIC_VISIBILITY_ROOT_TO_REVIEWER_CHAIN_AUDIT_ROLLUP_HOLD_V1"

AUDIT_HTML_BRICK="mainnet0-validator-public-visibility-root-to-reviewer-chain-audit-rollup-html-card-hold-v1"
AUDIT_HTML_MARKER="VOID_MAINNET0_VALIDATOR_PUBLIC_VISIBILITY_ROOT_TO_REVIEWER_CHAIN_AUDIT_ROLLUP_HTML_CARD_HOLD_V1"

AUDIT_RUNTIME_BRICK="mainnet0-validator-public-visibility-root-to-reviewer-chain-audit-rollup-html-runtime-visibility-hold-v1"
AUDIT_RUNTIME_MARKER="VOID_MAINNET0_VALIDATOR_PUBLIC_VISIBILITY_ROOT_TO_REVIEWER_CHAIN_AUDIT_ROLLUP_HTML_RUNTIME_VISIBILITY_HOLD_V1"

SECTION_INDEX="public/public-node/validators/index.json"
CARD_JSON="public/public-node/validators/${BRICK}.json"
CARD_HTML="public/public-node/validators/${BRICK}.html"
SEAL_JSON="public/public-node/validators/${SEAL_BRICK}.json"
AUDIT_JSON="public/public-node/validators/${AUDIT_BRICK}.json"
AUDIT_HTML_JSON="public/public-node/validators/${AUDIT_HTML_BRICK}.json"
AUDIT_HTML_CARD="public/public-node/validators/${AUDIT_HTML_BRICK}.html"
AUDIT_RUNTIME_JSON="public/public-node/validators/${AUDIT_RUNTIME_BRICK}.json"
DOC="docs/public-node/validators/${BRICK}.md"

echo "== JSON parse =="
python3 -m json.tool "$SECTION_INDEX" >/dev/null
python3 -m json.tool "$CARD_JSON" >/dev/null
python3 -m json.tool "$SEAL_JSON" >/dev/null
python3 -m json.tool "$AUDIT_JSON" >/dev/null
python3 -m json.tool "$AUDIT_HTML_JSON" >/dev/null
python3 -m json.tool "$AUDIT_RUNTIME_JSON" >/dev/null
echo "json_green=true"

echo "== source chain presence =="
grep -F "$SEAL_MARKER" "$SEAL_JSON" >/dev/null
grep -F "$AUDIT_MARKER" "$AUDIT_JSON" >/dev/null
grep -F "$AUDIT_HTML_MARKER" "$AUDIT_HTML_JSON" >/dev/null
grep -F "$AUDIT_HTML_MARKER" "$AUDIT_HTML_CARD" >/dev/null
grep -F "$AUDIT_RUNTIME_MARKER" "$AUDIT_RUNTIME_JSON" >/dev/null
grep -F '"final_seal_only": true' "$SEAL_JSON" >/dev/null
grep -F '"audit_rollup_only": true' "$AUDIT_JSON" >/dev/null
grep -F '"browser_visible": true' "$AUDIT_HTML_JSON" >/dev/null
grep -F '"runtime_visibility_only": true' "$AUDIT_RUNTIME_JSON" >/dev/null
echo "source_chain_green=true"

echo "== html source =="
test -f "$CARD_HTML"
grep -F "$MARKER" "$CARD_HTML" >/dev/null
grep -F "Audit rollup JSON is present." "$CARD_HTML" >/dev/null
grep -F "Final seal JSON is present." "$CARD_HTML" >/dev/null
grep -F "No public validator submit." "$CARD_HTML" >/dev/null
grep -F "No active validator admission." "$CARD_HTML" >/dev/null
grep -F "Boundary: static public audit final-seal discovery only." "$CARD_HTML" >/dev/null
echo "html_source_green=true"

echo "== html card binding =="
python3 - <<'PYCHECK'
import json
from pathlib import Path

brick = "mainnet0-validator-public-visibility-root-to-reviewer-chain-audit-final-seal-html-card-hold-v1"
marker = "VOID_MAINNET0_VALIDATOR_PUBLIC_VISIBILITY_ROOT_TO_REVIEWER_CHAIN_AUDIT_FINAL_SEAL_HTML_CARD_HOLD_V1"

seal_brick = "mainnet0-validator-public-visibility-root-to-reviewer-chain-audit-final-seal-hold-v1"
seal_marker = "VOID_MAINNET0_VALIDATOR_PUBLIC_VISIBILITY_ROOT_TO_REVIEWER_CHAIN_AUDIT_FINAL_SEAL_HOLD_V1"

audit_brick = "mainnet0-validator-public-visibility-root-to-reviewer-chain-audit-rollup-hold-v1"
audit_marker = "VOID_MAINNET0_VALIDATOR_PUBLIC_VISIBILITY_ROOT_TO_REVIEWER_CHAIN_AUDIT_ROLLUP_HOLD_V1"

audit_html_brick = "mainnet0-validator-public-visibility-root-to-reviewer-chain-audit-rollup-html-card-hold-v1"
audit_html_marker = "VOID_MAINNET0_VALIDATOR_PUBLIC_VISIBILITY_ROOT_TO_REVIEWER_CHAIN_AUDIT_ROLLUP_HTML_CARD_HOLD_V1"

audit_runtime_brick = "mainnet0-validator-public-visibility-root-to-reviewer-chain-audit-rollup-html-runtime-visibility-hold-v1"
audit_runtime_marker = "VOID_MAINNET0_VALIDATOR_PUBLIC_VISIBILITY_ROOT_TO_REVIEWER_CHAIN_AUDIT_ROLLUP_HTML_RUNTIME_VISIBILITY_HOLD_V1"

section = json.loads(Path("public/public-node/validators/index.json").read_text())
card = json.loads(Path(f"public/public-node/validators/{brick}.json").read_text())
seal = json.loads(Path(f"public/public-node/validators/{seal_brick}.json").read_text())
audit = json.loads(Path(f"public/public-node/validators/{audit_brick}.json").read_text())
audit_html = json.loads(Path(f"public/public-node/validators/{audit_html_brick}.json").read_text())
audit_runtime = json.loads(Path(f"public/public-node/validators/{audit_runtime_brick}.json").read_text())

card_route = f"/public-node/validators/{brick}.html"
card_json_route = f"/public-node/validators/{brick}.json"
seal_route = f"/public-node/validators/{seal_brick}.json"
audit_route = f"/public-node/validators/{audit_brick}.json"
audit_html_route = f"/public-node/validators/{audit_html_brick}.html"
audit_html_json_route = f"/public-node/validators/{audit_html_brick}.json"
audit_runtime_route = f"/public-node/validators/{audit_runtime_brick}.json"

matches = [r for r in section.get("routes", []) if r.get("route") == card_route]
assert len(matches) == 1, matches
route = matches[0]

assert route["marker"] == marker
assert route["json_route"] == card_json_route
assert route["source_final_seal_route"] == seal_route
assert route["source_audit_rollup_route"] == audit_route
assert route["source_audit_html_card_route"] == audit_html_route
assert route["source_audit_html_runtime_visibility_route"] == audit_runtime_route
assert route["public_safe"] is True
assert route["read_only"] is True
assert route["browser_visible"] is True
assert route["static_html_only"] is True

assert card["marker"] == marker
assert card["route"] == card_route
assert card["json_route"] == card_json_route
assert card["source_final_seal_route"] == seal_route
assert card["source_final_seal_marker"] == seal_marker
assert card["source_audit_rollup_route"] == audit_route
assert card["source_audit_rollup_marker"] == audit_marker
assert card["source_audit_html_card_route"] == audit_html_route
assert card["source_audit_html_card_json_route"] == audit_html_json_route
assert card["source_audit_html_card_marker"] == audit_html_marker
assert card["source_audit_html_runtime_visibility_route"] == audit_runtime_route
assert card["source_audit_html_runtime_visibility_marker"] == audit_runtime_marker
assert card["public_safe"] is True
assert card["read_only"] is True
assert card["browser_visible"] is True
assert card["static_html_only"] is True

assert seal["marker"] == seal_marker
assert seal["final_seal_only"] is True
assert audit["marker"] == audit_marker
assert audit["audit_rollup_only"] is True
assert audit_html["marker"] == audit_html_marker
assert audit_html["browser_visible"] is True
assert audit_runtime["marker"] == audit_runtime_marker
assert audit_runtime["runtime_visibility_only"] is True

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

for flag in [
    "public_submit_enabled",
    "stake_lock_enabled",
    "candidate_registration_enabled",
    "active_admission_enabled",
    "runtime_mutation_route_enabled",
    "mutation_handler_enabled",
]:
    assert route[flag] is False, flag

print("validator_public_visibility_root_to_reviewer_chain_audit_final_seal_html_card_binding_green=true")
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
    Path("public/public-node/validators/mainnet0-validator-public-visibility-root-to-reviewer-chain-audit-final-seal-html-card-hold-v1.json"),
    Path("public/public-node/validators/mainnet0-validator-public-visibility-root-to-reviewer-chain-audit-final-seal-html-card-hold-v1.html"),
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
