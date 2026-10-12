#!/usr/bin/env bash
set -euo pipefail

BRICK="mainnet0-validator-candidate-public-visibility-reviewer-final-seal-hold-v1"
MARKER="VOID_MAINNET0_VALIDATOR_CANDIDATE_PUBLIC_VISIBILITY_REVIEWER_FINAL_SEAL_HOLD_V1"

INDEX_BRICK="mainnet0-validator-candidate-public-visibility-index-hold-v1"
INDEX_MARKER="VOID_MAINNET0_VALIDATOR_CANDIDATE_PUBLIC_VISIBILITY_INDEX_HOLD_V1"

HTML_BRICK="mainnet0-validator-candidate-public-visibility-html-card-hold-v1"
HTML_MARKER="VOID_MAINNET0_VALIDATOR_CANDIDATE_PUBLIC_VISIBILITY_HTML_CARD_HOLD_V1"

HTML_RUNTIME_BRICK="mainnet0-validator-candidate-public-visibility-html-card-runtime-visibility-hold-v1"
HTML_RUNTIME_MARKER="VOID_MAINNET0_VALIDATOR_CANDIDATE_PUBLIC_VISIBILITY_HTML_CARD_RUNTIME_VISIBILITY_HOLD_V1"

CLOSEOUT_BRICK="mainnet0-validator-candidate-public-visibility-closeout-rollup-hold-v1"
CLOSEOUT_MARKER="VOID_MAINNET0_VALIDATOR_CANDIDATE_PUBLIC_VISIBILITY_CLOSEOUT_ROLLUP_HOLD_V1"

CLOSEOUT_HTML_BRICK="mainnet0-validator-candidate-public-visibility-closeout-rollup-html-card-hold-v1"
CLOSEOUT_HTML_MARKER="VOID_MAINNET0_VALIDATOR_CANDIDATE_PUBLIC_VISIBILITY_CLOSEOUT_ROLLUP_HTML_CARD_HOLD_V1"

CLOSEOUT_HTML_RUNTIME_BRICK="mainnet0-validator-candidate-public-visibility-closeout-rollup-html-card-runtime-visibility-hold-v1"
CLOSEOUT_HTML_RUNTIME_MARKER="VOID_MAINNET0_VALIDATOR_CANDIDATE_PUBLIC_VISIBILITY_CLOSEOUT_ROLLUP_HTML_CARD_RUNTIME_VISIBILITY_HOLD_V1"

ROOT_INDEX="public/public-node/index.json"
SECTION_INDEX="public/public-node/validators/index.json"
SEAL_JSON="public/public-node/validators/${BRICK}.json"
INDEX_JSON="public/public-node/validators/${INDEX_BRICK}.json"
HTML_CARD="public/public-node/validators/${HTML_BRICK}.html"
HTML_JSON="public/public-node/validators/${HTML_BRICK}.json"
HTML_RUNTIME_JSON="public/public-node/validators/${HTML_RUNTIME_BRICK}.json"
CLOSEOUT_JSON="public/public-node/validators/${CLOSEOUT_BRICK}.json"
CLOSEOUT_HTML_CARD="public/public-node/validators/${CLOSEOUT_HTML_BRICK}.html"
CLOSEOUT_HTML_JSON="public/public-node/validators/${CLOSEOUT_HTML_BRICK}.json"
CLOSEOUT_HTML_RUNTIME_JSON="public/public-node/validators/${CLOSEOUT_HTML_RUNTIME_BRICK}.json"
DOC="docs/public-node/validators/${BRICK}.md"

echo "== JSON parse =="
python3 -m json.tool "$ROOT_INDEX" >/dev/null
python3 -m json.tool "$SECTION_INDEX" >/dev/null
python3 -m json.tool "$SEAL_JSON" >/dev/null
python3 -m json.tool "$INDEX_JSON" >/dev/null
python3 -m json.tool "$HTML_JSON" >/dev/null
python3 -m json.tool "$HTML_RUNTIME_JSON" >/dev/null
python3 -m json.tool "$CLOSEOUT_JSON" >/dev/null
python3 -m json.tool "$CLOSEOUT_HTML_JSON" >/dev/null
python3 -m json.tool "$CLOSEOUT_HTML_RUNTIME_JSON" >/dev/null
echo "json_green=true"

