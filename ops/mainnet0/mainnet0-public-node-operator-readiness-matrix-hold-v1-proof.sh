#!/usr/bin/env bash
set -euo pipefail

MARKER="VOID_MAINNET0_PUBLIC_NODE_OPERATOR_READINESS_MATRIX_HOLD_V1_GREEN"
LANE="mainnet0-public-node-operator-readiness-matrix-hold-v1"

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

DOC="docs/public-node/${LANE}.md"
SCHEMA="schemas/public-node/${LANE}.schema.json"
EXAMPLE="examples/public-node/${LANE}.example.json"
PUBLIC_JSON="public/public-node/${LANE}.json"
PUBLIC_HTML="public/public-node/${LANE}.html"

for file in "$DOC" "$SCHEMA" "$EXAMPLE" "$PUBLIC_JSON" "$PUBLIC_HTML"; do
  test -f "$file"
done

python3 - <<'PY'
import json
from pathlib import Path

marker = "VOID_MAINNET0_PUBLIC_NODE_OPERATOR_READINESS_MATRIX_HOLD_V1_GREEN"
lane = "mainnet0-public-node-operator-readiness-matrix-hold-v1"

paths = {
    "doc": Path(f"docs/public-node/{lane}.md"),
    "schema": Path(f"schemas/public-node/{lane}.schema.json"),
    "example": Path(f"examples/public-node/{lane}.example.json"),
    "public_json": Path(f"public/public-node/{lane}.json"),
    "public_html": Path(f"public/public-node/{lane}.html"),
}

for name, path in paths.items():
    if not path.exists():
        raise SystemExit(f"missing {name}: {path}")

doc = paths["doc"].read_text()
html = paths["public_html"].read_text()
schema = json.loads(paths["schema"].read_text())
example = json.loads(paths["example"].read_text())
public_json = json.loads(paths["public_json"].read_text())

if marker not in doc:
    raise SystemExit("marker missing from doc")
if marker not in html:
    raise SystemExit("marker missing from html")

for payload_name, payload in [("example", example), ("public_json", public_json)]:
    if payload.get("marker") != marker:
        raise SystemExit(f"{payload_name} marker mismatch")
    if payload.get("lane") != lane:
        raise SystemExit(f"{payload_name} lane mismatch")
    if payload.get("status") != "readiness_hold":
        raise SystemExit(f"{payload_name} status mismatch")
    if payload.get("public_surface") != "read_only_static_visibility":
        raise SystemExit(f"{payload_name} public surface mismatch")

    authority = payload.get("authority", {})
    expected_false = [
        "registration_enabled",
        "validator_activation_enabled",
        "staking_enabled",
        "wallet_connect_enabled",
        "public_mutation_enabled",
        "ledger_write_enabled",
        "validator_set_write_enabled",
        "peer_state_write_enabled",
    ]
    for key in expected_false:
        if authority.get(key) is not False:
            raise SystemExit(f"{payload_name} authority {key} is not false")

    categories = [item.get("id") for item in payload.get("readiness_categories", [])]
    expected_categories = [
        "machine_readiness",
        "operating_system_readiness",
        "network_reachability",
        "public_node_identity",
        "datanet_storage_expectations",
        "uptime_expectations",
        "operator_security_basics",
        "validator_candidate_separation",
        "wallet_and_funding_boundary",
        "current_status",
    ]
    if categories != expected_categories:
        raise SystemExit(f"{payload_name} categories mismatch: {categories}")

    for item in payload.get("readiness_categories", []):
        if item.get("status") != "preparation_guidance_only":
            raise SystemExit(f"{payload_name} category not guidance-only: {item}")

required_schema = [
    "marker",
    "lane",
    "status",
    "public_surface",
    "authority",
    "readiness_categories",
    "boundary",
    "operator_summary",
]
if schema.get("required") != required_schema:
    raise SystemExit("schema required list mismatch")

for forbidden in [
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
