#!/usr/bin/env bash
set -euo pipefail

MARKER="VOID_MAINNET0_PUBLIC_NODE_OPERATOR_REVIEWER_HANDOFF_PACK_HOLD_V1_GREEN"

MATRIX_MARKER="VOID_MAINNET0_PUBLIC_NODE_OPERATOR_READINESS_MATRIX_HOLD_V1_GREEN"
READINESS_INDEX_MARKER="VOID_MAINNET0_PUBLIC_NODE_OPERATOR_READINESS_INDEX_LINK_HOLD_V1_GREEN"
CHECKLIST_MARKER="VOID_MAINNET0_PUBLIC_NODE_OPERATOR_PREFLIGHT_CHECKLIST_HOLD_V1_GREEN"
CHECKLIST_INDEX_MARKER="VOID_MAINNET0_PUBLIC_NODE_OPERATOR_PREFLIGHT_CHECKLIST_INDEX_LINK_HOLD_V1_GREEN"
ROLLUP_MARKER="VOID_MAINNET0_PUBLIC_NODE_OPERATOR_READINESS_CHAIN_ROLLUP_HOLD_V1_GREEN"
ROLLUP_INDEX_MARKER="VOID_MAINNET0_PUBLIC_NODE_OPERATOR_READINESS_CHAIN_ROLLUP_INDEX_LINK_HOLD_V1_GREEN"
FINAL_SEAL_MARKER="VOID_MAINNET0_PUBLIC_NODE_OPERATOR_READINESS_REVIEWER_FINAL_SEAL_HOLD_V1_GREEN"

LANE="mainnet0-public-node-operator-reviewer-handoff-pack-hold-v1"

MATRIX="mainnet0-public-node-operator-readiness-matrix-hold-v1"
READINESS_INDEX="mainnet0-public-node-operator-readiness-index-link-hold-v1"
CHECKLIST="mainnet0-public-node-operator-preflight-checklist-hold-v1"
CHECKLIST_INDEX="mainnet0-public-node-operator-preflight-checklist-index-link-hold-v1"
ROLLUP="mainnet0-public-node-operator-readiness-chain-rollup-hold-v1"
ROLLUP_INDEX="mainnet0-public-node-operator-readiness-chain-rollup-index-link-hold-v1"
FINAL_SEAL="mainnet0-public-node-operator-readiness-reviewer-final-seal-hold-v1"

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
  "public/public-node/${CHECKLIST_INDEX}.json" \
  "public/public-node/${ROLLUP}.json" \
  "public/public-node/${ROLLUP}.html" \
  "public/public-node/${ROLLUP_INDEX}.json" \
  "public/public-node/${FINAL_SEAL}.json" \
  "public/public-node/${FINAL_SEAL}.html"
do
  test -f "$file"
done

python3 - <<'PY'
import json
from pathlib import Path

marker = "VOID_MAINNET0_PUBLIC_NODE_OPERATOR_REVIEWER_HANDOFF_PACK_HOLD_V1_GREEN"

matrix_marker = "VOID_MAINNET0_PUBLIC_NODE_OPERATOR_READINESS_MATRIX_HOLD_V1_GREEN"
readiness_index_marker = "VOID_MAINNET0_PUBLIC_NODE_OPERATOR_READINESS_INDEX_LINK_HOLD_V1_GREEN"
checklist_marker = "VOID_MAINNET0_PUBLIC_NODE_OPERATOR_PREFLIGHT_CHECKLIST_HOLD_V1_GREEN"
checklist_index_marker = "VOID_MAINNET0_PUBLIC_NODE_OPERATOR_PREFLIGHT_CHECKLIST_INDEX_LINK_HOLD_V1_GREEN"
rollup_marker = "VOID_MAINNET0_PUBLIC_NODE_OPERATOR_READINESS_CHAIN_ROLLUP_HOLD_V1_GREEN"
rollup_index_marker = "VOID_MAINNET0_PUBLIC_NODE_OPERATOR_READINESS_CHAIN_ROLLUP_INDEX_LINK_HOLD_V1_GREEN"
final_seal_marker = "VOID_MAINNET0_PUBLIC_NODE_OPERATOR_READINESS_REVIEWER_FINAL_SEAL_HOLD_V1_GREEN"

