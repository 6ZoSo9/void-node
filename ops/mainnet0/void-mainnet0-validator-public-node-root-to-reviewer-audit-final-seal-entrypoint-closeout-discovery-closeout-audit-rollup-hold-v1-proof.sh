#!/usr/bin/env bash
set -euo pipefail
python3 - <<'PYPROOF'
from pathlib import Path
import json

marker = "VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_CLOSEOUT_DISCOVERY_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1"
section_key = "mainnet0_validator_root_to_reviewer_audit_final_seal_entrypoint_closeout_discovery_closeout_audit_rollup"
sources = [('discovery_polish', 'mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-polish-hold-v1', 'VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_CLOSEOUT_DISCOVERY_POLISH_HOLD_V1', 'json'), ('discovery_polish_runtime_visibility', 'mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-polish-runtime-visibility-hold-v1', 'VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_CLOSEOUT_DISCOVERY_POLISH_RUNTIME_VISIBILITY_HOLD_V1', 'json'), ('discovery_final_seal', 'mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-final-seal-hold-v1', 'VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_CLOSEOUT_DISCOVERY_FINAL_SEAL_HOLD_V1', 'json'), ('discovery_final_seal_html_card', 'mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-final-seal-html-card-hold-v1', 'VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_CLOSEOUT_DISCOVERY_FINAL_SEAL_HTML_CARD_HOLD_V1', 'html_json'), ('discovery_final_seal_html_runtime_visibility', 'mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-final-seal-html-runtime-visibility-hold-v1', 'VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_CLOSEOUT_DISCOVERY_FINAL_SEAL_HTML_RUNTIME_VISIBILITY_HOLD_V1', 'json'), ('discovery_closeout_rollup', 'mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-closeout-rollup-hold-v1', 'VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_CLOSEOUT_DISCOVERY_CLOSEOUT_ROLLUP_HOLD_V1', 'json'), ('discovery_closeout_rollup_html_card', 'mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-closeout-rollup-html-card-hold-v1', 'VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_CLOSEOUT_DISCOVERY_CLOSEOUT_ROLLUP_HTML_CARD_HOLD_V1', 'html_json'), ('discovery_closeout_rollup_html_runtime_visibility', 'mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-closeout-rollup-html-runtime-visibility-hold-v1', 'VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_CLOSEOUT_DISCOVERY_CLOSEOUT_ROLLUP_HTML_RUNTIME_VISIBILITY_HOLD_V1', 'json'), ('discovery_closeout_final_seal', 'mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-closeout-final-seal-hold-v1', 'VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_CLOSEOUT_DISCOVERY_CLOSEOUT_FINAL_SEAL_HOLD_V1', 'json'), ('discovery_closeout_final_seal_html_card', 'mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-closeout-final-seal-html-card-hold-v1', 'VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_CLOSEOUT_DISCOVERY_CLOSEOUT_FINAL_SEAL_HTML_CARD_HOLD_V1', 'html_json'), ('discovery_closeout_final_seal_html_runtime_visibility', 'mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-closeout-final-seal-html-runtime-visibility-hold-v1', 'VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_CLOSEOUT_DISCOVERY_CLOSEOUT_FINAL_SEAL_HTML_RUNTIME_VISIBILITY_HOLD_V1', 'json')]

section_index_path = Path("public/public-node/validators/index.json")
rollup_path = Path("public/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-closeout-audit-rollup-hold-v1.json")
doc_path = Path("docs/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-closeout-audit-rollup-hold-v1.md")
proof_path = Path("ops/mainnet0/void-mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-closeout-audit-rollup-hold-v1-proof.sh")

rollup_route = "/public-node/validators/mainnet0-validator-public-node-root-to-reviewer-audit-final-seal-entrypoint-closeout-discovery-closeout-audit-rollup-hold-v1.json"

def load_json(path):
    return json.loads(path.read_text())

def ensure(cond, msg):
    if not cond:
        raise SystemExit(msg)