echo "== source chain presence =="
grep -F "$INDEX_MARKER" "$INDEX_JSON" >/dev/null
grep -F "$HTML_MARKER" "$HTML_CARD" >/dev/null
grep -F "$HTML_MARKER" "$HTML_JSON" >/dev/null
grep -F "$HTML_RUNTIME_MARKER" "$HTML_RUNTIME_JSON" >/dev/null
grep -F "$CLOSEOUT_MARKER" "$CLOSEOUT_JSON" >/dev/null
grep -F "$CLOSEOUT_HTML_MARKER" "$CLOSEOUT_HTML_CARD" >/dev/null
grep -F "$CLOSEOUT_HTML_MARKER" "$CLOSEOUT_HTML_JSON" >/dev/null
grep -F "$CLOSEOUT_HTML_RUNTIME_MARKER" "$CLOSEOUT_HTML_RUNTIME_JSON" >/dev/null
grep -F "No public validator submit." "$HTML_CARD" >/dev/null
grep -F "No public validator submit." "$CLOSEOUT_HTML_CARD" >/dev/null
grep -F '"closeout_rollup_only": true' "$CLOSEOUT_JSON" >/dev/null
grep -F '"runtime_visibility_only": true' "$CLOSEOUT_HTML_RUNTIME_JSON" >/dev/null
echo "source_chain_green=true"

echo "== reviewer final seal binding =="
python3 - <<'PYCHECK'
import json
from pathlib import Path

brick = "mainnet0-validator-candidate-public-visibility-reviewer-final-seal-hold-v1"
marker = "VOID_MAINNET0_VALIDATOR_CANDIDATE_PUBLIC_VISIBILITY_REVIEWER_FINAL_SEAL_HOLD_V1"

sources_expected = {
    ("/public-node/validators/mainnet0-validator-candidate-public-visibility-index-hold-v1.json", "VOID_MAINNET0_VALIDATOR_CANDIDATE_PUBLIC_VISIBILITY_INDEX_HOLD_V1"),
    ("/public-node/validators/mainnet0-validator-candidate-public-visibility-html-card-hold-v1.html", "VOID_MAINNET0_VALIDATOR_CANDIDATE_PUBLIC_VISIBILITY_HTML_CARD_HOLD_V1"),
    ("/public-node/validators/mainnet0-validator-candidate-public-visibility-html-card-runtime-visibility-hold-v1.json", "VOID_MAINNET0_VALIDATOR_CANDIDATE_PUBLIC_VISIBILITY_HTML_CARD_RUNTIME_VISIBILITY_HOLD_V1"),
    ("/public-node/validators/mainnet0-validator-candidate-public-visibility-closeout-rollup-hold-v1.json", "VOID_MAINNET0_VALIDATOR_CANDIDATE_PUBLIC_VISIBILITY_CLOSEOUT_ROLLUP_HOLD_V1"),
    ("/public-node/validators/mainnet0-validator-candidate-public-visibility-closeout-rollup-html-card-hold-v1.html", "VOID_MAINNET0_VALIDATOR_CANDIDATE_PUBLIC_VISIBILITY_CLOSEOUT_ROLLUP_HTML_CARD_HOLD_V1"),
    ("/public-node/validators/mainnet0-validator-candidate-public-visibility-closeout-rollup-html-card-runtime-visibility-hold-v1.json", "VOID_MAINNET0_VALIDATOR_CANDIDATE_PUBLIC_VISIBILITY_CLOSEOUT_ROLLUP_HTML_CARD_RUNTIME_VISIBILITY_HOLD_V1"),
}

root = json.loads(Path("public/public-node/index.json").read_text())
section = json.loads(Path("public/public-node/validators/index.json").read_text())
seal = json.loads(Path(f"public/public-node/validators/{brick}.json").read_text())

section_route = "/public-node/validators/index.json"
seal_route = f"/public-node/validators/{brick}.json"

root_matches = [r for r in root.get("routes", []) if r.get("route") == section_route]
assert len(root_matches) == 1, root_matches
assert root_matches[0]["public_safe"] is True
assert root_matches[0]["read_only"] is True

section_matches = [r for r in section.get("routes", []) if r.get("route") == seal_route]
assert len(section_matches) == 1, section_matches
route = section_matches[0]

assert route["marker"] == marker
assert route["public_safe"] is True
assert route["read_only"] is True
assert route["reviewer_final_seal_only"] is True
assert route["static_index_only"] is True

assert seal["marker"] == marker
assert seal["route"] == seal_route
assert seal["section_index_route"] == section_route
assert seal["public_safe"] is True
assert seal["read_only"] is True
assert seal["reviewer_final_seal_only"] is True
assert seal["static_index_only"] is True

sources = {(s["route"], s["marker"]) for s in seal["source_records"]}
assert sources_expected <= sources, sources

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

print("validator_candidate_public_visibility_reviewer_final_seal_binding_green=true")
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
    Path("public/public-node/validators/mainnet0-validator-candidate-public-visibility-reviewer-final-seal-hold-v1.json"),
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
