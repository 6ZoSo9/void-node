#!/usr/bin/env bash
set -euo pipefail
python3 - <<'PYPROOF'
from pathlib import Path
import json

marker = "VOID_MAINNET0_VALIDATOR_CANDIDATE_READINESS_MATRIX_HOLD_V1"
source_anchor_marker = "VOID_MAINNET0_VALIDATOR_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_CLOSEOUT_DISCOVERY_CLOSEOUT_ROOT_LINK_FINAL_SEAL_HOLD_V1"
source_anchor_root_key = "mainnet0_validator_root_to_reviewer_audit_final_seal_entrypoint_closeout_discovery_closeout_root_link_final_seal"
section_key = "mainnet0_validator_candidate_readiness_matrix"

root_index_path = Path("public/public-node/index.json")
validators_index_path = Path("public/public-node/validators/index.json")
record_path = Path("public/public-node/validators/mainnet0-validator-candidate-readiness-matrix-hold-v1.json")
source_anchor_path = Path("public/public-node/mainnet0-validator-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-closeout-root-link-final-seal-hold-v1.json")
doc_path = Path("docs/public-node/validators/mainnet0-validator-candidate-readiness-matrix-hold-v1.md")
proof_path = Path("ops/mainnet0/void-mainnet0-validator-candidate-readiness-matrix-hold-v1-proof.sh")

route = "/public-node/validators/mainnet0-validator-candidate-readiness-matrix-hold-v1.json"
source_anchor_route = "/public-node/mainnet0-validator-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-closeout-root-link-final-seal-hold-v1.json"

def load_json(path):
    return json.loads(path.read_text())

def ensure(cond, msg):
    if not cond:
        raise SystemExit(msg)

print("== JSON parse ==")
root_index = load_json(root_index_path)
validators_index = load_json(validators_index_path)
record = load_json(record_path)
source_anchor = load_json(source_anchor_path)
print("json_green=true")

print("== source previous lane binding ==")
ensure(source_anchor_marker in source_anchor_path.read_text(), "source anchor marker missing")
ensure(source_anchor.get("marker") == source_anchor_marker, "source anchor marker mismatch")
ensure(source_anchor.get("route") == source_anchor_route, "source anchor route mismatch")
ensure(root_index.get(source_anchor_root_key, {}).get("marker") == source_anchor_marker, "root index source anchor marker mismatch")
ensure(root_index[source_anchor_root_key].get("route") == source_anchor_route, "root index source anchor route mismatch")
print("source_previous_lane_binding_green=true")

print("== candidate readiness matrix binding ==")
ensure(validators_index.get(section_key, {}).get("marker") == marker, "validators index marker mismatch")
ensure(validators_index[section_key].get("route") == route, "validators index route mismatch")
ensure(validators_index[section_key].get("minimum_public_candidate_stake_policy_void") == 10000, "validators index stake policy mismatch")
ensure(validators_index[section_key].get("matrix_item_count") == 8, "validators index matrix count mismatch")

ensure(record.get("marker") == marker, "record marker mismatch")
ensure(record.get("route") == route, "record route mismatch")
ensure(record.get("source_previous_lane_root_final_seal_route") == source_anchor_route, "record source anchor route mismatch")
ensure(record.get("source_previous_lane_root_final_seal_marker") == source_anchor_marker, "record source anchor marker mismatch")

readiness = record.get("candidate_readiness", {})
ensure(readiness.get("minimum_public_candidate_stake_policy_void") == 10000, "stake policy mismatch")
ensure(readiness.get("matrix_item_count") == 8, "matrix item count mismatch")
ensure(len(readiness.get("matrix_items", [])) == 8, "matrix items length mismatch")

for key in [
    "candidate_registration_open",
    "candidate_intake_open",
    "public_submit_enabled",
    "wallet_connect_enabled",
    "stake_lock_enabled",
    "active_validator_admission_enabled",
    "validator_set_write_enabled",
]:
    ensure(readiness.get(key) is False, f"readiness {key} must be false")

assertions = record.get("readiness_assertions", {})
ensure(assertions.get("matrix_present") is True, "matrix assertion missing")
ensure(assertions.get("source_previous_lane_final_seal_present") is True, "source assertion missing")
ensure(assertions.get("public_safe_read_only") is True, "public safe assertion missing")
for key in [
    "candidate_registration_open",
    "candidate_intake_open",
    "public_submit_enabled",
    "wallet_connect_enabled",
    "stake_lock_enabled",
    "active_validator_admission_enabled",
    "validator_set_write_enabled",
]:
    ensure(assertions.get(key) is False, f"assertion {key} must be false")
print("validator_candidate_readiness_matrix_binding_green=true")

print("== marker presence ==")
for path in [validators_index_path, record_path, doc_path, proof_path]:
    ensure(marker in path.read_text(), f"marker missing from {path}")
print("marker_green=true")

print("== forbidden enablement boundary ==")
boundary = record.get("boundary", {})
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
]
for path in [validators_index_path, record_path, doc_path]:
    text = path.read_text().lower()
    for needle in bad_needles:
        ensure(needle not in text, f"forbidden enablement {needle} in {path}")
print("forbidden_enablement_scan_green=true")

print("== result ==")
print("VOID_MAINNET0_VALIDATOR_CANDIDATE_READINESS_MATRIX_HOLD_V1_GREEN")
PYPROOF
