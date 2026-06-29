#!/usr/bin/env bash
set -euo pipefail
python3 - <<'PYPROOF'
from pathlib import Path
import json

marker = "VOID_MAINNET0_VALIDATOR_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_CLOSEOUT_DISCOVERY_CLOSEOUT_ROOT_LINK_FINAL_SEAL_HOLD_V1"
root_link_marker = "VOID_MAINNET0_VALIDATOR_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_CLOSEOUT_DISCOVERY_CLOSEOUT_AUDIT_ROLLUP_ROOT_LINK_HOLD_V1"
audit_marker = "VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_CLOSEOUT_DISCOVERY_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1"
root_key = "mainnet0_validator_root_to_reviewer_audit_final_seal_entrypoint_closeout_discovery_closeout_root_link_final_seal"
root_link_key = "mainnet0_validator_root_to_reviewer_audit_final_seal_entrypoint_closeout_discovery_closeout_audit_rollup_root_link"
audit_section_key = "mainnet0_validator_root_to_reviewer_audit_final_seal_entrypoint_closeout_discovery_closeout_audit_rollup"

root_index_path = Path("public/public-node/index.json")
validators_index_path = Path("public/public-node/validators/index.json")
record_path = Path("public/public-node/mainnet0-validator-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-closeout-root-link-final-seal-hold-v1.json")
root_link_path = Path("public/public-node/mainnet0-validator-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-closeout-audit-rollup-root-link-hold-v1.json")
audit_path = Path("public/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-closeout-audit-rollup-hold-v1.json")
doc_path = Path("docs/public-node/validators/mainnet0-validator-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-closeout-root-link-final-seal-hold-v1.md")
proof_path = Path("ops/mainnet0/void-mainnet0-validator-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-closeout-root-link-final-seal-hold-v1-proof.sh")

route = "/public-node/mainnet0-validator-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-closeout-root-link-final-seal-hold-v1.json"
root_link_route = "/public-node/mainnet0-validator-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-closeout-audit-rollup-root-link-hold-v1.json"
audit_route = "/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-closeout-audit-rollup-hold-v1.json"

def load_json(path):
    return json.loads(path.read_text())

def ensure(cond, msg):
    if not cond:
        raise SystemExit(msg)

print("== JSON parse ==")
root_index = load_json(root_index_path)
validators_index = load_json(validators_index_path)
record = load_json(record_path)
root_link = load_json(root_link_path)
audit = load_json(audit_path)
print("json_green=true")

print("== source chain binding ==")
ensure(root_link_marker in root_link_path.read_text(), "root link marker missing")
ensure(audit_marker in audit_path.read_text(), "audit marker missing")
ensure(root_link.get("marker") == root_link_marker, "root link marker mismatch")
ensure(root_link.get("route") == root_link_route, "root link route mismatch")
ensure(root_link.get("source_audit_rollup_route") == audit_route, "root link audit route mismatch")
ensure(root_link.get("source_audit_rollup_marker") == audit_marker, "root link audit marker mismatch")
ensure(root_link.get("source_record_count") == 11, "root link source count mismatch")
ensure(audit.get("marker") == audit_marker, "audit marker mismatch")
ensure(audit.get("route") == audit_route, "audit route mismatch")
ensure(audit.get("source_record_count") == 11, "audit source count mismatch")
ensure(root_index.get(root_link_key, {}).get("marker") == root_link_marker, "root index root-link marker mismatch")
ensure(root_index[root_link_key].get("route") == root_link_route, "root index root-link route mismatch")
ensure(validators_index.get(audit_section_key, {}).get("marker") == audit_marker, "validators index audit marker mismatch")
ensure(validators_index[audit_section_key].get("route") == audit_route, "validators index audit route mismatch")
print("source_chain_binding_green=true")

print("== final seal binding ==")
preferred = audit.get("preferred_browser_visible_reviewer_route")
latest_runtime = audit.get("latest_runtime_visibility_route")
ensure(root_link.get("preferred_browser_visible_reviewer_route") == preferred, "root link preferred route mismatch")
ensure(root_link.get("latest_runtime_visibility_route") == latest_runtime, "root link latest runtime mismatch")

ensure(root_index.get(root_key, {}).get("marker") == marker, "root final seal marker mismatch")
ensure(root_index[root_key].get("route") == route, "root final seal route mismatch")
ensure(root_index[root_key].get("source_root_link_route") == root_link_route, "root final seal source root-link mismatch")
ensure(root_index[root_key].get("source_audit_rollup_route") == audit_route, "root final seal source audit mismatch")
ensure(root_index[root_key].get("source_record_count") == 11, "root final seal source count mismatch")
ensure(root_index[root_key].get("preferred_browser_visible_reviewer_route") == preferred, "root final seal preferred route mismatch")
ensure(root_index[root_key].get("latest_runtime_visibility_route") == latest_runtime, "root final seal latest runtime mismatch")

ensure(record.get("marker") == marker, "record marker mismatch")
ensure(record.get("route") == route, "record route mismatch")
ensure(record.get("source_root_link_route") == root_link_route, "record root-link route mismatch")
ensure(record.get("source_root_link_marker") == root_link_marker, "record root-link marker mismatch")
ensure(record.get("source_audit_rollup_route") == audit_route, "record audit route mismatch")
ensure(record.get("source_audit_rollup_marker") == audit_marker, "record audit marker mismatch")
ensure(record.get("source_record_count") == 11, "record source count mismatch")
ensure(record.get("preferred_browser_visible_reviewer_route") == preferred, "record preferred route mismatch")
ensure(record.get("latest_runtime_visibility_route") == latest_runtime, "record latest runtime mismatch")

assertions = record.get("final_seal_assertions", {})
for key in [
    "root_link_present",
    "root_link_indexed_from_public_node_root",
    "source_audit_rollup_present",
    "source_audit_rollup_indexed_from_validators_index",
    "source_record_count_verified",
    "preferred_browser_visible_reviewer_route_consistent",
    "latest_runtime_visibility_route_consistent",
    "public_safe_read_only",
]:
    ensure(assertions.get(key) is True, f"assertion {key} must be true")
ensure(assertions.get("runtime_mutation_enabled") is False, "runtime mutation must remain false")
print("validator_public_node_root_to_reviewer_audit_final_seal_entrypoint_closeout_discovery_closeout_root_link_final_seal_binding_green=true")

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
print("VOID_MAINNET0_VALIDATOR_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_CLOSEOUT_DISCOVERY_CLOSEOUT_ROOT_LINK_FINAL_SEAL_HOLD_V1_GREEN")
PYPROOF
