#!/usr/bin/env bash
set -euo pipefail

python3 - <<'PYPROOF'
from pathlib import Path
import json

marker = "VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_CLOSEOUT_DISCOVERY_FINAL_SEAL_HOLD_V1"
discovery_marker = "VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_CLOSEOUT_DISCOVERY_POLISH_HOLD_V1"
discovery_runtime_marker = "VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_CLOSEOUT_DISCOVERY_POLISH_RUNTIME_VISIBILITY_HOLD_V1"
closeout_final_seal_marker = "VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_CLOSEOUT_FINAL_SEAL_HOLD_V1"
closeout_final_html_marker = "VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_CLOSEOUT_FINAL_SEAL_HTML_CARD_HOLD_V1"
closeout_final_runtime_marker = "VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_CLOSEOUT_FINAL_SEAL_HTML_RUNTIME_VISIBILITY_HOLD_V1"
section_key = "mainnet0_validator_root_to_reviewer_audit_final_seal_entrypoint_closeout_discovery_final_seal"

section_index_path = Path("public/public-node/validators/index.json")
seal_path = Path("public/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-final-seal-hold-v1.json")
doc_path = Path("docs/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-final-seal-hold-v1.md")
proof_path = Path("ops/mainnet0/void-mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-final-seal-hold-v1-proof.sh")

discovery_path = Path("public/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-polish-hold-v1.json")
discovery_runtime_path = Path("public/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-polish-runtime-visibility-hold-v1.json")
closeout_final_seal_path = Path("public/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-final-seal-hold-v1.json")
closeout_final_html_path = Path("public/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-final-seal-html-card-hold-v1.html")
closeout_final_html_json_path = Path("public/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-final-seal-html-card-hold-v1.json")
closeout_final_runtime_path = Path("public/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-final-seal-html-runtime-visibility-hold-v1.json")

seal_route = "/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-final-seal-hold-v1.json"
discovery_route = "/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-polish-hold-v1.json"
discovery_runtime_route = "/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-polish-runtime-visibility-hold-v1.json"
closeout_final_seal_route = "/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-final-seal-hold-v1.json"
closeout_final_html_route = "/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-final-seal-html-card-hold-v1.html"
closeout_final_html_json_route = "/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-final-seal-html-card-hold-v1.json"
closeout_final_runtime_route = "/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-final-seal-html-runtime-visibility-hold-v1.json"

def load_json(path):
    return json.loads(path.read_text())

def ensure(cond, msg):
    if not cond:
        raise SystemExit(msg)

print("== JSON parse ==")
section_index = load_json(section_index_path)
seal = load_json(seal_path)
discovery = load_json(discovery_path)
discovery_runtime = load_json(discovery_runtime_path)
closeout_final_seal = load_json(closeout_final_seal_path)
closeout_final_html = load_json(closeout_final_html_json_path)
closeout_final_runtime = load_json(closeout_final_runtime_path)
print("json_green=true")

print("== source chain presence ==")
for path, expected in [
    (discovery_path, discovery_marker),
    (discovery_runtime_path, discovery_runtime_marker),
    (closeout_final_seal_path, closeout_final_seal_marker),
    (closeout_final_html_path, closeout_final_html_marker),
    (closeout_final_html_json_path, closeout_final_html_marker),
    (closeout_final_runtime_path, closeout_final_runtime_marker),
]:
    ensure(expected in path.read_text(), f"missing {expected} in {path}")
print("source_chain_green=true")

print("== final seal binding ==")
ensure(discovery.get("marker") == discovery_marker, "discovery marker mismatch")
ensure(discovery.get("preferred_browser_visible_reviewer_route") == closeout_final_html_route, "discovery preferred route mismatch")
ensure(discovery_runtime.get("marker") == discovery_runtime_marker, "discovery runtime marker mismatch")
ensure(discovery_runtime.get("source_discovery_polish_route") == discovery_route, "discovery runtime source route mismatch")
ensure(discovery_runtime.get("preferred_browser_visible_reviewer_route") == closeout_final_html_route, "discovery runtime preferred route mismatch")
ensure(closeout_final_seal.get("marker") == closeout_final_seal_marker, "closeout final seal marker mismatch")
ensure(closeout_final_html.get("marker") == closeout_final_html_marker, "closeout final html marker mismatch")
ensure(closeout_final_html.get("route") == closeout_final_html_route, "closeout final html route mismatch")
ensure(closeout_final_runtime.get("marker") == closeout_final_runtime_marker, "closeout final runtime marker mismatch")
ensure(closeout_final_runtime.get("source_html_card_route") == closeout_final_html_route, "closeout final runtime html route mismatch")
ensure(section_index.get(section_key, {}).get("marker") == marker, "section final seal marker mismatch")
ensure(section_index[section_key].get("route") == seal_route, "section final seal route mismatch")
ensure(seal.get("marker") == marker, "seal marker mismatch")
ensure(seal.get("route") == seal_route, "seal route mismatch")
ensure(seal.get("source_discovery_polish_route") == discovery_route, "seal discovery route mismatch")
ensure(seal.get("source_discovery_polish_runtime_visibility_route") == discovery_runtime_route, "seal discovery runtime route mismatch")
ensure(seal.get("source_closeout_final_seal_route") == closeout_final_seal_route, "seal closeout final seal route mismatch")
ensure(seal.get("source_closeout_final_seal_html_card_route") == closeout_final_html_route, "seal closeout final html route mismatch")
ensure(seal.get("source_closeout_final_seal_html_card_json_route") == closeout_final_html_json_route, "seal closeout final html json route mismatch")
ensure(seal.get("source_closeout_final_seal_html_runtime_visibility_route") == closeout_final_runtime_route, "seal closeout final runtime route mismatch")
ensure(seal.get("preferred_browser_visible_reviewer_route") == closeout_final_html_route, "seal preferred route mismatch")
assertions = seal.get("final_seal_assertions", {})
for key in [
    "discovery_polish_present",
    "discovery_polish_runtime_visibility_present",
    "closeout_final_seal_present",
    "closeout_final_seal_html_card_present",
    "closeout_final_seal_html_runtime_visibility_present",
    "preferred_browser_visible_reviewer_route_present",
    "public_safe_read_only",
]:
    ensure(assertions.get(key) is True, f"assertion {key} must be true")
ensure(assertions.get("runtime_mutation_enabled") is False, "runtime mutation must remain false")
print("validator_public_node_root_to_reviewer_audit_final_seal_entrypoint_closeout_discovery_final_seal_binding_green=true")

print("== marker presence ==")
for path in [section_index_path, seal_path, doc_path, proof_path]:
    ensure(marker in path.read_text(), f"marker missing from {path}")
print("marker_green=true")

print("== forbidden enablement boundary ==")
boundary = seal.get("boundary", {})
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
for path in [section_index_path, seal_path, doc_path]:
    text = path.read_text().lower()
    for needle in bad_needles:
        ensure(needle not in text, f"forbidden enablement {needle} in {path}")
print("forbidden_enablement_scan_green=true")

print("== result ==")
print("VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_CLOSEOUT_DISCOVERY_FINAL_SEAL_HOLD_V1_GREEN")
PYPROOF
