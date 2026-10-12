#!/usr/bin/env bash
set -euo pipefail

python3 - <<'PYPROOF'
from pathlib import Path
import json

marker = "VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_CLOSEOUT_DISCOVERY_POLISH_HOLD_V1"
final_seal_marker = "VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_CLOSEOUT_FINAL_SEAL_HOLD_V1"
final_html_marker = "VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_CLOSEOUT_FINAL_SEAL_HTML_CARD_HOLD_V1"
final_runtime_marker = "VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_CLOSEOUT_FINAL_SEAL_HTML_RUNTIME_VISIBILITY_HOLD_V1"
closeout_marker = "VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_CLOSEOUT_ROLLUP_HOLD_V1"
closeout_html_marker = "VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_CLOSEOUT_ROLLUP_HTML_CARD_HOLD_V1"
closeout_runtime_marker = "VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_CLOSEOUT_ROLLUP_HTML_RUNTIME_VISIBILITY_HOLD_V1"
entrypoint_polish_marker = "VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_POLISH_HOLD_V1"
entrypoint_runtime_marker = "VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_RUNTIME_VISIBILITY_HOLD_V1"

root_key = "mainnet0_validator_root_to_reviewer_audit_final_seal_entrypoint_closeout_discovery_polish"
section_key = "mainnet0_validator_root_to_reviewer_audit_final_seal_entrypoint_closeout_discovery_polish"

root_index_path = Path("public/public-node/index.json")
section_index_path = Path("public/public-node/validators/index.json")
record_path = Path("public/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-polish-hold-v1.json")
doc_path = Path("docs/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-polish-hold-v1.md")
proof_path = Path("ops/mainnet0/void-mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-polish-hold-v1-proof.sh")

final_seal_path = Path("public/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-final-seal-hold-v1.json")
final_html_path = Path("public/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-final-seal-html-card-hold-v1.html")
final_html_json_path = Path("public/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-final-seal-html-card-hold-v1.json")
final_runtime_path = Path("public/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-final-seal-html-runtime-visibility-hold-v1.json")
closeout_path = Path("public/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-rollup-hold-v1.json")
closeout_html_path = Path("public/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-rollup-html-card-hold-v1.html")
closeout_html_json_path = Path("public/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-rollup-html-card-hold-v1.json")
closeout_runtime_path = Path("public/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-rollup-html-runtime-visibility-hold-v1.json")
entrypoint_polish_path = Path("public/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-polish-hold-v1.json")
entrypoint_runtime_path = Path("public/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-runtime-visibility-hold-v1.json")

record_route = "/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-polish-hold-v1.json"
final_seal_route = "/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-final-seal-hold-v1.json"
final_html_route = "/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-final-seal-html-card-hold-v1.html"
final_html_json_route = "/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-final-seal-html-card-hold-v1.json"
final_runtime_route = "/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-final-seal-html-runtime-visibility-hold-v1.json"
closeout_route = "/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-rollup-hold-v1.json"
closeout_html_route = "/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-rollup-html-card-hold-v1.html"
closeout_runtime_route = "/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-rollup-html-runtime-visibility-hold-v1.json"
entrypoint_polish_route = "/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-polish-hold-v1.json"
entrypoint_runtime_route = "/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-runtime-visibility-hold-v1.json"

def load_json(path):
    return json.loads(path.read_text())

def ensure(cond, msg):
    if not cond:
        raise SystemExit(msg)

print("== JSON parse ==")
root_index = load_json(root_index_path)
section_index = load_json(section_index_path)
record = load_json(record_path)
final_seal = load_json(final_seal_path)
final_html = load_json(final_html_json_path)
final_runtime = load_json(final_runtime_path)
closeout = load_json(closeout_path)
load_json(closeout_html_json_path)
load_json(closeout_runtime_path)
entrypoint_polish = load_json(entrypoint_polish_path)
entrypoint_runtime = load_json(entrypoint_runtime_path)
print("json_green=true")

print("== source chain presence ==")
for path, expected in [
    (final_seal_path, final_seal_marker),
    (final_html_path, final_html_marker),
    (final_html_json_path, final_html_marker),
    (final_runtime_path, final_runtime_marker),
    (closeout_path, closeout_marker),
    (closeout_html_path, closeout_html_marker),
    (closeout_html_json_path, closeout_html_marker),
    (closeout_runtime_path, closeout_runtime_marker),
    (entrypoint_polish_path, entrypoint_polish_marker),
    (entrypoint_runtime_path, entrypoint_runtime_marker),
]:
    ensure(expected in path.read_text(), f"missing {expected} in {path}")
print("source_chain_green=true")

print("== discovery polish binding ==")
ensure(final_seal.get("marker") == final_seal_marker, "final seal marker mismatch")
ensure(final_html.get("marker") == final_html_marker, "final html marker mismatch")
ensure(final_html.get("route") == final_html_route, "final html route mismatch")
ensure(final_runtime.get("marker") == final_runtime_marker, "final runtime marker mismatch")
ensure(final_runtime.get("source_html_card_route") == final_html_route, "final runtime html route mismatch")
ensure(closeout.get("marker") == closeout_marker, "closeout marker mismatch")
ensure(entrypoint_polish.get("marker") == entrypoint_polish_marker, "entrypoint polish marker mismatch")
ensure(entrypoint_runtime.get("marker") == entrypoint_runtime_marker, "entrypoint runtime marker mismatch")
ensure(root_index.get(root_key, {}).get("marker") == marker, "root discovery marker mismatch")
ensure(root_index[root_key].get("route") == record_route, "root discovery route mismatch")
ensure(root_index[root_key].get("preferred_browser_visible_reviewer_route") == final_html_route, "root preferred route mismatch")
ensure(section_index.get(section_key, {}).get("marker") == marker, "section discovery marker mismatch")
ensure(section_index[section_key].get("route") == record_route, "section discovery route mismatch")
ensure(record.get("marker") == marker, "record marker mismatch")
ensure(record.get("route") == record_route, "record route mismatch")
ensure(record.get("preferred_browser_visible_reviewer_route") == final_html_route, "record preferred route mismatch")
ensure(record.get("preferred_browser_visible_reviewer_json_route") == final_html_json_route, "record preferred json route mismatch")
ensure(record.get("source_final_seal_route") == final_seal_route, "record final seal route mismatch")
ensure(record.get("source_final_seal_html_card_route") == final_html_route, "record final html route mismatch")
ensure(record.get("source_final_seal_html_runtime_visibility_route") == final_runtime_route, "record final runtime route mismatch")
ensure(record.get("source_closeout_rollup_route") == closeout_route, "record closeout route mismatch")
ensure(record.get("source_closeout_rollup_html_card_route") == closeout_html_route, "record closeout html route mismatch")
ensure(record.get("source_closeout_rollup_html_runtime_visibility_route") == closeout_runtime_route, "record closeout runtime route mismatch")
ensure(record.get("source_entrypoint_polish_route") == entrypoint_polish_route, "record entrypoint polish route mismatch")
ensure(record.get("source_entrypoint_runtime_visibility_route") == entrypoint_runtime_route, "record entrypoint runtime route mismatch")
print("validator_public_node_root_to_reviewer_audit_final_seal_entrypoint_closeout_discovery_polish_binding_green=true")

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
print("VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_CLOSEOUT_DISCOVERY_POLISH_HOLD_V1_GREEN")
PYPROOF
