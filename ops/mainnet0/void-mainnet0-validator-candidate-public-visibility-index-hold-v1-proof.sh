#!/usr/bin/env bash
set -euo pipefail

BRICK="mainnet0-validator-candidate-public-visibility-index-hold-v1"
MARKER="VOID_MAINNET0_VALIDATOR_CANDIDATE_PUBLIC_VISIBILITY_INDEX_HOLD_V1"

ROOT_INDEX="public/public-node/index.json"
SECTION_INDEX="public/public-node/validators/index.json"
CARD="public/public-node/validators/${BRICK}.json"
DOC="docs/public-node/validators/${BRICK}.md"

WAITING_POOL_DOC="docs/mainnet0/validator-registration-waiting-pool-v1.md"
POLICY_DOC="docs/mainnet0/VALIDATOR_POLICY.md"
ADMISSION_RUNBOOK="docs/MAINNET0_VALIDATOR_ADMISSION_RUNBOOK.md"
ADMISSION_CHECKLIST="docs/MAINNET0_VALIDATOR_ADMISSION_CHECKLIST.md"
STATUS_TEMPLATE="docs/MAINNET0_VALIDATOR_STATUS_RECORD_TEMPLATE.md"

echo "== JSON parse =="
python3 -m json.tool "$ROOT_INDEX" >/dev/null
python3 -m json.tool "$SECTION_INDEX" >/dev/null
python3 -m json.tool "$CARD" >/dev/null
echo "json_green=true"

echo "== source policy presence =="
test -f "$WAITING_POOL_DOC"
test -f "$POLICY_DOC"
test -f "$ADMISSION_RUNBOOK"
test -f "$ADMISSION_CHECKLIST"
test -f "$STATUS_TEMPLATE"
grep -F "Public validator registration does not equal active validator admission." "$WAITING_POOL_DOC" >/dev/null
grep -F "Minimum validator self-stake: **10,000 VOID**" "$POLICY_DOC" >/dev/null
grep -F "activeValidatorCountAfter == activeValidatorCountBefore" "$WAITING_POOL_DOC" >/dev/null
grep -F "validator_id" "$STATUS_TEMPLATE" >/dev/null
echo "source_policy_green=true"

echo "== public visibility binding =="
python3 - <<'PYCHECK'
import json
from pathlib import Path

brick = "mainnet0-validator-candidate-public-visibility-index-hold-v1"
marker = "VOID_MAINNET0_VALIDATOR_CANDIDATE_PUBLIC_VISIBILITY_INDEX_HOLD_V1"

root = json.loads(Path("public/public-node/index.json").read_text())
section = json.loads(Path("public/public-node/validators/index.json").read_text())
card = json.loads(Path(f"public/public-node/validators/{brick}.json").read_text())

section_route = "/public-node/validators/index.json"
card_route = f"/public-node/validators/{brick}.json"

root_matches = [r for r in root.get("routes", []) if r.get("route") == section_route]
assert len(root_matches) == 1, root_matches
root_route = root_matches[0]
assert root_route["marker"] == marker
assert root_route["public_safe"] is True
assert root_route["read_only"] is True
assert root_route["visibility_only"] is True
assert root_route["static_index_only"] is True

section_matches = [r for r in section.get("routes", []) if r.get("route") == card_route]
assert len(section_matches) == 1, section_matches
section_route_record = section_matches[0]
assert section["marker"] == marker
assert section_route_record["marker"] == marker
assert section_route_record["public_safe"] is True
assert section_route_record["read_only"] is True
assert section_route_record["visibility_only"] is True
assert section_route_record["static_index_only"] is True

assert card["marker"] == marker
assert card["route"] == card_route
assert card["public_safe"] is True
assert card["read_only"] is True
assert card["visibility_only"] is True
assert card["static_index_only"] is True
assert card["mainnet0_validator_policy"]["minimum_validator_self_stake_void"] == 10000
assert card["mainnet0_validator_policy"]["public_registration_does_not_equal_active_admission"] is True
assert card["mainnet0_validator_policy"]["active_admission_requires_explicit_epoch_activation"] is True
assert card["mainnet0_validator_policy"]["active_validator_runtime_truth_must_not_change_from_public_visibility"] is True
assert card["mainnet0_validator_policy"]["active_validator_count_after_public_registration_equals_before_unless_explicit_activation"] is True

for source in [
    "docs/mainnet0/validator-registration-waiting-pool-v1.md",
    "docs/mainnet0/VALIDATOR_POLICY.md",
    "docs/MAINNET0_VALIDATOR_ADMISSION_RUNBOOK.md",
    "docs/MAINNET0_VALIDATOR_ADMISSION_CHECKLIST.md",
    "docs/MAINNET0_VALIDATOR_STATUS_RECORD_TEMPLATE.md",
]:
    assert source in card["source_docs"], source

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

print("validator_candidate_public_visibility_binding_green=true")
PYCHECK

echo "== marker presence =="
grep -F "$MARKER" "$SECTION_INDEX" >/dev/null
grep -F "$MARKER" "$CARD" >/dev/null
grep -F "$MARKER" "$DOC" >/dev/null
grep -F "$MARKER" "$0" >/dev/null
echo "marker_green=true"

echo "== forbidden enablement boundary =="
python3 - <<'PYCHECK'
from pathlib import Path

paths = [
    Path("public/public-node/validators/index.json"),
    Path("public/public-node/validators/mainnet0-validator-candidate-public-visibility-index-hold-v1.json"),
]

for path in paths:
    text = path.read_text()
    for needle in [
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
    ]:
        assert needle not in text, (path, needle)

print("forbidden_enablement_scan_green=true")
PYCHECK

echo "== result =="
echo "${MARKER}_GREEN"
