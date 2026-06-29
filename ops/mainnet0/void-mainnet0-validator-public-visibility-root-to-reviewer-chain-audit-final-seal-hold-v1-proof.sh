#!/usr/bin/env bash
set -euo pipefail

BRICK="mainnet0-validator-public-visibility-root-to-reviewer-chain-audit-final-seal-hold-v1"
MARKER="VOID_MAINNET0_VALIDATOR_PUBLIC_VISIBILITY_ROOT_TO_REVIEWER_CHAIN_AUDIT_FINAL_SEAL_HOLD_V1"
AUDIT_BRICK="mainnet0-validator-public-visibility-root-to-reviewer-chain-audit-rollup-hold-v1"
AUDIT_MARKER="VOID_MAINNET0_VALIDATOR_PUBLIC_VISIBILITY_ROOT_TO_REVIEWER_CHAIN_AUDIT_ROLLUP_HOLD_V1"
HTML_BRICK="mainnet0-validator-public-visibility-root-to-reviewer-chain-audit-rollup-html-card-hold-v1"
HTML_MARKER="VOID_MAINNET0_VALIDATOR_PUBLIC_VISIBILITY_ROOT_TO_REVIEWER_CHAIN_AUDIT_ROLLUP_HTML_CARD_HOLD_V1"
RUNTIME_BRICK="mainnet0-validator-public-visibility-root-to-reviewer-chain-audit-rollup-html-runtime-visibility-hold-v1"
RUNTIME_MARKER="VOID_MAINNET0_VALIDATOR_PUBLIC_VISIBILITY_ROOT_TO_REVIEWER_CHAIN_AUDIT_ROLLUP_HTML_RUNTIME_VISIBILITY_HOLD_V1"

SECTION_INDEX="public/public-node/validators/index.json"
SEAL_JSON="public/public-node/validators/${BRICK}.json"
AUDIT_JSON="public/public-node/validators/${AUDIT_BRICK}.json"
HTML_JSON="public/public-node/validators/${HTML_BRICK}.json"
HTML_CARD="public/public-node/validators/${HTML_BRICK}.html"
RUNTIME_JSON="public/public-node/validators/${RUNTIME_BRICK}.json"
DOC="docs/public-node/validators/${BRICK}.md"

echo "== JSON parse =="
python3 -m json.tool "$SECTION_INDEX" >/dev/null
python3 -m json.tool "$SEAL_JSON" >/dev/null
python3 -m json.tool "$AUDIT_JSON" >/dev/null
python3 -m json.tool "$HTML_JSON" >/dev/null
python3 -m json.tool "$RUNTIME_JSON" >/dev/null
echo "json_green=true"

echo "== source chain presence =="
grep -F "$AUDIT_MARKER" "$AUDIT_JSON" >/dev/null
grep -F "$HTML_MARKER" "$HTML_JSON" >/dev/null
grep -F "$HTML_MARKER" "$HTML_CARD" >/dev/null
grep -F "$RUNTIME_MARKER" "$RUNTIME_JSON" >/dev/null
grep -F '"audit_rollup_only": true' "$AUDIT_JSON" >/dev/null
grep -F '"browser_visible": true' "$HTML_JSON" >/dev/null
grep -F '"runtime_visibility_only": true' "$RUNTIME_JSON" >/dev/null
echo "source_chain_green=true"

echo "== final seal binding =="
python3 - <<'PYCHECK'
import json
from pathlib import Path

brick = "mainnet0-validator-public-visibility-root-to-reviewer-chain-audit-final-seal-hold-v1"
marker = "VOID_MAINNET0_VALIDATOR_PUBLIC_VISIBILITY_ROOT_TO_REVIEWER_CHAIN_AUDIT_FINAL_SEAL_HOLD_V1"

audit_brick = "mainnet0-validator-public-visibility-root-to-reviewer-chain-audit-rollup-hold-v1"
audit_marker = "VOID_MAINNET0_VALIDATOR_PUBLIC_VISIBILITY_ROOT_TO_REVIEWER_CHAIN_AUDIT_ROLLUP_HOLD_V1"

