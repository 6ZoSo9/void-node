#!/usr/bin/env bash
set -euo pipefail

python3 - <<'PYPROOF'
from pathlib import Path
import json

marker = "VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_CLOSEOUT_FINAL_SEAL_HOLD_V1"
closeout_marker = "VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_CLOSEOUT_ROLLUP_HOLD_V1"
html_marker = "VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_CLOSEOUT_ROLLUP_HTML_CARD_HOLD_V1"
runtime_marker = "VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_CLOSEOUT_ROLLUP_HTML_RUNTIME_VISIBILITY_HOLD_V1"
polish_marker = "VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_POLISH_HOLD_V1"
entry_runtime_marker = "VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_RUNTIME_VISIBILITY_HOLD_V1"
preferred_html_marker = "VOID_MAINNET0_VALIDATOR_PUBLIC_VISIBILITY_ROOT_TO_REVIEWER_CHAIN_AUDIT_FINAL_SEAL_HTML_CARD_HOLD_V1"
section_key = "mainnet0_validator_root_to_reviewer_audit_final_seal_entrypoint_closeout_final_seal"

section_index_path = Path("public/public-node/validators/index.json")
seal_path = Path("public/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-final-seal-hold-v1.json")
doc_path = Path("docs/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-final-seal-hold-v1.md")
proof_path = Path("ops/mainnet0/void-mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-final-seal-hold-v1-proof.sh")

closeout_path = Path("public/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-rollup-hold-v1.json")
html_path = Path("public/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-rollup-html-card-hold-v1.html")
html_json_path = Path("public/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-rollup-html-card-hold-v1.json")
runtime_path = Path("public/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-rollup-html-runtime-visibility-hold-v1.json")
polish_path = Path("public/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-polish-hold-v1.json")
entry_runtime_path = Path("public/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-runtime-visibility-hold-v1.json")
preferred_html_path = Path("public/public-node/validators/mainnet0-validator-public-visibility-root-to-reviewer-chain-audit-final-seal-html-card-hold-v1.html")

seal_route = "/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-final-seal-hold-v1.json"
closeout_route = "/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-rollup-hold-v1.json"
html_route = "/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-rollup-html-card-hold-v1.html"
html_json_route = "/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-rollup-html-card-hold-v1.json"
runtime_route = "/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-rollup-html-runtime-visibility-hold-v1.json"
polish_route = "/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-polish-hold-v1.json"
entry_runtime_route = "/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-runtime-visibility-hold-v1.json"
preferred_html_route = "/public-node/validators/mainnet0-validator-public-visibility-root-to-reviewer-chain-audit-final-seal-html-card-hold-v1.html"

def load_json(path):
    return json.loads(path.read_text())

def ensure(cond, msg):
    if not cond:
        raise SystemExit(msg)

print("== JSON parse ==")
section_index = load_json(section_index_path)
seal = load_json(seal_path)
closeout = load_json(closeout_path)
html_card = load_json(html_json_path)
runtime = load_json(runtime_path)
load_json(polish_path)
load_json(entry_runtime_path)
print("json_green=true")

print("== source chain presence ==")
for path, expected in [
    (closeout_path, closeout_marker),
    (html_path, html_marker),
    (html_json_path, html_marker),
    (runtime_path, runtime_marker),
    (polish_path, polish_marker),
    (entry_runtime_path, entry_runtime_marker),
    (preferred_html_path, preferred_html_marker),
]:
    ensure(expected in path.read_text(), f"missing {expected} in {path}")
print("source_chain_green=true")

print("== final seal binding ==")
ensure(closeout.get("marker") == closeout_marker, "closeout marker mismatch")
ensure(closeout.get("preferred_browser_visible_reviewer_route") == preferred_html_route, "closeout preferred route mismatch")
ensure(html_card.get("marker") == html_marker, "html card marker mismatch")
ensure(html_card.get("source_closeout_rollup_route") == closeout_route, "html card closeout route mismatch")
ensure(runtime.get("marker") == runtime_marker, "runtime marker mismatch")
ensure(runtime.get("source_html_card_route") == html_route, "runtime html route mismatch")
ensure(section_index.get(section_key, {}).get("marker") == marker, "section final seal marker mismatch")
ensure(section_index[section_key].get("route") == seal_route, "section final seal route mismatch")
ensure(seal.get("marker") == marker, "seal marker mismatch")
ensure(seal.get("route") == seal_route, "seal route mismatch")
ensure(seal.get("source_closeout_rollup_route") == closeout_route, "seal closeout route mismatch")
ensure(seal.get("source_closeout_rollup_html_card_route") == html_route, "seal html route mismatch")
ensure(seal.get("source_closeout_rollup_html_card_json_route") == html_json_route, "seal html json route mismatch")
ensure(seal.get("source_closeout_rollup_html_runtime_visibility_route") == runtime_route, "seal runtime route mismatch")
ensure(seal.get("source_entrypoint_polish_route") == polish_route, "seal polish route mismatch")
ensure(seal.get("source_entrypoint_runtime_visibility_route") == entry_runtime_route, "seal entry runtime route mismatch")
ensure(seal.get("preferred_browser_visible_reviewer_route") == preferred_html_route, "seal preferred route mismatch")
assertions = seal.get("final_seal_assertions", {})
for key in [
    "closeout_rollup_present",
    "closeout_html_card_present",
    "closeout_html_runtime_visibility_present",
    "root_entrypoint_polish_present",
    "root_entrypoint_runtime_visibility_present",
    "preferred_browser_visible_reviewer_route_present",
    "public_safe_read_only",
]:
    ensure(assertions.get(key) is True, f"assertion {key} must be true")
ensure(assertions.get("runtime_mutation_enabled") is False, "runtime mutation must remain false")
print("validator_public_node_root_to_reviewer_audit_final_seal_entrypoint_closeout_final_seal_binding_green=true")

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
print("VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_CLOSEOUT_FINAL_SEAL_HOLD_V1_GREEN")
PYPROOF