lane = "mainnet0-public-node-operator-reviewer-handoff-pack-hold-v1"

matrix = "mainnet0-public-node-operator-readiness-matrix-hold-v1"
readiness_index = "mainnet0-public-node-operator-readiness-index-link-hold-v1"
checklist = "mainnet0-public-node-operator-preflight-checklist-hold-v1"
checklist_index = "mainnet0-public-node-operator-preflight-checklist-index-link-hold-v1"
rollup = "mainnet0-public-node-operator-readiness-chain-rollup-hold-v1"
rollup_index = "mainnet0-public-node-operator-readiness-chain-rollup-index-link-hold-v1"
final_seal = "mainnet0-public-node-operator-readiness-reviewer-final-seal-hold-v1"

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
    "rollup_json": Path(f"public/public-node/{rollup}.json"),
    "rollup_html": Path(f"public/public-node/{rollup}.html"),
    "rollup_index_json": Path(f"public/public-node/{rollup_index}.json"),
    "final_seal_json": Path(f"public/public-node/{final_seal}.json"),
    "final_seal_html": Path(f"public/public-node/{final_seal}.html"),
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
    rollup_marker: json.loads(paths["rollup_json"].read_text()),
    rollup_index_marker: json.loads(paths["rollup_index_json"].read_text()),
    final_seal_marker: json.loads(paths["final_seal_json"].read_text()),
}

if marker not in doc:
    raise SystemExit("handoff marker missing from doc")
if marker not in html:
    raise SystemExit("handoff marker missing from html")

for expected_marker, payload in source_payloads.items():
    if payload.get("marker") != expected_marker:
        raise SystemExit(f"source payload marker mismatch: {expected_marker}")

for expected_marker, file_key in [
    (matrix_marker, "matrix_html"),
    (checklist_marker, "checklist_html"),
    (rollup_marker, "rollup_html"),
    (final_seal_marker, "final_seal_html"),
]:
    if expected_marker not in paths[file_key].read_text():
        raise SystemExit(f"{expected_marker} missing from {file_key}")

expected_source_markers = [
    final_seal_marker,
    rollup_marker,
    rollup_index_marker,
    checklist_marker,
    checklist_index_marker,
    matrix_marker,
    readiness_index_marker,
]

for payload_name, payload in [("example", example), ("public_json", public_json)]:
    if payload.get("marker") != marker:
        raise SystemExit(f"{payload_name} marker mismatch")
    if payload.get("lane") != lane:
        raise SystemExit(f"{payload_name} lane mismatch")
    if payload.get("status") != "reviewer_handoff_pack_hold":
        raise SystemExit(f"{payload_name} status mismatch")
    if payload.get("public_surface") != "read_only_static_reviewer_handoff_pack":
        raise SystemExit(f"{payload_name} surface mismatch")

    if payload.get("source_markers") != expected_source_markers:
        raise SystemExit(f"{payload_name} source marker order mismatch")

    review_order = payload.get("review_order", [])
    if len(review_order) != 7:
        raise SystemExit(f"{payload_name} review order length mismatch")
    for idx, item in enumerate(review_order, start=1):
        if item.get("order") != idx:
            raise SystemExit(f"{payload_name} review order mismatch at {idx}")

    root_link = payload.get("root_index_link", {})
    if root_link.get("enabled") is not True:
        raise SystemExit(f"{payload_name} root index link not enabled")
    if root_link.get("json") != f"/public-node/{lane}.json":
        raise SystemExit(f"{payload_name} root index json mismatch")
    if root_link.get("html") != f"/public-node/{lane}.html":
        raise SystemExit(f"{payload_name} root index html mismatch")

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

serialized_root = json.dumps(root_index, sort_keys=True)
for needle in [
    marker,
    f"/public-node/{lane}.json",
    f"/public-node/{lane}.html",
]:
    if needle not in serialized_root:
        raise SystemExit(f"root index missing handoff needle: {needle}")

required_schema = [
    "marker",
    "lane",
    "status",
    "public_surface",
    "review_order",
    "source_markers",
    "source_links",
    "root_index_link",
    "authority",
    "reviewer_summary",
]
if schema.get("required") != required_schema:
    raise SystemExit("schema required list mismatch")

for name in ["doc", "schema", "example", "public_json", "public_html", "root_index"]:
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
