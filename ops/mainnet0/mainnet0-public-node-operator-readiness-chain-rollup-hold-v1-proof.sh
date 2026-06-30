#!/usr/bin/env bash
set -euo pipefail

MARKER="VOID_MAINNET0_PUBLIC_NODE_OPERATOR_READINESS_CHAIN_ROLLUP_HOLD_V1_GREEN"
MATRIX_MARKER="VOID_MAINNET0_PUBLIC_NODE_OPERATOR_READINESS_MATRIX_HOLD_V1_GREEN"
READINESS_INDEX_MARKER="VOID_MAINNET0_PUBLIC_NODE_OPERATOR_READINESS_INDEX_LINK_HOLD_V1_GREEN"
CHECKLIST_MARKER="VOID_MAINNET0_PUBLIC_NODE_OPERATOR_PREFLIGHT_CHECKLIST_HOLD_V1_GREEN"
CHECKLIST_INDEX_MARKER="VOID_MAINNET0_PUBLIC_NODE_OPERATOR_PREFLIGHT_CHECKLIST_INDEX_LINK_HOLD_V1_GREEN"

LANE="mainnet0-public-node-operator-readiness-chain-rollup-hold-v1"
MATRIX="mainnet0-public-node-operator-readiness-matrix-hold-v1"
READINESS_INDEX="mainnet0-public-node-operator-readiness-index-link-hold-v1"
CHECKLIST="mainnet0-public-node-operator-preflight-checklist-hold-v1"
CHECKLIST_INDEX="mainnet0-public-node-operator-preflight-checklist-index-link-hold-v1"

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

DOC="docs/public-node/${LANE}.md"
SCHEMA="schemas/public-node/${LANE}.schema.json"
EXAMPLE="examples/public-node/${LANE}.example.json"
PUBLIC_JSON="public/public-node/${LANE}.json"
PUBLIC_HTML="public/public-node/${LANE}.html"
ROOT_INDEX="public/public-node/index.json"

for file in \
  "$DOC" \
  "$SCHEMA" \
  "$EXAMPLE" \
  "$PUBLIC_JSON" \
  "$PUBLIC_HTML" \
  "$ROOT_INDEX" \
  "public/public-node/${MATRIX}.json" \
  "public/public-node/${MATRIX}.html" \
  "public/public-node/${READINESS_INDEX}.json" \
  "public/public-node/${CHECKLIST}.json" \
  "public/public-node/${CHECKLIST}.html" \
  "public/public-node/${CHECKLIST_INDEX}.json"
do
  test -f "$file"
done

python3 - <<'PY'
import json
from pathlib import Path

marker = "VOID_MAINNET0_PUBLIC_NODE_OPERATOR_READINESS_CHAIN_ROLLUP_HOLD_V1_GREEN"
matrix_marker = "VOID_MAINNET0_PUBLIC_NODE_OPERATOR_READINESS_MATRIX_HOLD_V1_GREEN"
readiness_index_marker = "VOID_MAINNET0_PUBLIC_NODE_OPERATOR_READINESS_INDEX_LINK_HOLD_V1_GREEN"
checklist_marker = "VOID_MAINNET0_PUBLIC_NODE_OPERATOR_PREFLIGHT_CHECKLIST_HOLD_V1_GREEN"
checklist_index_marker = "VOID_MAINNET0_PUBLIC_NODE_OPERATOR_PREFLIGHT_CHECKLIST_INDEX_LINK_HOLD_V1_GREEN"

lane = "mainnet0-public-node-operator-readiness-chain-rollup-hold-v1"
matrix = "mainnet0-public-node-operator-readiness-matrix-hold-v1"
readiness_index = "mainnet0-public-node-operator-readiness-index-link-hold-v1"
checklist = "mainnet0-public-node-operator-preflight-checklist-hold-v1"
checklist_index = "mainnet0-public-node-operator-preflight-checklist-index-link-hold-v1"

paths = {
    "doc": Path(f"docs/public-node/{lane}.md"),
    "schema": Path(f"schemas/public-node/{lane}.schema.json"),
    "example": Path(f"examples/public-node/{lane}.example.json"),
    "public_json": Path(f"public/public-node/{lane}.json"),
    "public_html": Path(f"public/public-node/{lane}.html"),
    "root_index": Path("public/public-node/index.json"),
    "matrix_json": Path(f"public/public-node/{matrix}.json"),
    "matrix_html": Path(f"public/public-node/{matrix}.html"),
    "readiness_index_json": Path(f"public/public-node/{readiness_index}.json"),
    "checklist_json": Path(f"public/public-node/{checklist}.json"),
    "checklist_html": Path(f"public/public-node/{checklist}.html"),
    "checklist_index_json": Path(f"public/public-node/{checklist_index}.json"),
}

