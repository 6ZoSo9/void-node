#!/usr/bin/env bash
set -euo pipefail
python3 - <<'PYPROOF'
from pathlib import Path
import json

marker = "VOID_MAINNET0_VALIDATOR_CANDIDATE_READINESS_MATRIX_HTML_CARD_HOLD_V1"
matrix_marker = "VOID_MAINNET0_VALIDATOR_CANDIDATE_READINESS_MATRIX_HOLD_V1"
matrix_section_key = "mainnet0_validator_candidate_readiness_matrix"
section_key = "mainnet0_validator_candidate_readiness_matrix_html_card"

validators_index_path = Path("public/public-node/validators/index.json")
matrix_path = Path("public/public-node/validators/mainnet0-validator-candidate-readiness-matrix-hold-v1.json")
json_path = Path("public/public-node/validators/mainnet0-validator-candidate-readiness-matrix-html-card-hold-v1.json")
html_path = Path("public/public-node/validators/mainnet0-validator-candidate-readiness-matrix-html-card-hold-v1.html")
doc_path = Path("docs/public-node/validators/mainnet0-validator-candidate-readiness-matrix-html-card-hold-v1.md")
proof_path = Path("ops/mainnet0/void-mainnet0-validator-candidate-readiness-matrix-html-card-hold-v1-proof.sh")

html_route = "/public-node/validators/mainnet0-validator-candidate-readiness-matrix-html-card-hold-v1.html"
json_route = "/public-node/validators/mainnet0-validator-candidate-readiness-matrix-html-card-hold-v1.json"
matrix_route = "/public-node/validators/mainnet0-validator-candidate-readiness-matrix-hold-v1.json"

def load_json(path):
    return json.loads(path.read_text())

def ensure(cond, msg):
    if not cond:
        raise SystemExit(msg)

print("== JSON parse ==")
validators_index = load_json(validators_index_path)
matrix = load_json(matrix_path)
card = load_json(json_path)
print("json_green=true")

print("== source matrix binding ==")
ensure(matrix_marker in matrix_path.read_text(), "matrix marker missing")
ensure(matrix.get("marker") == matrix_marker, "matrix marker mismatch")
ensure(matrix.get("route") == matrix_route, "matrix route mismatch")
ensure(validators_index.get(matrix_section_key, {}).get("marker") == matrix_marker, "validators index matrix marker mismatch")
ensure(validators_index[matrix_section_key].get("route") == matrix_route, "validators index matrix route mismatch")
readiness = matrix.get("candidate_readiness", {})
ensure(readiness.get("minimum_public_candidate_stake_policy_void") == 10000, "stake policy mismatch")
ensure(readiness.get("matrix_item_count") == 8, "matrix count mismatch")
ensure(len(readiness.get("matrix_items", [])) == 8, "matrix item length mismatch")
for key in [
    "candidate_registration_open",
    "candidate_intake_open",
    "public_submit_enabled",
    "wallet_connect_enabled",
    "stake_lock_enabled",
    "active_validator_admission_enabled",
    "validator_set_write_enabled",
]:
    ensure(readiness.get(key) is False, f"source matrix {key} must be false")
print("source_matrix_binding_green=true")

print("== html card binding ==")
ensure(validators_index.get(section_key, {}).get("marker") == marker, "validators index card marker mismatch")
ensure(validators_index[section_key].get("route") == json_route, "validators index card json route mismatch")
ensure(validators_index[section_key].get("html_route") == html_route, "validators index card html route mismatch")
ensure(validators_index[section_key].get("source_candidate_readiness_matrix_route") == matrix_route, "validators index source matrix route mismatch")
ensure(validators_index[section_key].get("minimum_public_candidate_stake_policy_void") == 10000, "validators index stake policy mismatch")
ensure(validators_index[section_key].get("matrix_item_count") == 8, "validators index matrix count mismatch")

ensure(card.get("marker") == marker, "card marker mismatch")
ensure(card.get("route") == html_route, "card html route mismatch")
ensure(card.get("json_route") == json_route, "card json route mismatch")
ensure(card.get("source_candidate_readiness_matrix_route") == matrix_route, "card matrix route mismatch")
ensure(card.get("source_candidate_readiness_matrix_marker") == matrix_marker, "card matrix marker mismatch")
ensure(card.get("minimum_public_candidate_stake_policy_void") == 10000, "card stake policy mismatch")
ensure(card.get("matrix_item_count") == 8, "card matrix count mismatch")
ensure(card.get("preferred_browser_visible_reviewer_route") == html_route, "card preferred route mismatch")

assertions = card.get("visibility_assertions", {})
for key in [
    "source_matrix_present",
    "source_matrix_indexed_from_validators_index",
    "html_card_present",
    "matrix_item_count_verified",
    "minimum_public_candidate_stake_policy_reference_present",
    "public_safe_read_only",
]:
    ensure(assertions.get(key) is True, f"assertion {key} must be true")
for key in [
    "candidate_registration_open",
    "candidate_intake_open",
    "public_submit_enabled",
    "wallet_connect_enabled",
    "stake_lock_enabled",
    "active_validator_admission_enabled",
    "validator_set_write_enabled",
    "runtime_mutation_enabled",
]:
    ensure(assertions.get(key) is False, f"assertion {key} must be false")
print("validator_candidate_readiness_matrix_html_card_binding_green=true")

print("== html source ==")
html_text = html_path.read_text()
for needle in [marker, matrix_route, "10000 VOID", "No public validator submit", "No candidate registration or intake"]:
    ensure(needle in html_text, f"html missing {needle}")
print("html_source_green=true")

print("== marker presence ==")
for path in [validators_index_path, json_path, html_path, doc_path, proof_path]:
    ensure(marker in path.read_text(), f"marker missing from {path}")
print("marker_green=true")

print("== forbidden enablement boundary ==")
boundary = card.get("boundary", {})
for key in [
    "public_validator_submit",
    "candidate_registration_open",
    "candidate_intake",
    "stake_lock",
    "wallet_connect",
    "active_validator_admission",
    "epoch_activation",
    "validator_set_write",
    "validator_runtime_truth_write",
    "runtime_mutation_route",
    "mutation_handler",
]:
    ensure(boundary.get(key) is False, f"boundary {key} must be false")

bad_needles = [
    '"public_validator_submit": ' + 'true',
    '"candidate_registration_open": ' + 'true',
    '"candidate_intake": ' + 'true',
    '"candidate_intake_open": ' + 'true',
    '"public_submit_enabled": ' + 'true',
    '"wallet_connect": ' + 'true',
    '"wallet_connect_enabled": ' + 'true',
    '"stake_lock": ' + 'true',
    '"stake_lock_enabled": ' + 'true',
    '"active_validator_admission": ' + 'true',
    '"active_validator_admission_enabled": ' + 'true',
    '"epoch_activation": ' + 'true',
    '"validator_set_write": ' + 'true',
    '"validator_set_write_enabled": ' + 'true',
    '"validator_runtime_truth_write": ' + 'true',
    '"runtime_mutation_route": ' + 'true',
    '"mutation_handler": ' + 'true',
    '"runtime_mutation_enabled": ' + 'true',
]
for path in [validators_index_path, json_path, html_path, doc_path]:
    text = path.read_text().lower()
    for needle in bad_needles:
        ensure(needle not in text, f"forbidden enablement {needle} in {path}")
print("forbidden_enablement_scan_green=true")

print("== result ==")
print("VOID_MAINNET0_VALIDATOR_CANDIDATE_READINESS_MATRIX_HTML_CARD_HOLD_V1_GREEN")
PYPROOF
