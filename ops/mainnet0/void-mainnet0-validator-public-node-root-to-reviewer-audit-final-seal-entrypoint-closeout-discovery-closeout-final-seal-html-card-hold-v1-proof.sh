#!/usr/bin/env bash
set -euo pipefail
python3 - <<'PYPROOF'
from pathlib import Path
import json

marker = "VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_CLOSEOUT_DISCOVERY_CLOSEOUT_FINAL_SEAL_HTML_CARD_HOLD_V1"
closeout_seal_marker = "VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_CLOSEOUT_DISCOVERY_CLOSEOUT_FINAL_SEAL_HOLD_V1"
rollup_marker = "VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_CLOSEOUT_DISCOVERY_CLOSEOUT_ROLLUP_HOLD_V1"
rollup_html_marker = "VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_CLOSEOUT_DISCOVERY_CLOSEOUT_ROLLUP_HTML_CARD_HOLD_V1"
rollup_html_runtime_marker = "VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_CLOSEOUT_DISCOVERY_CLOSEOUT_ROLLUP_HTML_RUNTIME_VISIBILITY_HOLD_V1"
discovery_seal_marker = "VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_CLOSEOUT_DISCOVERY_FINAL_SEAL_HOLD_V1"
discovery_seal_html_marker = "VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_CLOSEOUT_DISCOVERY_FINAL_SEAL_HTML_CARD_HOLD_V1"
discovery_seal_html_runtime_marker = "VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_CLOSEOUT_DISCOVERY_FINAL_SEAL_HTML_RUNTIME_VISIBILITY_HOLD_V1"
section_key = "mainnet0_validator_root_to_reviewer_audit_final_seal_entrypoint_closeout_discovery_closeout_final_seal_html_card"

section_index_path = Path("public/public-node/validators/index.json")
json_path = Path("public/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-closeout-final-seal-html-card-hold-v1.json")
html_path = Path("public/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-closeout-final-seal-html-card-hold-v1.html")
doc_path = Path("docs/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-closeout-final-seal-html-card-hold-v1.md")
proof_path = Path("ops/mainnet0/void-mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-closeout-final-seal-html-card-hold-v1-proof.sh")

closeout_seal_path = Path("public/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-closeout-final-seal-hold-v1.json")
rollup_path = Path("public/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-closeout-rollup-hold-v1.json")
rollup_html_path = Path("public/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-closeout-rollup-html-card-hold-v1.html")
rollup_html_json_path = Path("public/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-closeout-rollup-html-card-hold-v1.json")
rollup_html_runtime_path = Path("public/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-closeout-rollup-html-runtime-visibility-hold-v1.json")
discovery_seal_path = Path("public/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-final-seal-hold-v1.json")
discovery_seal_html_path = Path("public/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-final-seal-html-card-hold-v1.html")
discovery_seal_html_json_path = Path("public/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-final-seal-html-card-hold-v1.json")
discovery_seal_html_runtime_path = Path("public/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-final-seal-html-runtime-visibility-hold-v1.json")

html_route = "/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-closeout-final-seal-html-card-hold-v1.html"
json_route = "/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-closeout-final-seal-html-card-hold-v1.json"
closeout_seal_route = "/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-closeout-final-seal-hold-v1.json"
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
card = load_json(json_path)
closeout_seal = load_json(closeout_seal_path)
rollup = load_json(rollup_path)
rollup_html = load_json(rollup_html_json_path)
rollup_html_runtime = load_json(rollup_html_runtime_path)
discovery_seal = load_json(discovery_seal_path)
discovery_seal_html = load_json(discovery_seal_html_json_path)
discovery_seal_html_runtime = load_json(discovery_seal_html_runtime_path)
print("json_green=true")