for name, path in paths.items():
    if not path.exists():
        raise SystemExit(f"missing {name}: {path}")

doc = paths["doc"].read_text()
html = paths["public_html"].read_text()
schema = json.loads(paths["schema"].read_text())
example = json.loads(paths["example"].read_text())
public_json = json.loads(paths["public_json"].read_text())
root_index = json.loads(paths["root_index"].read_text())

source_payloads = {
    matrix_marker: json.loads(paths["matrix_json"].read_text()),
    readiness_index_marker: json.loads(paths["readiness_index_json"].read_text()),
    checklist_marker: json.loads(paths["checklist_json"].read_text()),
    checklist_index_marker: json.loads(paths["checklist_index_json"].read_text()),
}

if marker not in doc:
    raise SystemExit("rollup marker missing from doc")
if marker not in html:
    raise SystemExit("rollup marker missing from html")

for expected_marker, payload in source_payloads.items():
    if payload.get("marker") != expected_marker:
        raise SystemExit(f"source payload marker mismatch: {expected_marker}")

if matrix_marker not in paths["matrix_html"].read_text():
    raise SystemExit("matrix marker missing from matrix html")
if checklist_marker not in paths["checklist_html"].read_text():
    raise SystemExit("checklist marker missing from checklist html")

expected_chain = [
    (1, matrix, matrix_marker, f"/public-node/{matrix}.json", f"/public-node/{matrix}.html"),
    (2, readiness_index, readiness_index_marker, f"/public-node/{readiness_index}.json", None),
    (3, checklist, checklist_marker, f"/public-node/{checklist}.json", f"/public-node/{checklist}.html"),
    (4, checklist_index, checklist_index_marker, f"/public-node/{checklist_index}.json", None),
]

for payload_name, payload in [("example", example), ("public_json", public_json)]:
    if payload.get("marker") != marker:
        raise SystemExit(f"{payload_name} marker mismatch")
    if payload.get("lane") != lane:
        raise SystemExit(f"{payload_name} lane mismatch")
    if payload.get("status") != "chain_rollup_hold":
        raise SystemExit(f"{payload_name} status mismatch")
    if payload.get("public_surface") != "read_only_static_chain_rollup":
        raise SystemExit(f"{payload_name} surface mismatch")

    chain = payload.get("source_chain", [])
    if len(chain) != 4:
        raise SystemExit(f"{payload_name} source chain length mismatch")

    for item, expected in zip(chain, expected_chain):
        order, expected_lane, expected_marker, expected_json, expected_html = expected
        if item.get("order") != order:
            raise SystemExit(f"{payload_name} order mismatch")
        if item.get("lane") != expected_lane:
            raise SystemExit(f"{payload_name} lane mismatch")
        if item.get("marker") != expected_marker:
            raise SystemExit(f"{payload_name} marker mismatch")
        if item.get("json") != expected_json:
            raise SystemExit(f"{payload_name} json link mismatch")
        if expected_html is not None and item.get("html") != expected_html:
            raise SystemExit(f"{payload_name} html link mismatch")

    authority = payload.get("authority", {})
    for key in [
        "registration_enabled",
        "checklist_submission_enabled",
        "validator_admission_enabled",
        "validator_activation_enabled",
        "staking_enabled",
        "wallet_connect_enabled",
        "public_mutation_enabled",
        "ledger_write_enabled",
        "peer_state_write_enabled",
        "validator_set_write_enabled",
    ]:
        if authority.get(key) is not False:
            raise SystemExit(f"{payload_name} authority key not false: {key}")

required_schema = [
    "marker",
    "lane",
    "status",
    "public_surface",
    "source_chain",
    "authority",
    "summary",
]
if schema.get("required") != required_schema:
    raise SystemExit("schema required list mismatch")

serialized_root = json.dumps(root_index, sort_keys=True)
for needle in [
    readiness_index_marker,
    checklist_index_marker,
    f"/public-node/{matrix}.json",
    f"/public-node/{matrix}.html",
    f"/public-node/{checklist}.json",
    f"/public-node/{checklist}.html",
]:
    if needle not in serialized_root:
        raise SystemExit(f"root index missing existing chain needle: {needle}")

for name in ["doc", "schema", "example", "public_json", "public_html"]:
    text = paths[name].read_text()
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
        if forbidden in text:
            raise SystemExit(f"forbidden token {forbidden!r} found in {name}")

print(marker)
PY
