#!/usr/bin/env bash
set -euo pipefail

python3 - <<'PYPROOF'
from pathlib import Path
import json

brick = "mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-polish-hold-v1"
marker = "VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_POLISH_HOLD_V1"
root_key = "mainnet0_validator_root_to_reviewer_audit_final_seal_entrypoint_polish"

root_index_path = Path("public/public-node/index.json")
section_index_path = Path("public/public-node/validators/index.json")
record_path = Path("public/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-polish-hold-v1.json")
doc_path = Path("docs/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-polish-hold-v1.md")
proof_path = Path("ops/mainnet0/void-mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-polish-hold-v1-proof.sh")

final_seal_path = Path("public/public-node/validators/mainnet0-validator-public-visibility-root-to-reviewer-chain-audit-final-seal-hold-v1.json")
final_html_path = Path("public/public-node/validators/mainnet0-validator-public-visibility-root-to-reviewer-chain-audit-final-seal-html-card-hold-v1.html")
final_html_json_path = Path("public/public-node/validators/mainnet0-validator-public-visibility-root-to-reviewer-chain-audit-final-seal-html-card-hold-v1.json")
final_runtime_path = Path("public/public-node/validators/mainnet0-validator-public-visibility-root-to-reviewer-chain-audit-final-seal-html-runtime-visibility-hold-v1.json")
root_runtime_path = Path("public/public-node/validators/mainnet0-validator-public-node-root-reviewer-entrypoint-runtime-visibility-hold-v1.json")
audit_rollup_path = Path("public/public-node/validators/mainnet0-validator-public-visibility-root-to-reviewer-chain-audit-rollup-hold-v1.json")

final_seal_marker = "VOID_MAINNET0_VALIDATOR_PUBLIC_VISIBILITY_ROOT_TO_REVIEWER_CHAIN_AUDIT_FINAL_SEAL_HOLD_V1"
final_html_marker = "VOID_MAINNET0_VALIDATOR_PUBLIC_VISIBILITY_ROOT_TO_REVIEWER_CHAIN_AUDIT_FINAL_SEAL_HTML_CARD_HOLD_V1"
final_runtime_marker = "VOID_MAINNET0_VALIDATOR_PUBLIC_VISIBILITY_ROOT_TO_REVIEWER_CHAIN_AUDIT_FINAL_SEAL_HTML_RUNTIME_VISIBILITY_HOLD_V1"
root_runtime_marker = "VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_REVIEWER_ENTRYPOINT_RUNTIME_VISIBILITY_HOLD_V1"
audit_rollup_marker = "VOID_MAINNET0_VALIDATOR_PUBLIC_VISIBILITY_ROOT_TO_REVIEWER_CHAIN_AUDIT_ROLLUP_HOLD_V1"

record_route = "/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-polish-hold-v1.json"
final_html_route = "/public-node/validators/mainnet0-validator-public-visibility-root-to-reviewer-chain-audit-final-seal-html-card-hold-v1.html"
final_html_json_route = "/public-node/validators/mainnet0-validator-public-visibility-root-to-reviewer-chain-audit-final-seal-html-card-hold-v1.json"
final_seal_route = "/public-node/validators/mainnet0-validator-public-visibility-root-to-reviewer-chain-audit-final-seal-hold-v1.json"
final_runtime_route = "/public-node/validators/mainnet0-validator-public-visibility-root-to-reviewer-chain-audit-final-seal-html-runtime-visibility-hold-v1.json"
root_runtime_route = "/public-node/validators/mainnet0-validator-public-node-root-reviewer-entrypoint-runtime-visibility-hold-v1.json"
audit_rollup_route = "/public-node/validators/mainnet0-validator-public-visibility-root-to-reviewer-chain-audit-rollup-hold-v1.json"

def load_json(path):
    return json.loads(path.read_text())

def ensure(cond, msg):
    if not cond:
        raise SystemExit(msg)

print("== JSON parse ==")
root_index = load_json(root_index_path)
section_index = load_json(section_index_path)
record = load_json(record_path)
load_json(final_seal_path)
load_json(final_html_json_path)
load_json(final_runtime_path)
load_json(root_runtime_path)
load_json(audit_rollup_path)
print("json_green=true")

print("== source chain presence ==")
for path, expected in [
    (final_seal_path, final_seal_marker),
    (final_html_path, final_html_marker),
    (final_html_json_path, final_html_marker),
    (final_runtime_path, final_runtime_marker),
    (root_runtime_path, root_runtime_marker),
    (audit_rollup_path, audit_rollup_marker),
]:
    ensure(expected in path.read_text(), f"missing {expected} in {path}")
print("source_chain_green=true")

print("== root entrypoint binding ==")
ensure(root_index.get(root_key, {}).get("marker") == marker, "root index named entry missing marker")
ensure(root_index[root_key].get("route") == record_route, "root index named entry route mismatch")
ensure(root_index[root_key].get("preferred_browser_visible_reviewer_route") == final_html_route, "root index preferred browser route mismatch")
ensure(section_index.get(root_key, {}).get("marker") == marker, "validators index named entry missing marker")
ensure(section_index[root_key].get("route") == record_route, "validators index named entry route mismatch")
ensure(record.get("marker") == marker, "record marker mismatch")
ensure(record.get("route") == record_route, "record route mismatch")
ensure(record.get("preferred_browser_visible_reviewer_route") == final_html_route, "record preferred browser route mismatch")
ensure(record.get("preferred_browser_visible_reviewer_json_route") == final_html_json_route, "record preferred json route mismatch")
ensure(record.get("source_final_seal_route") == final_seal_route, "record final seal route mismatch")
ensure(record.get("source_final_seal_html_runtime_visibility_route") == final_runtime_route, "record final runtime route mismatch")
ensure(record.get("source_root_reviewer_entrypoint_runtime_visibility_route") == root_runtime_route, "record root runtime route mismatch")
ensure(record.get("source_audit_rollup_route") == audit_rollup_route, "record audit rollup route mismatch")
print("validator_public_node_root_to_reviewer_audit_final_seal_entrypoint_polish_binding_green=true")

print("== marker presence ==")
for path in [root_index_path, section_index_path, record_path, doc_path, proof_path]:
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
]
for path in [root_index_path, section_index_path, record_path, doc_path]:
    text = path.read_text().lower()
    for needle in bad_needles:
        ensure(needle not in text, f"forbidden enablement {needle} in {path}")
print("forbidden_enablement_scan_green=true")

print("== result ==")
print("VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_POLISH_HOLD_V1_GREEN")
PYPROOF
