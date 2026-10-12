#!/usr/bin/env bash
set -euo pipefail

python3 - <<'PYPROOF'
from pathlib import Path
import json

marker = "VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_CLOSEOUT_DISCOVERY_POLISH_RUNTIME_VISIBILITY_HOLD_V1"
discovery_marker = "VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_CLOSEOUT_DISCOVERY_POLISH_HOLD_V1"
final_seal_marker = "VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_CLOSEOUT_FINAL_SEAL_HOLD_V1"
final_html_marker = "VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_CLOSEOUT_FINAL_SEAL_HTML_CARD_HOLD_V1"
final_runtime_marker = "VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_CLOSEOUT_FINAL_SEAL_HTML_RUNTIME_VISIBILITY_HOLD_V1"
closeout_marker = "VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_CLOSEOUT_ROLLUP_HOLD_V1"
entrypoint_polish_marker = "VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_POLISH_HOLD_V1"
entrypoint_runtime_marker = "VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_RUNTIME_VISIBILITY_HOLD_V1"
section_key = "mainnet0_validator_root_to_reviewer_audit_final_seal_entrypoint_closeout_discovery_polish_runtime_visibility"

section_index_path = Path("public/public-node/validators/index.json")
runtime_path = Path("public/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-polish-runtime-visibility-hold-v1.json")
doc_path = Path("docs/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-polish-runtime-visibility-hold-v1.md")
proof_path = Path("ops/mainnet0/void-mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-polish-runtime-visibility-hold-v1-proof.sh")

discovery_path = Path("public/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-polish-hold-v1.json")
final_seal_path = Path("public/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-final-seal-hold-v1.json")
final_html_path = Path("public/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-final-seal-html-card-hold-v1.html")
final_html_json_path = Path("public/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-final-seal-html-card-hold-v1.json")
final_runtime_path = Path("public/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-final-seal-html-runtime-visibility-hold-v1.json")
closeout_path = Path("public/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-rollup-hold-v1.json")
entrypoint_polish_path = Path("public/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-polish-hold-v1.json")
entrypoint_runtime_path = Path("public/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-runtime-visibility-hold-v1.json")

runtime_route = "/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-polish-runtime-visibility-hold-v1.json"
discovery_route = "/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-polish-hold-v1.json"
final_seal_route = "/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-final-seal-hold-v1.json"
final_html_route = "/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-final-seal-html-card-hold-v1.html"
final_html_json_route = "/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-final-seal-html-card-hold-v1.json"
final_runtime_route = "/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-final-seal-html-runtime-visibility-hold-v1.json"
closeout_route = "/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-rollup-hold-v1.json"
entrypoint_polish_route = "/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-polish-hold-v1.json"
entrypoint_runtime_route = "/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-runtime-visibility-hold-v1.json"

def load_json(path):
    return json.loads(path.read_text())

def ensure(cond, msg):
    if not cond:
        raise SystemExit(msg)

print("== JSON parse ==")
section_index = load_json(section_index_path)
runtime = load_json(runtime_path)
discovery = load_json(discovery_path)
final_seal = load_json(final_seal_path)
final_html = load_json(final_html_json_path)
final_runtime = load_json(final_runtime_path)
closeout = load_json(closeout_path)
entrypoint_polish = load_json(entrypoint_polish_path)
entrypoint_runtime = load_json(entrypoint_runtime_path)
print("json_green=true")

print("== source chain presence ==")
for path, expected in [
    (discovery_path, discovery_marker),
    (final_seal_path, final_seal_marker),
    (final_html_path, final_html_marker),
    (final_html_json_path, final_html_marker),
    (final_runtime_path, final_runtime_marker),
    (closeout_path, closeout_marker),
    (entrypoint_polish_path, entrypoint_polish_marker),
    (entrypoint_runtime_path, entrypoint_runtime_marker),
]:
    ensure(expected in path.read_text(), f"missing {expected} in {path}")
print("source_chain_green=true")

print("== runtime visibility binding ==")
ensure(discovery.get("marker") == discovery_marker, "discovery marker mismatch")
ensure(discovery.get("preferred_browser_visible_reviewer_route") == final_html_route, "discovery preferred route mismatch")
ensure(final_seal.get("marker") == final_seal_marker, "final seal marker mismatch")
ensure(final_html.get("marker") == final_html_marker, "final html marker mismatch")
ensure(final_runtime.get("marker") == final_runtime_marker, "final runtime marker mismatch")
ensure(closeout.get("marker") == closeout_marker, "closeout marker mismatch")
ensure(entrypoint_polish.get("marker") == entrypoint_polish_marker, "entrypoint polish marker mismatch")
ensure(entrypoint_runtime.get("marker") == entrypoint_runtime_marker, "entrypoint runtime marker mismatch")
ensure(section_index.get(section_key, {}).get("marker") == marker, "section runtime marker mismatch")
ensure(section_index[section_key].get("route") == runtime_route, "section runtime route mismatch")
ensure(runtime.get("marker") == marker, "runtime marker mismatch")
ensure(runtime.get("route") == runtime_route, "runtime route mismatch")
ensure(runtime.get("source_discovery_polish_route") == discovery_route, "runtime discovery route mismatch")
ensure(runtime.get("source_final_seal_route") == final_seal_route, "runtime final seal route mismatch")
ensure(runtime.get("source_final_seal_html_card_route") == final_html_route, "runtime final html route mismatch")
ensure(runtime.get("source_final_seal_html_card_json_route") == final_html_json_route, "runtime final html json route mismatch")
ensure(runtime.get("source_final_seal_html_runtime_visibility_route") == final_runtime_route, "runtime final runtime route mismatch")
ensure(runtime.get("source_closeout_rollup_route") == closeout_route, "runtime closeout route mismatch")
ensure(runtime.get("source_entrypoint_polish_route") == entrypoint_polish_route, "runtime entrypoint polish route mismatch")
ensure(runtime.get("source_entrypoint_runtime_visibility_route") == entrypoint_runtime_route, "runtime entrypoint runtime route mismatch")
ensure(runtime.get("preferred_browser_visible_reviewer_route") == final_html_route, "runtime preferred route mismatch")
rv = runtime.get("runtime_visibility", {})
for key in [
    "discovery_polish_present",
    "final_seal_present",
    "final_seal_html_card_present",
    "final_seal_html_runtime_visibility_present",
    "closeout_rollup_present",
    "entrypoint_polish_present",
    "entrypoint_runtime_visibility_present",
    "validator_section_entry_present",
    "preferred_browser_visible_reviewer_route_present",
]:
    ensure(rv.get(key) is True, f"visibility flag {key} must be true")
ensure(rv.get("runtime_mutation_enabled") is False, "runtime mutation must remain false")
print("validator_public_node_root_to_reviewer_audit_final_seal_entrypoint_closeout_discovery_polish_runtime_visibility_binding_green=true")

print("== marker presence ==")
for path in [section_index_path, runtime_path, doc_path, proof_path]:
    ensure(marker in path.read_text(), f"marker missing from {path}")
print("marker_green=true")

print("== forbidden enablement boundary ==")
boundary = runtime.get("boundary", {})
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
for path in [section_index_path, runtime_path, doc_path]:
    text = path.read_text().lower()
    for needle in bad_needles:
        ensure(needle not in text, f"forbidden enablement {needle} in {path}")
print("forbidden_enablement_scan_green=true")

print("== result ==")
print("VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_CLOSEOUT_DISCOVERY_POLISH_RUNTIME_VISIBILITY_HOLD_V1_GREEN")
PYPROOF
