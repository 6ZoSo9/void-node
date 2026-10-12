#!/usr/bin/env bash
set -euo pipefail
python3 - <<'PYPROOF'
from pathlib import Path
import json

marker = "VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_CLOSEOUT_DISCOVERY_FINAL_SEAL_HTML_RUNTIME_VISIBILITY_HOLD_V1"
card_marker = "VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_CLOSEOUT_DISCOVERY_FINAL_SEAL_HTML_CARD_HOLD_V1"
seal_marker = "VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_CLOSEOUT_DISCOVERY_FINAL_SEAL_HOLD_V1"
discovery_marker = "VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_CLOSEOUT_DISCOVERY_POLISH_HOLD_V1"
discovery_runtime_marker = "VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_CLOSEOUT_DISCOVERY_POLISH_RUNTIME_VISIBILITY_HOLD_V1"
section_key = "mainnet0_validator_root_to_reviewer_audit_final_seal_entrypoint_closeout_discovery_final_seal_html_runtime_visibility"

section_index_path = Path("public/public-node/validators/index.json")
runtime_path = Path("public/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-final-seal-html-runtime-visibility-hold-v1.json")
doc_path = Path("docs/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-final-seal-html-runtime-visibility-hold-v1.md")
proof_path = Path("ops/mainnet0/void-mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-final-seal-html-runtime-visibility-hold-v1-proof.sh")

card_html_path = Path("public/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-final-seal-html-card-hold-v1.html")
card_json_path = Path("public/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-final-seal-html-card-hold-v1.json")
seal_path = Path("public/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-final-seal-hold-v1.json")
discovery_path = Path("public/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-polish-hold-v1.json")
discovery_runtime_path = Path("public/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-polish-runtime-visibility-hold-v1.json")

runtime_route = "/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-final-seal-html-runtime-visibility-hold-v1.json"
card_html_route = "/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-final-seal-html-card-hold-v1.html"
card_json_route = "/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-final-seal-html-card-hold-v1.json"
seal_route = "/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-final-seal-hold-v1.json"
discovery_route = "/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-polish-hold-v1.json"
discovery_runtime_route = "/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-polish-runtime-visibility-hold-v1.json"

def load_json(path):
    return json.loads(path.read_text())

def ensure(cond, msg):
    if not cond:
        raise SystemExit(msg)

print("== JSON parse ==")
section_index = load_json(section_index_path)
runtime = load_json(runtime_path)
card = load_json(card_json_path)
seal = load_json(seal_path)
discovery = load_json(discovery_path)
discovery_runtime = load_json(discovery_runtime_path)
print("json_green=true")

print("== source chain presence ==")
for path, expected in [
    (card_html_path, card_marker),
    (card_json_path, card_marker),
    (seal_path, seal_marker),
    (discovery_path, discovery_marker),
    (discovery_runtime_path, discovery_runtime_marker),
]:
    ensure(expected in path.read_text(), f"missing {expected} in {path}")
print("source_chain_green=true")

print("== runtime visibility binding ==")
ensure(card.get("marker") == card_marker, "card marker mismatch")
ensure(card.get("route") == card_html_route, "card html route mismatch")
ensure(seal.get("marker") == seal_marker, "seal marker mismatch")
ensure(discovery.get("marker") == discovery_marker, "discovery marker mismatch")
ensure(discovery_runtime.get("marker") == discovery_runtime_marker, "discovery runtime marker mismatch")
ensure(section_index.get(section_key, {}).get("marker") == marker, "section marker mismatch")
ensure(section_index[section_key].get("route") == runtime_route, "section route mismatch")
ensure(runtime.get("marker") == marker, "runtime marker mismatch")
ensure(runtime.get("route") == runtime_route, "runtime route mismatch")
ensure(runtime.get("source_html_card_route") == card_html_route, "runtime card route mismatch")
ensure(runtime.get("source_html_card_json_route") == card_json_route, "runtime card json route mismatch")
ensure(runtime.get("source_discovery_final_seal_route") == seal_route, "runtime seal route mismatch")
ensure(runtime.get("source_discovery_polish_route") == discovery_route, "runtime discovery route mismatch")
ensure(runtime.get("source_discovery_polish_runtime_visibility_route") == discovery_runtime_route, "runtime discovery runtime route mismatch")
ensure(runtime.get("preferred_browser_visible_reviewer_route") == card_html_route, "runtime preferred route mismatch")
rv = runtime.get("runtime_visibility", {})
for key in [
    "html_card_present",
    "html_card_metadata_present",
    "discovery_final_seal_present",
    "discovery_polish_present",
    "discovery_polish_runtime_visibility_present",
    "validator_section_entry_present",
]:
    ensure(rv.get(key) is True, f"visibility {key} must be true")
ensure(rv.get("runtime_mutation_enabled") is False, "runtime mutation must remain false")
print("validator_public_node_root_to_reviewer_audit_final_seal_entrypoint_closeout_discovery_final_seal_html_runtime_visibility_binding_green=true")

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
print("forbidden_enablement_scan_green=true")

print("== result ==")
print("VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_CLOSEOUT_DISCOVERY_FINAL_SEAL_HTML_RUNTIME_VISIBILITY_HOLD_V1_GREEN")
PYPROOF
