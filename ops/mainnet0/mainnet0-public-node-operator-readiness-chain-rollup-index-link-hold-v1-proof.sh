#!/usr/bin/env bash
set -euo pipefail

MARKER="VOID_MAINNET0_PUBLIC_NODE_OPERATOR_READINESS_CHAIN_ROLLUP_INDEX_LINK_HOLD_V1_GREEN"
SOURCE_MARKER="VOID_MAINNET0_PUBLIC_NODE_OPERATOR_READINESS_CHAIN_ROLLUP_HOLD_V1_GREEN"
LANE="mainnet0-public-node-operator-readiness-chain-rollup-index-link-hold-v1"
ROLLUP="mainnet0-public-node-operator-readiness-chain-rollup-hold-v1"

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

DOC="docs/public-node/${LANE}.md"
PUBLIC_JSON="public/public-node/${LANE}.json"
ROOT_INDEX="public/public-node/index.json"
ROLLUP_JSON="public/public-node/${ROLLUP}.json"
ROLLUP_HTML="public/public-node/${ROLLUP}.html"

for file in "$DOC" "$PUBLIC_JSON" "$ROOT_INDEX" "$ROLLUP_JSON" "$ROLLUP_HTML"; do
  test -f "$file"
done

python3 - <<'PY'
import json
from pathlib import Path

marker = "VOID_MAINNET0_PUBLIC_NODE_OPERATOR_READINESS_CHAIN_ROLLUP_INDEX_LINK_HOLD_V1_GREEN"
source_marker = "VOID_MAINNET0_PUBLIC_NODE_OPERATOR_READINESS_CHAIN_ROLLUP_HOLD_V1_GREEN"
lane = "mainnet0-public-node-operator-readiness-chain-rollup-index-link-hold-v1"
rollup = "mainnet0-public-node-operator-readiness-chain-rollup-hold-v1"

required_rollup_chain_markers = [
    "VOID_MAINNET0_PUBLIC_NODE_OPERATOR_READINESS_MATRIX_HOLD_V1_GREEN",
    "VOID_MAINNET0_PUBLIC_NODE_OPERATOR_READINESS_INDEX_LINK_HOLD_V1_GREEN",
    "VOID_MAINNET0_PUBLIC_NODE_OPERATOR_PREFLIGHT_CHECKLIST_HOLD_V1_GREEN",
    "VOID_MAINNET0_PUBLIC_NODE_OPERATOR_PREFLIGHT_CHECKLIST_INDEX_LINK_HOLD_V1_GREEN",
]

paths = {
    "doc": Path(f"docs/public-node/{lane}.md"),
    "public_json": Path(f"public/public-node/{lane}.json"),
    "root_index": Path("public/public-node/index.json"),
    "rollup_json": Path(f"public/public-node/{rollup}.json"),
    "rollup_html": Path(f"public/public-node/{rollup}.html"),
}

for name, path in paths.items():
    if not path.exists():
        raise SystemExit(f"missing {name}: {path}")

doc = paths["doc"].read_text()
public_payload = json.loads(paths["public_json"].read_text())
root_index = json.loads(paths["root_index"].read_text())
rollup_payload = json.loads(paths["rollup_json"].read_text())
rollup_html = paths["rollup_html"].read_text()

if marker not in doc:
    raise SystemExit("index-link marker missing from doc")

if public_payload.get("marker") != marker:
    raise SystemExit("public index-link marker mismatch")
if public_payload.get("lane") != lane:
    raise SystemExit("public index-link lane mismatch")
if public_payload.get("status") != "index_link_hold":
    raise SystemExit("public index-link status mismatch")
if public_payload.get("public_surface") != "read_only_static_index_link":
    raise SystemExit("public index-link surface mismatch")

source = public_payload.get("source", {})
if source.get("marker") != source_marker:
    raise SystemExit("source marker mismatch")
if source.get("lane") != rollup:
    raise SystemExit("source lane mismatch")
if source.get("json") != f"/public-node/{rollup}.json":
    raise SystemExit("source json mismatch")
if source.get("html") != f"/public-node/{rollup}.html":
    raise SystemExit("source html mismatch")

if rollup_payload.get("marker") != source_marker:
    raise SystemExit("rollup source marker mismatch")
if source_marker not in rollup_html:
    raise SystemExit("rollup source marker missing from html")

serialized_rollup = json.dumps(rollup_payload, sort_keys=True)
for needle in required_rollup_chain_markers:
    if needle not in serialized_rollup:
        raise SystemExit(f"rollup missing chain marker: {needle}")

serialized_index = json.dumps(root_index, sort_keys=True)
required_index_needles = [
    marker,
    source_marker,
    f"/public-node/{rollup}.json",
    f"/public-node/{rollup}.html",
]
for needle in required_index_needles:
    if needle not in serialized_index:
        raise SystemExit(f"root index missing {needle}")

authority = public_payload.get("authority", {})
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
