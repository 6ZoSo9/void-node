#!/usr/bin/env bash
set -euo pipefail

python3 - <<'PYPROOF'
from pathlib import Path
import json

marker = "VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_CLOSEOUT_ROLLUP_HOLD_V1"

polish_marker = "VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_POLISH_HOLD_V1"
runtime_marker = "VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_RUNTIME_VISIBILITY_HOLD_V1"
final_seal_marker = "VOID_MAINNET0_VALIDATOR_PUBLIC_VISIBILITY_ROOT_TO_REVIEWER_CHAIN_AUDIT_FINAL_SEAL_HOLD_V1"
final_html_marker = "VOID_MAINNET0_VALIDATOR_PUBLIC_VISIBILITY_ROOT_TO_REVIEWER_CHAIN_AUDIT_FINAL_SEAL_HTML_CARD_HOLD_V1"
final_html_runtime_marker = "VOID_MAINNET0_VALIDATOR_PUBLIC_VISIBILITY_ROOT_TO_REVIEWER_CHAIN_AUDIT_FINAL_SEAL_HTML_RUNTIME_VISIBILITY_HOLD_V1"

root_key = "mainnet0_validator_root_to_reviewer_audit_final_seal_entrypoint_polish"
runtime_key = "mainnet0_validator_root_to_reviewer_audit_final_seal_entrypoint_runtime_visibility"
rollup_key = "mainnet0_validator_root_to_reviewer_audit_final_seal_entrypoint_closeout_rollup"

root_index_path = Path("public/public-node/index.json")
section_index_path = Path("public/public-node/validators/index.json")
rollup_path = Path("public/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-rollup-hold-v1.json")
doc_path = Path("docs/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-rollup-hold-v1.md")
proof_path = Path("ops/mainnet0/void-mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-rollup-hold-v1-proof.sh")

polish_path = Path("public/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-polish-hold-v1.json")
runtime_path = Path("public/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-runtime-visibility-hold-v1.json")
final_seal_path = Path("public/public-node/validators/mainnet0-validator-public-visibility-root-to-reviewer-chain-audit-final-seal-hold-v1.json")
final_html_path = Path("public/public-node/validators/mainnet0-validator-public-visibility-root-to-reviewer-chain-audit-final-seal-html-card-hold-v1.html")
final_html_json_path = Path("public/public-node/validators/mainnet0-validator-public-visibility-root-to-reviewer-chain-audit-final-seal-html-card-hold-v1.json")
final_html_runtime_path = Path("public/public-node/validators/mainnet0-validator-public-visibility-root-to-reviewer-chain-audit-final-seal-html-runtime-visibility-hold-v1.json")

rollup_route = "/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-rollup-hold-v1.json"
polish_route = "/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-polish-hold-v1.json"
runtime_route = "/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-runtime-visibility-hold-v1.json"
final_seal_route = "/public-node/validators/mainnet0-validator-public-visibility-root-to-reviewer-chain-audit-final-seal-hold-v1.json"
final_html_route = "/public-node/validators/mainnet0-validator-public-visibility-root-to-reviewer-chain-audit-final-seal-html-card-hold-v1.html"
final_html_json_route = "/public-node/validators/mainnet0-validator-public-visibility-root-to-reviewer-chain-audit-final-seal-html-card-hold-v1.json"
final_html_runtime_route = "/public-node/validators/mainnet0-validator-public-visibility-root-to-reviewer-chain-audit-final-seal-html-runtime-visibility-hold-v1.json"

def load_json(path):
    return json.loads(path.read_text())

def ensure(cond, msg):
    if not cond:
        raise SystemExit(msg)

print("== JSON parse ==")
root_index = load_json(root_index_path)
section_index = load_json(section_index_path)
rollup = load_json(rollup_path)
polish = load_json(polish_path)
runtime = load_json(runtime_path)
load_json(final_seal_path)
load_json(final_html_json_path)
load_json(final_html_runtime_path)
print("json_green=true")

print("== source chain presence ==")
for path, expected in [
    (polish_path, polish_marker),
    (runtime_path, runtime_marker),
    (final_seal_path, final_seal_marker),
    (final_html_path, final_html_marker),
    (final_html_json_path, final_html_marker),
    (final_html_runtime_path, final_html_runtime_marker),
]:
    ensure(expected in path.read_text(), f"missing {expected} in {path}")
print("source_chain_green=true")

print("== closeout binding ==")
ensure(root_index.get(root_key, {}).get("marker") == polish_marker, "root index polish marker mismatch")
ensure(root_index[root_key].get("preferred_browser_visible_reviewer_route") == final_html_route, "root index preferred route mismatch")
ensure(section_index.get(runtime_key, {}).get("marker") == runtime_marker, "section runtime marker mismatch")
ensure(section_index.get(rollup_key, {}).get("marker") == marker, "section closeout marker mismatch")
ensure(section_index[rollup_key].get("route") == rollup_route, "section closeout route mismatch")
ensure(polish.get("marker") == polish_marker, "polish marker mismatch")
ensure(runtime.get("marker") == runtime_marker, "runtime marker mismatch")
ensure(rollup.get("marker") == marker, "rollup marker mismatch")
ensure(rollup.get("route") == rollup_route, "rollup route mismatch")
ensure(rollup.get("preferred_browser_visible_reviewer_route") == final_html_route, "rollup preferred route mismatch")

closed = rollup.get("closed_chain", [])
expected_routes = [polish_route, runtime_route, final_seal_route, final_html_route, final_html_runtime_route]
for route in expected_routes:
    ensure(any(item.get("route") == route for item in closed), f"closed chain missing {route}")

assertions = rollup.get("closeout_assertions", {})
ensure(assertions.get("root_index_entry_present") is True, "root entry assertion missing")
ensure(assertions.get("runtime_visibility_entry_present") is True, "runtime assertion missing")
ensure(assertions.get("preferred_browser_visible_reviewer_route_present") is True, "preferred route assertion missing")
ensure(assertions.get("source_chain_markers_present") is True, "source marker assertion missing")
ensure(assertions.get("runtime_mutation_enabled") is False, "runtime mutation must remain false")
print("validator_public_node_root_to_reviewer_audit_final_seal_entrypoint_closeout_rollup_binding_green=true")

print("== marker presence ==")
for path in [section_index_path, rollup_path, doc_path, proof_path]:
    ensure(marker in path.read_text(), f"marker missing from {path}")
print("marker_green=true")

print("== forbidden enablement boundary ==")
boundary = rollup.get("boundary", {})
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
for path in [section_index_path, rollup_path, doc_path]:
    text = path.read_text().lower()
    for needle in bad_needles:
        ensure(needle not in text, f"forbidden enablement {needle} in {path}")
print("forbidden_enablement_scan_green=true")

print("== result ==")
print("VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_CLOSEOUT_ROLLUP_HOLD_V1_GREEN")
PYPROOF