print("== source chain presence ==")
for path, expected in [
    (closeout_seal_path, closeout_seal_marker),
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

print("== html source ==")
html_text = html_path.read_text()
for needle in [marker, closeout_seal_route, rollup_route, rollup_html_route, rollup_html_runtime_route, discovery_seal_route, html_route]:
    ensure(needle in html_text, f"html missing {needle}")
print("html_source_green=true")

print("== html card binding ==")
ensure(closeout_seal.get("marker") == closeout_seal_marker, "closeout seal marker mismatch")
ensure(closeout_seal.get("source_closeout_rollup_route") == rollup_route, "closeout seal rollup route mismatch")
ensure(closeout_seal.get("source_closeout_rollup_html_card_route") == rollup_html_route, "closeout seal rollup html route mismatch")
ensure(closeout_seal.get("source_closeout_rollup_html_runtime_visibility_route") == rollup_html_runtime_route, "closeout seal rollup html runtime route mismatch")
ensure(closeout_seal.get("source_discovery_final_seal_route") == discovery_seal_route, "closeout seal discovery seal route mismatch")
ensure(closeout_seal.get("source_discovery_final_seal_html_card_route") == discovery_seal_html_route, "closeout seal discovery seal html route mismatch")
ensure(closeout_seal.get("source_discovery_final_seal_html_runtime_visibility_route") == discovery_seal_html_runtime_route, "closeout seal discovery seal html runtime route mismatch")
ensure(closeout_seal.get("preferred_browser_visible_reviewer_route") == rollup_html_route, "closeout seal previous preferred route mismatch")

ensure(rollup.get("marker") == rollup_marker, "rollup marker mismatch")
ensure(rollup_html.get("marker") == rollup_html_marker, "rollup html marker mismatch")
ensure(rollup_html.get("route") == rollup_html_route, "rollup html route mismatch")
ensure(rollup_html_runtime.get("marker") == rollup_html_runtime_marker, "rollup html runtime marker mismatch")
ensure(rollup_html_runtime.get("source_html_card_route") == rollup_html_route, "rollup html runtime source route mismatch")
ensure(discovery_seal.get("marker") == discovery_seal_marker, "discovery seal marker mismatch")
ensure(discovery_seal_html.get("marker") == discovery_seal_html_marker, "discovery seal html marker mismatch")
ensure(discovery_seal_html.get("route") == discovery_seal_html_route, "discovery seal html route mismatch")
ensure(discovery_seal_html_runtime.get("marker") == discovery_seal_html_runtime_marker, "discovery seal html runtime marker mismatch")
ensure(discovery_seal_html_runtime.get("source_html_card_route") == discovery_seal_html_route, "discovery seal html runtime source route mismatch")

ensure(section_index.get(section_key, {}).get("marker") == marker, "section marker mismatch")
ensure(section_index[section_key].get("html_route") == html_route, "section html route mismatch")
ensure(section_index[section_key].get("route") == json_route, "section json route mismatch")

ensure(card.get("marker") == marker, "card marker mismatch")
ensure(card.get("route") == html_route, "card html route mismatch")
ensure(card.get("json_route") == json_route, "card json route mismatch")
ensure(card.get("source_closeout_final_seal_route") == closeout_seal_route, "card closeout seal route mismatch")
ensure(card.get("source_closeout_rollup_route") == rollup_route, "card rollup route mismatch")
ensure(card.get("source_closeout_rollup_html_card_route") == rollup_html_route, "card rollup html route mismatch")
ensure(card.get("source_closeout_rollup_html_card_json_route") == rollup_html_json_route, "card rollup html json route mismatch")
ensure(card.get("source_closeout_rollup_html_runtime_visibility_route") == rollup_html_runtime_route, "card rollup html runtime route mismatch")
ensure(card.get("source_discovery_final_seal_route") == discovery_seal_route, "card discovery seal route mismatch")
ensure(card.get("source_discovery_final_seal_html_card_route") == discovery_seal_html_route, "card discovery seal html route mismatch")
ensure(card.get("source_discovery_final_seal_html_card_json_route") == discovery_seal_html_json_route, "card discovery seal html json route mismatch")
ensure(card.get("source_discovery_final_seal_html_runtime_visibility_route") == discovery_seal_html_runtime_route, "card discovery seal html runtime route mismatch")
ensure(card.get("previous_preferred_browser_visible_reviewer_route") == rollup_html_route, "card previous preferred route mismatch")
ensure(card.get("preferred_browser_visible_reviewer_route") == html_route, "card preferred route mismatch")
print("validator_public_node_root_to_reviewer_audit_final_seal_entrypoint_closeout_discovery_closeout_final_seal_html_card_binding_green=true")

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
print("VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_CLOSEOUT_DISCOVERY_CLOSEOUT_FINAL_SEAL_HTML_CARD_HOLD_V1_GREEN")
PYPROOF
