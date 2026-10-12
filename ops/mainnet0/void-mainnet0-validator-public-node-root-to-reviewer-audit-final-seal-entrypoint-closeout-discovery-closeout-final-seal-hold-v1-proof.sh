#!/usr/bin/env bash
set -euo pipefail
python3 - <<'PYPROOF'
from pathlib import Path
import json

marker = "VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_CLOSEOUT_DISCOVERY_CLOSEOUT_FINAL_SEAL_HOLD_V1"
rollup_marker = "VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_CLOSEOUT_DISCOVERY_CLOSEOUT_ROLLUP_HOLD_V1"
rollup_html_marker = "VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_CLOSEOUT_DISCOVERY_CLOSEOUT_ROLLUP_HTML_CARD_HOLD_V1"
rollup_html_runtime_marker = "VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_CLOSEOUT_DISCOVERY_CLOSEOUT_ROLLUP_HTML_RUNTIME_VISIBILITY_HOLD_V1"
discovery_seal_marker = "VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_CLOSEOUT_DISCOVERY_FINAL_SEAL_HOLD_V1"
discovery_seal_html_marker = "VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_CLOSEOUT_DISCOVERY_FINAL_SEAL_HTML_CARD_HOLD_V1"
discovery_seal_html_runtime_marker = "VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_CLOSEOUT_DISCOVERY_FINAL_SEAL_HTML_RUNTIME_VISIBILITY_HOLD_V1"
section_key = "mainnet0_validator_root_to_reviewer_audit_final_seal_entrypoint_closeout_discovery_closeout_final_seal"

section_index_path = Path("public/public-node/validators/index.json")
seal_path = Path("public/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-closeout-final-seal-hold-v1.json")
doc_path = Path("docs/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-closeout-final-seal-hold-v1.md")
proof_path = Path("ops/mainnet0/void-mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-closeout-final-seal-hold-v1-proof.sh")

rollup_path = Path("public/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-closeout-rollup-hold-v1.json")
rollup_html_path = Path("public/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-closeout-rollup-html-card-hold-v1.html")
rollup_html_json_path = Path("public/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-closeout-rollup-html-card-hold-v1.json")
rollup_html_runtime_path = Path("public/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-closeout-rollup-html-runtime-visibility-hold-v1.json")
discovery_seal_path = Path("public/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-final-seal-hold-v1.json")
discovery_seal_html_path = Path("public/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-final-seal-html-card-hold-v1.html")
discovery_seal_html_json_path = Path("public/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-final-seal-html-card-hold-v1.json")
discovery_seal_html_runtime_path = Path("public/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-final-seal-html-runtime-visibility-hold-v1.json")

seal_route = "/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-closeout-final-seal-hold-v1.json"
rollup_route = "/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-closeout-rollup-hold-v1.json"
rollup_html_route = "/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-closeout-rollup-html-card-hold-v1.html"
rollup_html_json_route = "/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-closeout-rollup-html-card-hold-v1.json"
rollup_html_runtime_route = "/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-closeout-rollup-html-runtime-visibility-hold-v1.json"
discovery_seal_route = "/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-final-seal-hold-v1.json"
discovery_seal_html_route = "/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-final-seal-html-card-hold-v1.html"
discovery_seal_html_json_route = "/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-final-seal-html-card-hold-v1.json"
discovery_seal_html_runtime_route = "/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-final-seal-html-runtime-visibility-hold-v1.json"

def load_json(path):
    return json.loads(path.read_text())

def ensure(cond, msg):
    if not cond:
        raise SystemExit(msg)

print("== JSON parse ==")
section_index = load_json(section_index_path)
seal = load_json(seal_path)
rollup = load_json(rollup_path)
rollup_html = load_json(rollup_html_json_path)
rollup_html_runtime = load_json(rollup_html_runtime_path)
discovery_seal = load_json(discovery_seal_path)
discovery_seal_html = load_json(discovery_seal_html_json_path)
discovery_seal_html_runtime = load_json(discovery_seal_html_runtime_path)
print("json_green=true")

print("== source chain presence ==")
for path, expected in [
    (rollup_path, rollup_marker),
    (rollup_html_path, rollup_html_marker),
    (rollup_html_json_path, rollup_html_marker),
    (rollup_html_runtime_path, rollup_html_runtime_marker),
    (discovery_seal_path, discovery_seal_marker),
    (discovery_seal_html_path, discovery_seal_html_marker),
    (discovery_seal_html_json_path, discovery_seal_html_marker),
    (discovery_seal_html_runtime_path, discovery_seal_html_runtime_marker),
]:
    ensure(expected in path.read_text(), f"missing {expected} in {path}")
print("source_chain_green=true")

