#!/usr/bin/env bash
set -euo pipefail

MARKER="VOID_MAINNET0_PUBLIC_NODE_OPERATOR_READINESS_INDEX_LINK_HOLD_V1_GREEN"
SOURCE_MARKER="VOID_MAINNET0_PUBLIC_NODE_OPERATOR_READINESS_MATRIX_HOLD_V1_GREEN"
LANE="mainnet0-public-node-operator-readiness-index-link-hold-v1"
MATRIX="mainnet0-public-node-operator-readiness-matrix-hold-v1"

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

DOC="docs/public-node/${LANE}.md"
PUBLIC_JSON="public/public-node/${LANE}.json"
ROOT_INDEX="public/public-node/index.json"
MATRIX_JSON="public/public-node/${MATRIX}.json"
MATRIX_HTML="public/public-node/${MATRIX}.html"

for file in "$DOC" "$PUBLIC_JSON" "$ROOT_INDEX" "$MATRIX_JSON" "$MATRIX_HTML"; do
  test -f "$file"
done

python3 - <<'PY'
import json
from pathlib import Path

marker = "VOID_MAINNET0_PUBLIC_NODE_OPERATOR_READINESS_INDEX_LINK_HOLD_V1_GREEN"
source_marker = "VOID_MAINNET0_PUBLIC_NODE_OPERATOR_READINESS_MATRIX_HOLD_V1_GREEN"
matrix = "mainnet0-public-node-operator-readiness-matrix-hold-v1"

paths = {
    "doc": Path("docs/public-node/mainnet0-public-node-operator-readiness-index-link-hold-v1.md"),
    "public_json": Path("public/public-node/mainnet0-public-node-operator-readiness-index-link-hold-v1.json"),
    "root_index": Path("public/public-node/index.json"),
    "matrix_json": Path(f"public/public-node/{matrix}.json"),
    "matrix_html": Path(f"public/public-node/{matrix}.html"),
}

for name, path in paths.items():
    if not path.exists():
        raise SystemExit(f"missing {name}: {path}")

doc = paths["doc"].read_text()
public_payload = json.loads(paths["public_json"].read_text())
root_index = json.loads(paths["root_index"].read_text())
matrix_payload = json.loads(paths["matrix_json"].read_text())
matrix_html = paths["matrix_html"].read_text()

if marker not in doc:
    raise SystemExit("index-link marker missing from doc")
if public_payload.get("marker") != marker:
    raise SystemExit("public index-link marker mismatch")
if public_payload.get("status") != "index_link_hold":
    raise SystemExit("public index-link status mismatch")
if matrix_payload.get("marker") != source_marker:
    raise SystemExit("source matrix marker mismatch")
if source_marker not in matrix_html:
    raise SystemExit("source matrix marker missing from html")

serialized_index = json.dumps(root_index, sort_keys=True)
required_needles = [
    marker,
    source_marker,
    f"/public-node/{matrix}.json",
    f"/public-node/{matrix}.html",
]
for needle in required_needles:
    if needle not in serialized_index:
        raise SystemExit(f"root index missing {needle}")

authority = public_payload.get("authority", {})
for key in [
    "registration_enabled",
    "validator_activation_enabled",
    "staking_enabled",
    "wallet_connect_enabled",
    "public_mutation_enabled",
    "ledger_write_enabled",
    "validator_set_write_enabled",
    "peer_state_write_enabled",
]:
    if authority.get(key) is not False:
        raise SystemExit(f"authority key not false: {key}")

for name in ["doc", "public_json", "root_index"]:
    text = paths[name].read_text()
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
        if forbidden in text:
            raise SystemExit(f"forbidden token {forbidden!r} found in {name}")

print(marker)
PY
