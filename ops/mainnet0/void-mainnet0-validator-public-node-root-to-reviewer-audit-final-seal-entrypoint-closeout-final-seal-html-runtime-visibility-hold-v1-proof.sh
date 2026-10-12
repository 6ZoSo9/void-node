#!/usr/bin/env bash
set -euo pipefail

python3 - <<'PYPROOF'
from pathlib import Path
import json

marker = "VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_CLOSEOUT_FINAL_SEAL_HTML_RUNTIME_VISIBILITY_HOLD_V1"
card_marker = "VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_CLOSEOUT_FINAL_SEAL_HTML_CARD_HOLD_V1"
seal_marker = "VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_CLOSEOUT_FINAL_SEAL_HOLD_V1"
closeout_marker = "VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_CLOSEOUT_ROLLUP_HOLD_V1"
closeout_html_marker = "VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_CLOSEOUT_ROLLUP_HTML_CARD_HOLD_V1"
closeout_runtime_marker = "VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_CLOSEOUT_ROLLUP_HTML_RUNTIME_VISIBILITY_HOLD_V1"
preferred_html_marker = "VOID_MAINNET0_VALIDATOR_PUBLIC_VISIBILITY_ROOT_TO_REVIEWER_CHAIN_AUDIT_FINAL_SEAL_HTML_CARD_HOLD_V1"
section_key = "mainnet0_validator_root_to_reviewer_audit_final_seal_entrypoint_closeout_final_seal_html_runtime_visibility"

section_index_path = Path("public/public-node/validators/index.json")
runtime_path = Path("public/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-final-seal-html-runtime-visibility-hold-v1.json")
doc_path = Path("docs/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-final-seal-html-runtime-visibility-hold-v1.md")
proof_path = Path("ops/mainnet0/void-mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-final-seal-html-runtime-visibility-hold-v1-proof.sh")

card_html_path = Path("public/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-final-seal-html-card-hold-v1.html")
card_json_path = Path("public/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-final-seal-html-card-hold-v1.json")
seal_path = Path("public/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-final-seal-hold-v1.json")
closeout_path = Path("public/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-rollup-hold-v1.json")
closeout_html_path = Path("public/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-rollup-html-card-hold-v1.html")
closeout_html_json_path = Path("public/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-rollup-html-card-hold-v1.json")
closeout_runtime_path = Path("public/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-rollup-html-runtime-visibility-hold-v1.json")
preferred_html_path = Path("public/public-node/validators/mainnet0-validator-public-visibility-root-to-reviewer-chain-audit-final-seal-html-card-hold-v1.html")

runtime_route = "/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-final-seal-html-runtime-visibility-hold-v1.json"
card_html_route = "/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-final-seal-html-card-hold-v1.html"
card_json_route = "/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-final-seal-html-card-hold-v1.json"
seal_route = "/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-final-seal-hold-v1.json"
closeout_route = "/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-rollup-hold-v1.json"
closeout_html_route = "/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-rollup-html-card-hold-v1.html"
closeout_html_json_route = "/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-rollup-html-card-hold-v1.json"
closeout_runtime_route = "/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-rollup-html-runtime-visibility-hold-v1.json"
preferred_html_route = "/public-node/validators/mainnet0-validator-public-visibility-root-to-reviewer-chain-audit-final-seal-html-card-hold-v1.html"

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
closeout = load_json(closeout_path)
load_json(closeout_html_json_path)
closeout_runtime = load_json(closeout_runtime_path)
print("json_green=true")

print("== source chain presence ==")
for path, expected in [
    (card_html_path, card_marker),
    (card_json_path, card_marker),
    (seal_path, seal_marker),
    (closeout_path, closeout_marker),
    (closeout_html_path, closeout_html_marker),
    (closeout_html_json_path, closeout_html_marker),
    (closeout_runtime_path, closeout_runtime_marker),
    (preferred_html_path, preferred_html_marker),
]:
    ensure(expected in path.read_text(), f"missing {expected} in {path}")
print("source_chain_green=true")

print("== runtime visibility binding ==")
ensure(card.get("marker") == card_marker, "card marker mismatch")
ensure(card.get("route") == card_html_route, "card html route mismatch")
ensure(card.get("json_route") == card_json_route, "card json route mismatch")
ensure(card.get("source_final_seal_route") == seal_route, "card seal route mismatch")
ensure(card.get("preferred_browser_visible_reviewer_route") == preferred_html_route, "card preferred route mismatch")
ensure(seal.get("marker") == seal_marker, "seal marker mismatch")
ensure(seal.get("preferred_browser_visible_reviewer_route") == preferred_html_route, "seal preferred route mismatch")
ensure(closeout.get("marker") == closeout_marker, "closeout marker mismatch")
ensure(closeout_runtime.get("marker") == closeout_runtime_marker, "closeout runtime marker mismatch")
ensure(section_index.get(section_key, {}).get("marker") == marker, "section runtime marker mismatch")
ensure(section_index[section_key].get("route") == runtime_route, "section runtime route mismatch")
ensure(runtime.get("marker") == marker, "runtime marker mismatch")
ensure(runtime.get("route") == runtime_route, "runtime route mismatch")
ensure(runtime.get("source_html_card_route") == card_html_route, "runtime html card route mismatch")
ensure(runtime.get("source_html_card_json_route") == card_json_route, "runtime html card json route mismatch")
ensure(runtime.get("source_final_seal_route") == seal_route, "runtime seal route mismatch")
ensure(runtime.get("source_closeout_rollup_route") == closeout_route, "runtime closeout route mismatch")
ensure(runtime.get("source_closeout_rollup_html_card_route") == closeout_html_route, "runtime closeout html route mismatch")
ensure(runtime.get("source_closeout_rollup_html_card_json_route") == closeout_html_json_route, "runtime closeout html json route mismatch")
ensure(runtime.get("source_closeout_rollup_html_runtime_visibility_route") == closeout_runtime_route, "runtime closeout runtime route mismatch")
ensure(runtime.get("preferred_browser_visible_reviewer_route") == preferred_html_route, "runtime preferred route mismatch")
rv = runtime.get("runtime_visibility", {})
for key in [
    "final_seal_html_card_present",
    "final_seal_html_card_metadata_present",
    "final_seal_present",
    "closeout_rollup_present",
    "closeout_html_runtime_visibility_present",
    "validator_section_entry_present",
    "preferred_browser_visible_reviewer_route_present",
    "static_html_visible",
]:
    ensure(rv.get(key) is True, f"visibility flag {key} must be true")
ensure(rv.get("runtime_mutation_enabled") is False, "runtime mutation must remain false")
print("validator_public_node_root_to_reviewer_audit_final_seal_entrypoint_closeout_final_seal_html_runtime_visibility_binding_green=true")

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
print("VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_CLOSEOUT_FINAL_SEAL_HTML_RUNTIME_VISIBILITY_HOLD_V1_GREEN")
PYPROOF
