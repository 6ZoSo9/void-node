#!/usr/bin/env bash
set -euo pipefail
python3 - <<'PYPROOF'
from pathlib import Path
import json

marker = "VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_CLOSEOUT_DISCOVERY_CLOSEOUT_ROLLUP_HOLD_V1"
polish_marker = "VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_CLOSEOUT_DISCOVERY_POLISH_HOLD_V1"
polish_runtime_marker = "VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_CLOSEOUT_DISCOVERY_POLISH_RUNTIME_VISIBILITY_HOLD_V1"
seal_marker = "VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_CLOSEOUT_DISCOVERY_FINAL_SEAL_HOLD_V1"
html_marker = "VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_CLOSEOUT_DISCOVERY_FINAL_SEAL_HTML_CARD_HOLD_V1"
html_runtime_marker = "VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_CLOSEOUT_DISCOVERY_FINAL_SEAL_HTML_RUNTIME_VISIBILITY_HOLD_V1"
section_key = "mainnet0_validator_root_to_reviewer_audit_final_seal_entrypoint_closeout_discovery_closeout_rollup"

section_index_path = Path("public/public-node/validators/index.json")
rollup_path = Path("public/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-closeout-rollup-hold-v1.json")
doc_path = Path("docs/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-closeout-rollup-hold-v1.md")
proof_path = Path("ops/mainnet0/void-mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-closeout-rollup-hold-v1-proof.sh")

polish_path = Path("public/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-polish-hold-v1.json")
polish_runtime_path = Path("public/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-polish-runtime-visibility-hold-v1.json")
seal_path = Path("public/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-final-seal-hold-v1.json")
html_path = Path("public/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-final-seal-html-card-hold-v1.html")
html_json_path = Path("public/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-final-seal-html-card-hold-v1.json")
html_runtime_path = Path("public/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-final-seal-html-runtime-visibility-hold-v1.json")

rollup_route = "/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-closeout-rollup-hold-v1.json"
polish_route = "/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-polish-hold-v1.json"
polish_runtime_route = "/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-polish-runtime-visibility-hold-v1.json"
seal_route = "/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-final-seal-hold-v1.json"
html_route = "/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-final-seal-html-card-hold-v1.html"
html_json_route = "/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-final-seal-html-card-hold-v1.json"
html_runtime_route = "/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-final-seal-html-runtime-visibility-hold-v1.json"

def load_json(path):
    return json.loads(path.read_text())

def ensure(cond, msg):
    if not cond:
        raise SystemExit(msg)

print("== JSON parse ==")
section_index = load_json(section_index_path)
rollup = load_json(rollup_path)
polish = load_json(polish_path)
polish_runtime = load_json(polish_runtime_path)
seal = load_json(seal_path)
html_card = load_json(html_json_path)
html_runtime = load_json(html_runtime_path)
print("json_green=true")

print("== source chain presence ==")
for path, expected in [
    (polish_path, polish_marker),
    (polish_runtime_path, polish_runtime_marker),
    (seal_path, seal_marker),
    (html_path, html_marker),
    (html_json_path, html_marker),
    (html_runtime_path, html_runtime_marker),
]:
    ensure(expected in path.read_text(), f"missing {expected} in {path}")
print("source_chain_green=true")

print("== closeout rollup binding ==")
ensure(polish.get("marker") == polish_marker, "polish marker mismatch")
ensure(polish_runtime.get("marker") == polish_runtime_marker, "polish runtime marker mismatch")
ensure(polish_runtime.get("source_discovery_polish_route") == polish_route, "polish runtime source route mismatch")
ensure(seal.get("marker") == seal_marker, "seal marker mismatch")
ensure(seal.get("source_discovery_polish_route") == polish_route, "seal source polish route mismatch")
ensure(seal.get("source_discovery_polish_runtime_visibility_route") == polish_runtime_route, "seal source polish runtime route mismatch")
ensure(html_card.get("marker") == html_marker, "html card marker mismatch")
ensure(html_card.get("route") == html_route, "html card route mismatch")
ensure(html_card.get("json_route") == html_json_route, "html card json route mismatch")
ensure(html_card.get("source_discovery_final_seal_route") == seal_route, "html card source seal route mismatch")
ensure(html_runtime.get("marker") == html_runtime_marker, "html runtime marker mismatch")
ensure(html_runtime.get("source_html_card_route") == html_route, "html runtime source card route mismatch")
ensure(html_runtime.get("source_discovery_final_seal_route") == seal_route, "html runtime source seal route mismatch")
ensure(html_runtime.get("preferred_browser_visible_reviewer_route") == html_route, "html runtime preferred route mismatch")

ensure(section_index.get(section_key, {}).get("marker") == marker, "section marker mismatch")
ensure(section_index[section_key].get("route") == rollup_route, "section route mismatch")
ensure(section_index[section_key].get("preferred_browser_visible_reviewer_route") == html_route, "section preferred route mismatch")

ensure(rollup.get("marker") == marker, "rollup marker mismatch")
ensure(rollup.get("route") == rollup_route, "rollup route mismatch")
ensure(rollup.get("source_discovery_polish_route") == polish_route, "rollup polish route mismatch")
ensure(rollup.get("source_discovery_polish_runtime_visibility_route") == polish_runtime_route, "rollup polish runtime route mismatch")
ensure(rollup.get("source_discovery_final_seal_route") == seal_route, "rollup final seal route mismatch")
ensure(rollup.get("source_discovery_final_seal_html_card_route") == html_route, "rollup html card route mismatch")
ensure(rollup.get("source_discovery_final_seal_html_card_json_route") == html_json_route, "rollup html json route mismatch")
ensure(rollup.get("source_discovery_final_seal_html_runtime_visibility_route") == html_runtime_route, "rollup html runtime route mismatch")
ensure(rollup.get("preferred_browser_visible_reviewer_route") == html_route, "rollup preferred route mismatch")

assertions = rollup.get("closeout_assertions", {})
for key in [
    "discovery_polish_present",
    "discovery_polish_runtime_visibility_present",
    "discovery_final_seal_present",
    "discovery_final_seal_html_card_present",
    "discovery_final_seal_html_runtime_visibility_present",
    "preferred_browser_visible_reviewer_route_present",
    "public_safe_read_only",
]:
    ensure(assertions.get(key) is True, f"assertion {key} must be true")
ensure(assertions.get("runtime_mutation_enabled") is False, "runtime mutation must remain false")
print("validator_public_node_root_to_reviewer_audit_final_seal_entrypoint_closeout_discovery_closeout_rollup_binding_green=true")

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
print("VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_CLOSEOUT_DISCOVERY_CLOSEOUT_ROLLUP_HOLD_V1_GREEN")
PYPROOF
