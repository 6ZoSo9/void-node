#!/usr/bin/env bash
set -euo pipefail

python3 - <<'PYPROOF'
from pathlib import Path
import json

marker = "VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_CLOSEOUT_DISCOVERY_FINAL_SEAL_HTML_CARD_HOLD_V1"
seal_marker = "VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_CLOSEOUT_DISCOVERY_FINAL_SEAL_HOLD_V1"
discovery_marker = "VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_CLOSEOUT_DISCOVERY_POLISH_HOLD_V1"
discovery_runtime_marker = "VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_CLOSEOUT_DISCOVERY_POLISH_RUNTIME_VISIBILITY_HOLD_V1"
closeout_final_html_marker = "VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_CLOSEOUT_FINAL_SEAL_HTML_CARD_HOLD_V1"
closeout_final_runtime_marker = "VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_CLOSEOUT_FINAL_SEAL_HTML_RUNTIME_VISIBILITY_HOLD_V1"
section_key = "mainnet0_validator_root_to_reviewer_audit_final_seal_entrypoint_closeout_discovery_final_seal_html_card"

section_index_path = Path("public/public-node/validators/index.json")
json_path = Path("public/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-final-seal-html-card-hold-v1.json")
html_path = Path("public/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-final-seal-html-card-hold-v1.html")
doc_path = Path("docs/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-final-seal-html-card-hold-v1.md")
proof_path = Path("ops/mainnet0/void-mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-final-seal-html-card-hold-v1-proof.sh")

seal_path = Path("public/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-final-seal-hold-v1.json")
discovery_path = Path("public/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-polish-hold-v1.json")
discovery_runtime_path = Path("public/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-polish-runtime-visibility-hold-v1.json")
closeout_final_html_path = Path("public/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-final-seal-html-card-hold-v1.html")
closeout_final_html_json_path = Path("public/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-final-seal-html-card-hold-v1.json")
closeout_final_runtime_path = Path("public/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-final-seal-html-runtime-visibility-hold-v1.json")

html_route = "/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-final-seal-html-card-hold-v1.html"
json_route = "/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-final-seal-html-card-hold-v1.json"
seal_route = "/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-final-seal-hold-v1.json"
discovery_route = "/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-polish-hold-v1.json"
discovery_runtime_route = "/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-polish-runtime-visibility-hold-v1.json"
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
card = load_json(json_path)
seal = load_json(seal_path)
discovery = load_json(discovery_path)
discovery_runtime = load_json(discovery_runtime_path)
closeout_final_html = load_json(closeout_final_html_json_path)
closeout_final_runtime = load_json(closeout_final_runtime_path)
print("json_green=true")

print("== source chain presence ==")
for path, expected in [
    (seal_path, seal_marker),
    (discovery_path, discovery_marker),
    (discovery_runtime_path, discovery_runtime_marker),
    (closeout_final_html_path, closeout_final_html_marker),
    (closeout_final_html_json_path, closeout_final_html_marker),
    (closeout_final_runtime_path, closeout_final_runtime_marker),
]:
    ensure(expected in path.read_text(), f"missing {expected} in {path}")
print("source_chain_green=true")

print("== html source ==")
html_text = html_path.read_text()
ensure(marker in html_text, "html marker missing")
ensure(seal_route in html_text, "html seal route missing")
ensure(discovery_route in html_text, "html discovery route missing")
ensure(discovery_runtime_route in html_text, "html discovery runtime route missing")
ensure(html_route in html_text, "html self route missing")
print("html_source_green=true")

print("== html card binding ==")
ensure(seal.get("marker") == seal_marker, "seal marker mismatch")
ensure(seal.get("source_discovery_polish_route") == discovery_route, "seal discovery route mismatch")
ensure(seal.get("source_discovery_polish_runtime_visibility_route") == discovery_runtime_route, "seal discovery runtime route mismatch")
ensure(discovery.get("marker") == discovery_marker, "discovery marker mismatch")
ensure(discovery_runtime.get("marker") == discovery_runtime_marker, "discovery runtime marker mismatch")
ensure(closeout_final_html.get("marker") == closeout_final_html_marker, "closeout final html marker mismatch")
ensure(closeout_final_html.get("route") == closeout_final_html_route, "closeout final html route mismatch")
ensure(closeout_final_runtime.get("marker") == closeout_final_runtime_marker, "closeout final runtime marker mismatch")
ensure(closeout_final_runtime.get("source_html_card_route") == closeout_final_html_route, "closeout final runtime html route mismatch")
ensure(section_index.get(section_key, {}).get("marker") == marker, "section html marker mismatch")
ensure(section_index[section_key].get("html_route") == html_route, "section html route mismatch")
ensure(section_index[section_key].get("route") == json_route, "section json route mismatch")
ensure(card.get("marker") == marker, "card marker mismatch")
ensure(card.get("route") == html_route, "card html route mismatch")
ensure(card.get("json_route") == json_route, "card json route mismatch")
ensure(card.get("source_discovery_final_seal_route") == seal_route, "card seal route mismatch")
ensure(card.get("source_discovery_polish_route") == discovery_route, "card discovery route mismatch")
ensure(card.get("source_discovery_polish_runtime_visibility_route") == discovery_runtime_route, "card discovery runtime route mismatch")
ensure(card.get("source_closeout_final_seal_html_card_route") == closeout_final_html_route, "card closeout final html route mismatch")
ensure(card.get("source_closeout_final_seal_html_card_json_route") == closeout_final_html_json_route, "card closeout final html json route mismatch")
ensure(card.get("source_closeout_final_seal_html_runtime_visibility_route") == closeout_final_runtime_route, "card closeout final runtime route mismatch")
ensure(card.get("preferred_browser_visible_reviewer_route") == html_route, "card preferred route mismatch")
print("validator_public_node_root_to_reviewer_audit_final_seal_entrypoint_closeout_discovery_final_seal_html_card_binding_green=true")

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
print("VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_CLOSEOUT_DISCOVERY_FINAL_SEAL_HTML_CARD_HOLD_V1_GREEN")
PYPROOF
