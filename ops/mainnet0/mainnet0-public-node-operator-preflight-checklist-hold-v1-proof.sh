#!/usr/bin/env bash
set -euo pipefail

MARKER="VOID_MAINNET0_PUBLIC_NODE_OPERATOR_PREFLIGHT_CHECKLIST_HOLD_V1_GREEN"
SOURCE_MARKER="VOID_MAINNET0_PUBLIC_NODE_OPERATOR_READINESS_MATRIX_HOLD_V1_GREEN"
LANE="mainnet0-public-node-operator-preflight-checklist-hold-v1"
MATRIX="mainnet0-public-node-operator-readiness-matrix-hold-v1"

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

DOC="docs/public-node/${LANE}.md"
SCHEMA="schemas/public-node/${LANE}.schema.json"
EXAMPLE="examples/public-node/${LANE}.example.json"
PUBLIC_JSON="public/public-node/${LANE}.json"
PUBLIC_HTML="public/public-node/${LANE}.html"
MATRIX_JSON="public/public-node/${MATRIX}.json"
MATRIX_HTML="public/public-node/${MATRIX}.html"

for file in "$DOC" "$SCHEMA" "$EXAMPLE" "$PUBLIC_JSON" "$PUBLIC_HTML" "$MATRIX_JSON" "$MATRIX_HTML"; do
  test -f "$file"
done

python3 - <<'PY'
import json
from pathlib import Path

marker = "VOID_MAINNET0_PUBLIC_NODE_OPERATOR_PREFLIGHT_CHECKLIST_HOLD_V1_GREEN"
source_marker = "VOID_MAINNET0_PUBLIC_NODE_OPERATOR_READINESS_MATRIX_HOLD_V1_GREEN"
lane = "mainnet0-public-node-operator-preflight-checklist-hold-v1"
matrix = "mainnet0-public-node-operator-readiness-matrix-hold-v1"

paths = {
    "doc": Path(f"docs/public-node/{lane}.md"),
    "schema": Path(f"schemas/public-node/{lane}.schema.json"),
    "example": Path(f"examples/public-node/{lane}.example.json"),
    "public_json": Path(f"public/public-node/{lane}.json"),
    "public_html": Path(f"public/public-node/{lane}.html"),
    "matrix_json": Path(f"public/public-node/{matrix}.json"),
    "matrix_html": Path(f"public/public-node/{matrix}.html"),
}

doc = paths["doc"].read_text()
html = paths["public_html"].read_text()
schema = json.loads(paths["schema"].read_text())
example = json.loads(paths["example"].read_text())
public_json = json.loads(paths["public_json"].read_text())
matrix_payload = json.loads(paths["matrix_json"].read_text())
matrix_html = paths["matrix_html"].read_text()

if marker not in doc:
    raise SystemExit("marker missing from doc")
if marker not in html:
    raise SystemExit("marker missing from html")
if matrix_payload.get("marker") != source_marker:
    raise SystemExit("source matrix marker mismatch")
if source_marker not in matrix_html:
    raise SystemExit("source marker missing from matrix html")

for payload_name, payload in [("example", example), ("public_json", public_json)]:
    if payload.get("marker") != marker:
        raise SystemExit(f"{payload_name} marker mismatch")
    if payload.get("lane") != lane:
        raise SystemExit(f"{payload_name} lane mismatch")
    if payload.get("status") != "preflight_checklist_hold":
        raise SystemExit(f"{payload_name} status mismatch")
    if payload.get("public_surface") != "read_only_static_preflight_checklist":
        raise SystemExit(f"{payload_name} public surface mismatch")

    source = payload.get("source_matrix", {})
    if source.get("marker") != source_marker:
        raise SystemExit(f"{payload_name} source marker mismatch")
    if source.get("lane") != matrix:
        raise SystemExit(f"{payload_name} source lane mismatch")

    authority = payload.get("authority", {})
    expected_false = [
        "registration_enabled",
        "validator_activation_enabled",
        "staking_enabled",
        "wallet_connect_enabled",
        "public_mutation_enabled",
        "ledger_write_enabled",
        "peer_state_write_enabled",
        "validator_set_write_enabled",
        "submit_enabled",
    ]
    for key in expected_false:
        if authority.get(key) is not False:
            raise SystemExit(f"{payload_name} authority {key} is not false")

    item_ids = [item.get("id") for item in payload.get("checklist_items", [])]
    expected_ids = [
        "repository_source_verification",
        "machine_stability",
        "operating_system_hygiene",
        "runtime_dependency_readiness",
        "firewall_router_review",
        "public_reachability_plan",
        "datanet_storage_plan",
        "backup_restore_plan",
        "uptime_power_plan",
        "logs_monitoring_plan",
        "secrets_boundary",
        "validator_separation",
        "wallet_funding_boundary",
        "operator_acknowledgement",
    ]
    if item_ids != expected_ids:
        raise SystemExit(f"{payload_name} checklist ids mismatch: {item_ids}")

    for item in payload.get("checklist_items", []):
        if item.get("status") != "operator_self_check_only":
            raise SystemExit(f"{payload_name} item not self-check-only: {item}")

required_schema = [
    "marker",
    "lane",
    "status",
    "public_surface",
    "source_matrix",
    "authority",
    "checklist_items",
    "boundary",
    "operator_notice",
]
if schema.get("required") != required_schema:
    raise SystemExit("schema required list mismatch")

for forbidden in [
    "<form",
    "method=\"post\"",
    "action=\"",
    "connectWallet(",
    "signTransaction(",
    "sendTransaction(",
    "registerNode(",
    "activateValidator(",
    "privateKey",
    "mnemonic",
    "seed phrase",
    "wallet_secret",
]:
    for name in ["doc", "schema", "example", "public_json", "public_html"]:
        if forbidden in paths[name].read_text():
            raise SystemExit(f"forbidden token {forbidden!r} found in {name}")

print(marker)
PY
