#!/usr/bin/env bash
set -euo pipefail

python3 - <<'PYPROOF'
from pathlib import Path
import json

marker = "VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_CLOSEOUT_ROLLUP_HTML_CARD_HOLD_V1"
closeout_marker = "VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_CLOSEOUT_ROLLUP_HOLD_V1"
polish_marker = "VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_POLISH_HOLD_V1"
runtime_marker = "VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_RUNTIME_VISIBILITY_HOLD_V1"
final_html_marker = "VOID_MAINNET0_VALIDATOR_PUBLIC_VISIBILITY_ROOT_TO_REVIEWER_CHAIN_AUDIT_FINAL_SEAL_HTML_CARD_HOLD_V1"
section_key = "mainnet0_validator_root_to_reviewer_audit_final_seal_entrypoint_closeout_rollup_html_card"

section_index_path = Path("public/public-node/validators/index.json")
json_path = Path("public/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-rollup-html-card-hold-v1.json")
html_path = Path("public/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-rollup-html-card-hold-v1.html")
doc_path = Path("docs/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-rollup-html-card-hold-v1.md")
proof_path = Path("ops/mainnet0/void-mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-rollup-html-card-hold-v1-proof.sh")

closeout_path = Path("public/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-rollup-hold-v1.json")
polish_path = Path("public/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-polish-hold-v1.json")
runtime_path = Path("public/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-runtime-visibility-hold-v1.json")
final_html_path = Path("public/public-node/validators/mainnet0-validator-public-visibility-root-to-reviewer-chain-audit-final-seal-html-card-hold-v1.html")

html_route = "/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-rollup-html-card-hold-v1.html"
json_route = "/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-rollup-html-card-hold-v1.json"
closeout_route = "/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-rollup-hold-v1.json"
polish_route = "/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-polish-hold-v1.json"
runtime_route = "/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-runtime-visibility-hold-v1.json"
final_html_route = "/public-node/validators/mainnet0-validator-public-visibility-root-to-reviewer-chain-audit-final-seal-html-card-hold-v1.html"

def load_json(path):
    return json.loads(path.read_text())

def ensure(cond, msg):
    if not cond:
        raise SystemExit(msg)

print("== JSON parse ==")
section_index = load_json(section_index_path)
card = load_json(json_path)
closeout = load_json(closeout_path)
load_json(polish_path)
load_json(runtime_path)
print("json_green=true")

print("== source chain presence ==")
for path, expected in [
    (closeout_path, closeout_marker),
    (polish_path, polish_marker),
    (runtime_path, runtime_marker),
    (final_html_path, final_html_marker),
]:
    ensure(expected in path.read_text(), f"missing {expected} in {path}")
print("source_chain_green=true")

print("== html source ==")
html_text = html_path.read_text()
ensure(marker in html_text, "html marker missing")
ensure(closeout_route in html_text, "html closeout route missing")
ensure(polish_route in html_text, "html polish route missing")
ensure(runtime_route in html_text, "html runtime route missing")
ensure(final_html_route in html_text, "html preferred route missing")
print("html_source_green=true")

print("== html card binding ==")
ensure(closeout.get("marker") == closeout_marker, "closeout marker mismatch")
ensure(closeout.get("preferred_browser_visible_reviewer_route") == final_html_route, "closeout preferred route mismatch")
ensure(section_index.get(section_key, {}).get("marker") == marker, "section html card marker mismatch")
ensure(section_index[section_key].get("html_route") == html_route, "section html route mismatch")
ensure(section_index[section_key].get("route") == json_route, "section json route mismatch")
ensure(card.get("marker") == marker, "card marker mismatch")
ensure(card.get("route") == html_route, "card html route mismatch")
ensure(card.get("json_route") == json_route, "card json route mismatch")
ensure(card.get("source_closeout_rollup_route") == closeout_route, "card closeout route mismatch")
ensure(card.get("source_entrypoint_polish_route") == polish_route, "card polish route mismatch")
ensure(card.get("source_entrypoint_runtime_visibility_route") == runtime_route, "card runtime route mismatch")
ensure(card.get("preferred_browser_visible_reviewer_route") == final_html_route, "card preferred route mismatch")
print("validator_public_node_root_to_reviewer_audit_final_seal_entrypoint_closeout_rollup_html_card_binding_green=true")

print("== marker presence ==")
for path in [section_index_path, json_path, html_path, doc_path, proof_path]:
    ensure(marker in path.read_text(), f"marker missing from {path}")
print("marker_green=true")

print("== forbidden enablement boundary ==")
boundary = card.get("boundary", {})
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
for path in [section_index_path, json_path, html_path, doc_path]:
    text = path.read_text().lower()
    for needle in bad_needles:
        ensure(needle not in text, f"forbidden enablement {needle} in {path}")
print("forbidden_enablement_scan_green=true")

print("== result ==")
print("VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_CLOSEOUT_ROLLUP_HTML_CARD_HOLD_V1_GREEN")
PYPROOF