print("== final seal binding ==")
ensure(rollup.get("marker") == rollup_marker, "rollup marker mismatch")
ensure(rollup.get("source_discovery_final_seal_route") == discovery_seal_route, "rollup discovery seal route mismatch")
ensure(rollup.get("source_discovery_final_seal_html_card_route") == discovery_seal_html_route, "rollup discovery seal html route mismatch")
ensure(rollup.get("source_discovery_final_seal_html_runtime_visibility_route") == discovery_seal_html_runtime_route, "rollup discovery seal html runtime route mismatch")
ensure(rollup.get("preferred_browser_visible_reviewer_route") == discovery_seal_html_route, "rollup previous preferred route mismatch")

ensure(rollup_html.get("marker") == rollup_html_marker, "rollup html marker mismatch")
ensure(rollup_html.get("route") == rollup_html_route, "rollup html route mismatch")
ensure(rollup_html.get("json_route") == rollup_html_json_route, "rollup html json route mismatch")
ensure(rollup_html.get("source_closeout_rollup_route") == rollup_route, "rollup html source rollup route mismatch")
ensure(rollup_html.get("previous_preferred_browser_visible_reviewer_route") == discovery_seal_html_route, "rollup html previous preferred route mismatch")
ensure(rollup_html.get("preferred_browser_visible_reviewer_route") == rollup_html_route, "rollup html preferred route mismatch")

ensure(rollup_html_runtime.get("marker") == rollup_html_runtime_marker, "rollup html runtime marker mismatch")
ensure(rollup_html_runtime.get("source_html_card_route") == rollup_html_route, "rollup html runtime source card route mismatch")
ensure(rollup_html_runtime.get("source_closeout_rollup_route") == rollup_route, "rollup html runtime source rollup route mismatch")
ensure(rollup_html_runtime.get("source_discovery_final_seal_route") == discovery_seal_route, "rollup html runtime discovery seal route mismatch")
ensure(rollup_html_runtime.get("preferred_browser_visible_reviewer_route") == rollup_html_route, "rollup html runtime preferred route mismatch")

ensure(discovery_seal.get("marker") == discovery_seal_marker, "discovery seal marker mismatch")
ensure(discovery_seal_html.get("marker") == discovery_seal_html_marker, "discovery seal html marker mismatch")
ensure(discovery_seal_html.get("route") == discovery_seal_html_route, "discovery seal html route mismatch")
ensure(discovery_seal_html_runtime.get("marker") == discovery_seal_html_runtime_marker, "discovery seal html runtime marker mismatch")
ensure(discovery_seal_html_runtime.get("source_html_card_route") == discovery_seal_html_route, "discovery seal html runtime source route mismatch")

ensure(section_index.get(section_key, {}).get("marker") == marker, "section marker mismatch")
ensure(section_index[section_key].get("route") == seal_route, "section route mismatch")
ensure(section_index[section_key].get("preferred_browser_visible_reviewer_route") == rollup_html_route, "section preferred route mismatch")

ensure(seal.get("marker") == marker, "seal marker mismatch")
ensure(seal.get("route") == seal_route, "seal route mismatch")
ensure(seal.get("source_closeout_rollup_route") == rollup_route, "seal rollup route mismatch")
ensure(seal.get("source_closeout_rollup_html_card_route") == rollup_html_route, "seal rollup html route mismatch")
ensure(seal.get("source_closeout_rollup_html_card_json_route") == rollup_html_json_route, "seal rollup html json route mismatch")
ensure(seal.get("source_closeout_rollup_html_runtime_visibility_route") == rollup_html_runtime_route, "seal rollup html runtime route mismatch")
ensure(seal.get("source_discovery_final_seal_route") == discovery_seal_route, "seal discovery seal route mismatch")
ensure(seal.get("source_discovery_final_seal_html_card_route") == discovery_seal_html_route, "seal discovery seal html route mismatch")
ensure(seal.get("source_discovery_final_seal_html_card_json_route") == discovery_seal_html_json_route, "seal discovery seal html json route mismatch")
ensure(seal.get("source_discovery_final_seal_html_runtime_visibility_route") == discovery_seal_html_runtime_route, "seal discovery seal html runtime route mismatch")
ensure(seal.get("preferred_browser_visible_reviewer_route") == rollup_html_route, "seal preferred route mismatch")

assertions = seal.get("final_seal_assertions", {})
for key in [
    "closeout_rollup_present",
    "closeout_rollup_html_card_present",
    "closeout_rollup_html_runtime_visibility_present",
    "discovery_final_seal_present",
    "discovery_final_seal_html_card_present",
    "discovery_final_seal_html_runtime_visibility_present",
    "preferred_browser_visible_reviewer_route_present",
    "public_safe_read_only",
]:
    ensure(assertions.get(key) is True, f"assertion {key} must be true")
ensure(assertions.get("runtime_mutation_enabled") is False, "runtime mutation must remain false")
print("validator_public_node_root_to_reviewer_audit_final_seal_entrypoint_closeout_discovery_closeout_final_seal_binding_green=true")

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
print("VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_CLOSEOUT_DISCOVERY_CLOSEOUT_FINAL_SEAL_HOLD_V1_GREEN")
PYPROOF
