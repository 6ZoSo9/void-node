#!/usr/bin/env bash
set -euo pipefail

MARKER="VOID_MAINNET0_PUBLIC_NODE_OPERATOR_READINESS_REVIEWER_FINAL_SEAL_HOLD_V1_GREEN"

ROLLUP_MARKER="VOID_MAINNET0_PUBLIC_NODE_OPERATOR_READINESS_CHAIN_ROLLUP_HOLD_V1_GREEN"
ROLLUP_INDEX_MARKER="VOID_MAINNET0_PUBLIC_NODE_OPERATOR_READINESS_CHAIN_ROLLUP_INDEX_LINK_HOLD_V1_GREEN"
MATRIX_MARKER="VOID_MAINNET0_PUBLIC_NODE_OPERATOR_READINESS_MATRIX_HOLD_V1_GREEN"
READINESS_INDEX_MARKER="VOID_MAINNET0_PUBLIC_NODE_OPERATOR_READINESS_INDEX_LINK_HOLD_V1_GREEN"
CHECKLIST_MARKER="VOID_MAINNET0_PUBLIC_NODE_OPERATOR_PREFLIGHT_CHECKLIST_HOLD_V1_GREEN"
CHECKLIST_INDEX_MARKER="VOID_MAINNET0_PUBLIC_NODE_OPERATOR_PREFLIGHT_CHECKLIST_INDEX_LINK_HOLD_V1_GREEN"

LANE="mainnet0-public-node-operator-readiness-reviewer-final-seal-hold-v1"
ROLLUP="mainnet0-public-node-operator-readiness-chain-rollup-hold-v1"
ROLLUP_INDEX="mainnet0-public-node-operator-readiness-chain-rollup-index-link-hold-v1"

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

DOC="docs/public-node/${LANE}.md"
SCHEMA="schemas/public-node/${LANE}.schema.json"
EXAMPLE="examples/public-node/${LANE}.example.json"
PUBLIC_JSON="public/public-node/${LANE}.json"
PUBLIC_HTML="public/public-node/${LANE}.html"
ROOT_INDEX="public/public-node/index.json"
ROLLUP_JSON="public/public-node/${ROLLUP}.json"
ROLLUP_HTML="public/public-node/${ROLLUP}.html"
ROLLUP_INDEX_JSON="public/public-node/${ROLLUP_INDEX}.json"

for file in "$DOC" "$SCHEMA" "$EXAMPLE" "$PUBLIC_JSON" "$PUBLIC_HTML" "$ROOT_INDEX" "$ROLLUP_JSON" "$ROLLUP_HTML" "$ROLLUP_INDEX_JSON"; do
  test -f "$file"
done

python3 - <<'PY'
import json
from pathlib import Path

marker = "VOID_MAINNET0_PUBLIC_NODE_OPERATOR_READINESS_REVIEWER_FINAL_SEAL_HOLD_V1_GREEN"
rollup_marker = "VOID_MAINNET0_PUBLIC_NODE_OPERATOR_READINESS_CHAIN_ROLLUP_HOLD_V1_GREEN"
rollup_index_marker = "VOID_MAINNET0_PUBLIC_NODE_OPERATOR_READINESS_CHAIN_ROLLUP_INDEX_LINK_HOLD_V1_GREEN"
matrix_marker = "VOID_MAINNET0_PUBLIC_NODE_OPERATOR_READINESS_MATRIX_HOLD_V1_GREEN"
readiness_index_marker = "VOID_MAINNET0_PUBLIC_NODE_OPERATOR_READINESS_INDEX_LINK_HOLD_V1_GREEN"
checklist_marker = "VOID_MAINNET0_PUBLIC_NODE_OPERATOR_PREFLIGHT_CHECKLIST_HOLD_V1_GREEN"
checklist_index_marker = "VOID_MAINNET0_PUBLIC_NODE_OPERATOR_PREFLIGHT_CHECKLIST_INDEX_LINK_HOLD_V1_GREEN"

lane = "mainnet0-public-node-operator-readiness-reviewer-final-seal-hold-v1"
rollup = "mainnet0-public-node-operator-readiness-chain-rollup-hold-v1"
rollup_index = "mainnet0-public-node-operator-readiness-chain-rollup-index-link-hold-v1"

paths = {
    "doc": Path(f"docs/public-node/{lane}.md"),
    "schema": Path(f"schemas/public-node/{lane}.schema.json"),
    "example": Path(f"examples/public-node/{lane}.example.json"),
    "public_json": Path(f"public/public-node/{lane}.json"),
    "public_html": Path(f"public/public-node/{lane}.html"),
    "root_index": Path("public/public-node/index.json"),
    "rollup_json": Path(f"public/public-node/{rollup}.json"),
    "rollup_html": Path(f"public/public-node/{rollup}.html"),
    "rollup_index_json": Path(f"public/public-node/{rollup_index}.json"),
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
rollup_payload = json.loads(paths["rollup_json"].read_text())
rollup_index_payload = json.loads(paths["rollup_index_json"].read_text())
rollup_html = paths["rollup_html"].read_text()

if marker not in doc:
    raise SystemExit("final seal marker missing from doc")
if marker not in html:
    raise SystemExit("final seal marker missing from html")

if rollup_payload.get("marker") != rollup_marker:
    raise SystemExit("rollup marker mismatch")
if rollup_marker not in rollup_html:
    raise SystemExit("rollup marker missing from html")
if rollup_index_payload.get("marker") != rollup_index_marker:
    raise SystemExit("rollup index marker mismatch")

source_markers = [
    matrix_marker,
    readiness_index_marker,
    checklist_marker,
    checklist_index_marker,
    rollup_marker,
    rollup_index_marker,
]

serialized_rollup = json.dumps(rollup_payload, sort_keys=True)
serialized_index = json.dumps(root_index, sort_keys=True)
for source_marker in source_markers:
    if source_marker not in serialized_rollup and source_marker not in serialized_index and source_marker not in json.dumps(rollup_index_payload, sort_keys=True):
        raise SystemExit(f"source marker not present in known source surfaces: {source_marker}")

for payload_name, payload in [("example", example), ("public_json", public_json)]:
    if payload.get("marker") != marker:
        raise SystemExit(f"{payload_name} marker mismatch")
    if payload.get("lane") != lane:
        raise SystemExit(f"{payload_name} lane mismatch")
    if payload.get("status") != "reviewer_final_seal_hold":
        raise SystemExit(f"{payload_name} status mismatch")
    if payload.get("public_surface") != "read_only_static_reviewer_final_seal":
        raise SystemExit(f"{payload_name} surface mismatch")

    if payload.get("source_markers") != source_markers:
        raise SystemExit(f"{payload_name} source marker order mismatch")

    links = payload.get("source_links", {})
    if links.get("chain_rollup_json") != f"/public-node/{rollup}.json":
        raise SystemExit(f"{payload_name} rollup json link mismatch")
    if links.get("chain_rollup_html") != f"/public-node/{rollup}.html":
        raise SystemExit(f"{payload_name} rollup html link mismatch")
    if links.get("chain_rollup_index_json") != f"/public-node/{rollup_index}.json":
        raise SystemExit(f"{payload_name} rollup index json link mismatch")
    if links.get("root_index_json") != "/public-node/index.json":
        raise SystemExit(f"{payload_name} root index link mismatch")

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
    "review_scope",
    "source_markers",
    "source_links",
    "authority",
    "summary",
]
if schema.get("required") != required_schema:
    raise SystemExit("schema required list mismatch")

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
