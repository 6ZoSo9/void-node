#!/usr/bin/env bash
set -euo pipefail

MARKER="VOID_MAINNET0_PUBLIC_NODE_OPERATOR_PREFLIGHT_CHECKLIST_INDEX_LINK_HOLD_V1_GREEN"
SOURCE_MARKER="VOID_MAINNET0_PUBLIC_NODE_OPERATOR_PREFLIGHT_CHECKLIST_HOLD_V1_GREEN"
MATRIX_MARKER="VOID_MAINNET0_PUBLIC_NODE_OPERATOR_READINESS_MATRIX_HOLD_V1_GREEN"
LANE="mainnet0-public-node-operator-preflight-checklist-index-link-hold-v1"
CHECKLIST="mainnet0-public-node-operator-preflight-checklist-hold-v1"
MATRIX="mainnet0-public-node-operator-readiness-matrix-hold-v1"

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

DOC="docs/public-node/${LANE}.md"
PUBLIC_JSON="public/public-node/${LANE}.json"
ROOT_INDEX="public/public-node/index.json"
CHECKLIST_JSON="public/public-node/${CHECKLIST}.json"
CHECKLIST_HTML="public/public-node/${CHECKLIST}.html"
MATRIX_JSON="public/public-node/${MATRIX}.json"
MATRIX_HTML="public/public-node/${MATRIX}.html"

for file in "$DOC" "$PUBLIC_JSON" "$ROOT_INDEX" "$CHECKLIST_JSON" "$CHECKLIST_HTML" "$MATRIX_JSON" "$MATRIX_HTML"; do
  test -f "$file"
done

python3 - <<'PY'
import json
from pathlib import Path

marker = "VOID_MAINNET0_PUBLIC_NODE_OPERATOR_PREFLIGHT_CHECKLIST_INDEX_LINK_HOLD_V1_GREEN"
source_marker = "VOID_MAINNET0_PUBLIC_NODE_OPERATOR_PREFLIGHT_CHECKLIST_HOLD_V1_GREEN"
matrix_marker = "VOID_MAINNET0_PUBLIC_NODE_OPERATOR_READINESS_MATRIX_HOLD_V1_GREEN"
lane = "mainnet0-public-node-operator-preflight-checklist-index-link-hold-v1"
checklist = "mainnet0-public-node-operator-preflight-checklist-hold-v1"
matrix = "mainnet0-public-node-operator-readiness-matrix-hold-v1"

paths = {
    "doc": Path(f"docs/public-node/{lane}.md"),
    "public_json": Path(f"public/public-node/{lane}.json"),
    "root_index": Path("public/public-node/index.json"),
    "checklist_json": Path(f"public/public-node/{checklist}.json"),
    "checklist_html": Path(f"public/public-node/{checklist}.html"),
    "matrix_json": Path(f"public/public-node/{matrix}.json"),
    "matrix_html": Path(f"public/public-node/{matrix}.html"),
}

for name, path in paths.items():
    if not path.exists():
        raise SystemExit(f"missing {name}: {path}")

doc = paths["doc"].read_text()
public_payload = json.loads(paths["public_json"].read_text())
root_index = json.loads(paths["root_index"].read_text())
checklist_payload = json.loads(paths["checklist_json"].read_text())
checklist_html = paths["checklist_html"].read_text()
matrix_payload = json.loads(paths["matrix_json"].read_text())
matrix_html = paths["matrix_html"].read_text()

if marker not in doc:
    raise SystemExit("index-link marker missing from doc")
if public_payload.get("marker") != marker:
    raise SystemExit("public index-link marker mismatch")
if public_payload.get("lane") != lane:
    raise SystemExit("public index-link lane mismatch")
if public_payload.get("status") != "index_link_hold":
    raise SystemExit("public index-link status mismatch")

if checklist_payload.get("marker") != source_marker:
    raise SystemExit("source checklist marker mismatch")
if source_marker not in checklist_html:
    raise SystemExit("source checklist marker missing from html")
if matrix_payload.get("marker") != matrix_marker:
    raise SystemExit("matrix marker mismatch")
if matrix_marker not in matrix_html:
    raise SystemExit("matrix marker missing from html")

serialized_index = json.dumps(root_index, sort_keys=True)
required_needles = [
    marker,
    source_marker,
    matrix_marker,
    f"/public-node/{checklist}.json",
    f"/public-node/{checklist}.html",
    f"/public-node/{matrix}.json",
    f"/public-node/{matrix}.html",
]
for needle in required_needles:
    if needle not in serialized_index:
        raise SystemExit(f"root index missing {needle}")

authority = public_payload.get("authority", {})
for key in [
    "registration_enabled",
    "checklist_submission_enabled",
    "validator_activation_enabled",
    "staking_enabled",
    "wallet_connect_enabled",
    "public_mutation_enabled",
    "ledger_write_enabled",
    "peer_state_write_enabled",
    "validator_set_write_enabled",
]:
    if authority.get(key) is not False:
        raise SystemExit(f"authority key not false: {key}")

for name in ["doc", "public_json", "root_index"]:
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