html_brick = "mainnet0-validator-public-visibility-root-to-reviewer-chain-audit-rollup-html-card-hold-v1"
html_marker = "VOID_MAINNET0_VALIDATOR_PUBLIC_VISIBILITY_ROOT_TO_REVIEWER_CHAIN_AUDIT_ROLLUP_HTML_CARD_HOLD_V1"

runtime_brick = "mainnet0-validator-public-visibility-root-to-reviewer-chain-audit-rollup-html-runtime-visibility-hold-v1"
runtime_marker = "VOID_MAINNET0_VALIDATOR_PUBLIC_VISIBILITY_ROOT_TO_REVIEWER_CHAIN_AUDIT_ROLLUP_HTML_RUNTIME_VISIBILITY_HOLD_V1"

section = json.loads(Path("public/public-node/validators/index.json").read_text())
seal = json.loads(Path(f"public/public-node/validators/{brick}.json").read_text())
audit = json.loads(Path(f"public/public-node/validators/{audit_brick}.json").read_text())
html_card = json.loads(Path(f"public/public-node/validators/{html_brick}.json").read_text())
runtime = json.loads(Path(f"public/public-node/validators/{runtime_brick}.json").read_text())

seal_route = f"/public-node/validators/{brick}.json"
audit_route = f"/public-node/validators/{audit_brick}.json"
html_route = f"/public-node/validators/{html_brick}.html"
html_json_route = f"/public-node/validators/{html_brick}.json"
runtime_route = f"/public-node/validators/{runtime_brick}.json"

matches = [r for r in section.get("routes", []) if r.get("route") == seal_route]
assert len(matches) == 1, matches
route = matches[0]

assert route["marker"] == marker
assert route["source_audit_rollup_route"] == audit_route
assert route["source_html_card_route"] == html_route
assert route["source_html_runtime_visibility_route"] == runtime_route
assert route["public_safe"] is True
assert route["read_only"] is True
assert route["final_seal_only"] is True
assert route["static_index_only"] is True

assert seal["marker"] == marker
assert seal["route"] == seal_route
assert seal["source_audit_rollup_route"] == audit_route
assert seal["source_audit_rollup_marker"] == audit_marker
assert seal["source_html_card_route"] == html_route
assert seal["source_html_card_json_route"] == html_json_route
assert seal["source_html_card_marker"] == html_marker
assert seal["source_html_runtime_visibility_route"] == runtime_route
assert seal["source_html_runtime_visibility_marker"] == runtime_marker
assert seal["public_safe"] is True
assert seal["read_only"] is True
assert seal["final_seal_only"] is True
assert seal["static_index_only"] is True

assert audit["marker"] == audit_marker
assert audit["audit_rollup_only"] is True
assert html_card["marker"] == html_marker
assert html_card["browser_visible"] is True
assert html_card["static_html_only"] is True
assert runtime["marker"] == runtime_marker
assert runtime["runtime_visibility_only"] is True

expected = {
    (audit_route, audit_marker),
    (html_route, html_marker),
    (runtime_route, runtime_marker),
}
observed = {(r["route"], r["marker"]) for r in seal["sealed_chain"]}
assert expected <= observed, expected - observed

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
    assert seal["public_surface"][flag] is False, flag

for flag in [
    "public_submit_enabled",
    "stake_lock_enabled",
    "candidate_registration_enabled",
    "active_admission_enabled",
    "runtime_mutation_route_enabled",
    "mutation_handler_enabled",
]:
    assert route[flag] is False, flag

print("validator_public_visibility_root_to_reviewer_chain_audit_final_seal_binding_green=true")
PYCHECK

echo "== marker presence =="
grep -F "$MARKER" "$SECTION_INDEX" >/dev/null
grep -F "$MARKER" "$SEAL_JSON" >/dev/null
grep -F "$MARKER" "$DOC" >/dev/null
grep -F "$MARKER" "$0" >/dev/null
echo "marker_green=true"

echo "== forbidden enablement boundary =="
python3 - <<'PYCHECK'
from pathlib import Path

paths = [
    Path("public/public-node/validators/index.json"),
    Path("public/public-node/validators/mainnet0-validator-public-visibility-root-to-reviewer-chain-audit-final-seal-hold-v1.json"),
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