print("== JSON parse ==")
section_index = load_json(section_index_path)
rollup = load_json(rollup_path)
print("json_green=true")

print("== source record presence ==")
expected_records = []
for key, source_brick, source_marker, source_type in sources:
    json_path = Path("public/public-node/validators") / f"{source_brick}.json"
    json_text = json_path.read_text()
    ensure(source_marker in json_text, f"missing {source_marker} in {json_path}")
    obj = load_json(json_path)
    ensure(obj.get("marker") == source_marker, f"marker mismatch for {source_brick}")
    route = f"/public-node/validators/{source_brick}.json"
    html_route = None
    if source_type == "html_json":
        html_path = Path("public/public-node/validators") / f"{source_brick}.html"
        html_text = html_path.read_text()
        ensure(source_marker in html_text, f"missing {source_marker} in {html_path}")
        html_route = f"/public-node/validators/{source_brick}.html"
        ensure(obj.get("route") == html_route, f"html route mismatch for {source_brick}")
        ensure(obj.get("json_route") == route, f"json route mismatch for {source_brick}")
    else:
        ensure(obj.get("route") == route, f"route mismatch for {source_brick}")
    expected_records.append((key, source_brick, source_marker, route, html_route))
print("source_record_presence_green=true")

print("== audit rollup binding ==")
ensure(section_index.get(section_key, {}).get("marker") == marker, "section marker mismatch")
ensure(section_index[section_key].get("route") == rollup_route, "section route mismatch")
ensure(rollup.get("marker") == marker, "rollup marker mismatch")
ensure(rollup.get("route") == rollup_route, "rollup route mismatch")
ensure(rollup.get("source_record_count") == len(expected_records), "source record count mismatch")
records = rollup.get("source_records", [])
ensure(len(records) == len(expected_records), "rollup source records length mismatch")

by_key = {r.get("key"): r for r in records}
for key, source_brick, source_marker, route, html_route in expected_records:
    ensure(key in by_key, f"missing rollup source key {key}")
    rec = by_key[key]
    ensure(rec.get("brick") == source_brick, f"brick mismatch for {key}")
    ensure(rec.get("marker") == source_marker, f"marker mismatch for {key}")
    ensure(rec.get("route") == route, f"route mismatch for {key}")
    ensure(rec.get("html_route") == html_route, f"html route mismatch for {key}")

latest_card = by_key["discovery_closeout_final_seal_html_card"]
latest_runtime = by_key["discovery_closeout_final_seal_html_runtime_visibility"]
ensure(rollup.get("preferred_browser_visible_reviewer_route") == latest_card.get("html_route"), "preferred browser route mismatch")
ensure(rollup.get("latest_runtime_visibility_route") == latest_runtime.get("route"), "latest runtime route mismatch")
ensure(section_index[section_key].get("preferred_browser_visible_reviewer_route") == latest_card.get("html_route"), "section preferred route mismatch")
ensure(section_index[section_key].get("latest_runtime_visibility_route") == latest_runtime.get("route"), "section latest runtime route mismatch")

assertions = rollup.get("audit_assertions", {})
for key in [
    "all_expected_source_records_present",
    "all_expected_markers_present",
    "latest_browser_visible_reviewer_route_present",
    "latest_runtime_visibility_present",
    "public_safe_read_only",
]:
    ensure(assertions.get(key) is True, f"assertion {key} must be true")
ensure(assertions.get("runtime_mutation_enabled") is False, "runtime mutation must remain false")
print("validator_public_node_root_to_reviewer_audit_final_seal_entrypoint_closeout_discovery_closeout_audit_rollup_binding_green=true")

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
print("VOID_MAINNET0_VALIDATOR_PUBLIC_NODE_ROOT_TO_REVIEWER_AUDIT_FINAL_SEAL_ENTRYPOINT_CLOSEOUT_DISCOVERY_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1_GREEN")
PYPROOF
