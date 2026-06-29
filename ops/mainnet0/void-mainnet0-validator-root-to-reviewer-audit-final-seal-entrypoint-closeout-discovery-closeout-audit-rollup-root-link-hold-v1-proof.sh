#!/usr/bin/env bash
set -euo pipefail
python3 - <<'PYPROOF'
from pathlib import Path
import json

marker = "VOID_MAINNET0_VALIDATOR_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_CLOSEOUT_DISCOVERY_CLOSEOUT_AUDIT_ROLLUP_ROOT_LINK_HOLD_V1"
source_marker = "VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_CLOSEOUT_DISCOVERY_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1"
root_key = "mainnet0_validator_root_to_reviewer_audit_final_seal_entrypoint_closeout_discovery_closeout_audit_rollup_root_link"
source_section_key = "mainnet0_validator_root_to_reviewer_audit_final_seal_entrypoint_closeout_discovery_closeout_audit_rollup"

root_index_path = Path("public/public-node/index.json")
validators_index_path = Path("public/public-node/validators/index.json")
record_path = Path("public/public-node/mainnet0-validator-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-closeout-audit-rollup-root-link-hold-v1.json")
source_path = Path("public/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-closeout-audit-rollup-hold-v1.json")
doc_path = Path("docs/public-node/validators/mainnet0-validator-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-closeout-audit-rollup-root-link-hold-v1.md")
proof_path = Path("ops/mainnet0/void-mainnet0-validator-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-closeout-audit-rollup-root-link-hold-v1-proof.sh")

route = "/public-node/mainnet0-validator-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-closeout-audit-rollup-root-link-hold-v1.json"
source_route = "/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-closeout-audit-rollup-hold-v1.json"

def load_json(path):
    return json.loads(path.read_text())

def ensure(cond, msg):
    if not cond:
        raise SystemExit(msg)

print("== JSON parse ==")
root_index = load_json(root_index_path)
validators_index = load_json(validators_index_path)
record = load_json(record_path)
source = load_json(source_path)
print("json_green=true")

print("== source audit rollup binding ==")
ensure(source_marker in source_path.read_text(), "source audit rollup marker missing")
ensure(source.get("marker") == source_marker, "source marker mismatch")
ensure(source.get("route") == source_route, "source route mismatch")
ensure(source.get("source_record_count") == 11, "source record count mismatch")
ensure(source.get("audit_assertions", {}).get("all_expected_source_records_present") is True, "source record assertion missing")
ensure(source.get("audit_assertions", {}).get("all_expected_markers_present") is True, "source marker assertion missing")
ensure(source.get("audit_assertions", {}).get("runtime_mutation_enabled") is False, "source runtime mutation must remain false")
ensure(validators_index.get(source_section_key, {}).get("marker") == source_marker, "validators index source marker mismatch")
ensure(validators_index[source_section_key].get("route") == source_route, "validators index source route mismatch")
print("source_audit_rollup_binding_green=true")

print("== root link binding ==")
ensure(root_index.get(root_key, {}).get("marker") == marker, "root index marker mismatch")
ensure(root_index[root_key].get("route") == route, "root index route mismatch")
ensure(root_index[root_key].get("source_audit_rollup_route") == source_route, "root index source route mismatch")
ensure(root_index[root_key].get("source_record_count") == 11, "root index source count mismatch")
ensure(record.get("marker") == marker, "record marker mismatch")
ensure(record.get("route") == route, "record route mismatch")
ensure(record.get("source_audit_rollup_route") == source_route, "record source route mismatch")
ensure(record.get("source_audit_rollup_marker") == source_marker, "record source marker mismatch")
ensure(record.get("source_record_count") == 11, "record source count mismatch")

preferred = source.get("preferred_browser_visible_reviewer_route")
latest_runtime = source.get("latest_runtime_visibility_route")
ensure(record.get("preferred_browser_visible_reviewer_route") == preferred, "record preferred browser route mismatch")
ensure(record.get("latest_runtime_visibility_route") == latest_runtime, "record latest runtime route mismatch")
ensure(root_index[root_key].get("preferred_browser_visible_reviewer_route") == preferred, "root preferred browser route mismatch")
ensure(root_index[root_key].get("latest_runtime_visibility_route") == latest_runtime, "root latest runtime route mismatch")

assertions = record.get("root_link_assertions", {})
for key in [
    "source_audit_rollup_present",
    "source_audit_rollup_indexed_from_validators_index",
    "preferred_browser_visible_reviewer_route_present",
    "latest_runtime_visibility_route_present",
    "public_safe_read_only",
]:
    ensure(assertions.get(key) is True, f"assertion {key} must be true")
ensure(assertions.get("runtime_mutation_enabled") is False, "runtime mutation must remain false")
print("validator_public_node_root_to_reviewer_audit_final_seal_entrypoint_closeout_discovery_closeout_audit_rollup_root_link_binding_green=true")

print("== marker presence ==")
for path in [root_index_path, record_path, doc_path, proof_path]:
    ensure(marker in path.read_text(), f"marker missing from {path}")
print("marker_green=true")

print("== forbidden enablement boundary ==")
boundary = record.get("boundary", {})
for key in [
    "public_validator_submit",
    "stake_lock",
    "wallet_connect",
    "candidate_registration",
    "candidate_intake",
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
    '"stake_lock": ' + 'true',
    '"wallet_connect": ' + 'true',
    '"candidate_registration": ' + 'true',
    '"candidate_intake": ' + 'true',
    '"active_validator_admission": ' + 'true',
    '"epoch_activation": ' + 'true',
    '"validator_set_write": ' + 'true',
    '"validator_runtime_truth_write": ' + 'true',
    '"runtime_mutation_route": ' + 'true',
    '"mutation_handler": ' + 'true',
    '"runtime_mutation_enabled": ' + 'true',
]
for path in [root_index_path, record_path, doc_path]:
    text = path.read_text().lower()
    for needle in bad_needles:
        ensure(needle not in text, f"forbidden enablement {needle} in {path}")
print("forbidden_enablement_scan_green=true")

print("== result ==")
print("VOID_MAINNET0_VALIDATOR_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_CLOSEOUT_DISCOVERY_CLOSEOUT_AUDIT_ROLLUP_ROOT_LINK_HOLD_V1_GREEN")
PYPROOF
