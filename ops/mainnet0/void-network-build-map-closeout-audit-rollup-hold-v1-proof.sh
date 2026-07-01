#!/usr/bin/env bash
set -euo pipefail

MARKER="VOID_NETWORK_BUILD_MAP_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1"
SOURCE_PROOF_MARKER="VOID_NETWORK_BUILD_MAP_V1_GREEN"
SOURCE_FINAL_MARKER="VOID_NETWORK_BUILD_MAP_V1_POST_MERGE_EXACT_GREEN"

DOC="docs/public-node/void-network-build-map-closeout-audit-rollup-hold-v1.md"
BUILD_MAP_JSON="public/public-node/void-network/build-map-v1.json"
BUILD_MAP_HTML="public/public-node/void-network/build-map-v1.html"
VOID_NETWORK_INDEX="public/public-node/void-network/index.json"
ROOT_PUBLIC_INDEX="public/public-node/index.json"
SOURCE_DOC="docs/public-node/void-network-build-map-v1.md"
SOURCE_PROOF="ops/mainnet0/void-network-build-map-v1-proof.sh"
PUBLIC_JSON="public/public-node/void-network/build-map-closeout-audit-rollup-hold-v1.json"
PUBLIC_HTML="public/public-node/void-network/build-map-closeout-audit-rollup-hold-v1.html"

echo "== JSON parse / build map closeout binding =="
python3 - "$PUBLIC_JSON" "$BUILD_MAP_JSON" "$BUILD_MAP_HTML" "$VOID_NETWORK_INDEX" "$ROOT_PUBLIC_INDEX" "$SOURCE_DOC" "$MARKER" "$SOURCE_PROOF_MARKER" "$SOURCE_FINAL_MARKER" <<'PY'
import json
import sys

public_path, build_map_path, build_html_path, void_index_path, root_index_path, source_doc_path, marker, source_proof_marker, source_final_marker = sys.argv[1:10]

closeout = json.load(open(public_path, encoding="utf-8"))
build_raw = open(build_map_path, encoding="utf-8").read()
build_html_raw = open(build_html_path, encoding="utf-8").read()
void_index_raw = open(void_index_path, encoding="utf-8").read()
root_index_raw = open(root_index_path, encoding="utf-8").read()
source_doc_raw = open(source_doc_path, encoding="utf-8").read()

json.loads(build_raw)
json.loads(void_index_raw)
json.loads(root_index_raw)

assert closeout["marker"] == marker
assert closeout["status"] == "hold"
assert closeout["public_surface"] is True
assert closeout["read_only"] is True
assert closeout["source"]["source_proof_marker"] == source_proof_marker
assert closeout["source"]["source_final_marker"] == source_final_marker

combined = "\n".join([build_raw, build_html_raw, void_index_raw, root_index_raw, source_doc_raw]).lower().replace("_", " ")

for label, choices in {
    "datanet": ["datanet"],
    "work_credits": ["work credits", "workcredits"],
    "mainnet0": ["mainnet-0", "mainnet 0", "validator"],
    "usdc_void_buy_pool": ["usdc", "buy pool", "void buy"],
    "apollyon": ["apollyon", "ai advisory"],
    "public_node": ["public node", "public-node"],
    "read_only_static": ["read only", "read-only", "static", "visibility only"],
    "unlimited_uncapped_wc": ["unlimited", "uncapped"]
}.items():
    assert any(choice in combined for choice in choices), label

for name in [
    "build-map-v1.json",
    "build-map-v1.html",
    "void-network"
]:
    assert name in "\n".join([void_index_raw, root_index_raw, build_raw, build_html_raw]), name

for key, value in closeout["audit"].items():
    assert value is True, key

for key, value in closeout["coverage"].items():
    assert value is True, key

boundary = closeout["boundary"]
assert boundary["closeout_audit_rollup_only"] is True
for key in [
    "wallet_connection_enabled",
    "signer_access_enabled",
    "secret_material_exposed",
    "ledger_write_enabled",
    "wc_issuance_enabled",
    "wc_claim_enabled",
    "void_transfer_enabled",
    "usdc_transfer_enabled",
    "buy_pool_execution_enabled",
    "validator_registration_enabled",
    "validator_admission_enabled",
    "validator_set_write_enabled",
    "epoch_activation_enabled",
    "datanet_object_write_enabled",
    "peer_pin_command_enabled",
    "mirror_command_enabled",
    "autonomous_ai_write_enabled"
]:
    assert boundary[key] is False, key

print("void_network_build_map_closeout_binding_green=true")
PY

echo "== marker/source presence =="
for f in "$DOC" "$PUBLIC_JSON" "$PUBLIC_HTML" "$0"; do
  test -f "$f"
  grep -Fq "$MARKER" "$f"
done
test -f "$BUILD_MAP_JSON"
test -f "$BUILD_MAP_HTML"
test -f "$VOID_NETWORK_INDEX"
test -f "$ROOT_PUBLIC_INDEX"
test -f "$SOURCE_DOC"
test -f "$SOURCE_PROOF"
grep -Fq "$SOURCE_PROOF_MARKER" "$SOURCE_PROOF"
echo "marker_source_green=true"

echo "== source proof =="
bash "$SOURCE_PROOF"

echo "== public static read-only scan =="
if grep -RInE '<form|method=|fetch\(|XMLHttpRequest|navigator\.|localStorage|sessionStorage|indexedDB|onclick=|onload=|<script' "$PUBLIC_JSON" "$PUBLIC_HTML" "$BUILD_MAP_JSON" "$BUILD_MAP_HTML" "$VOID_NETWORK_INDEX"; then
  echo "public_static_readonly_scan_green=false"
  exit 1
fi
echo "public_static_readonly_scan_green=true"

echo "== authority boundary scan =="
for key in \
  '"wallet_connection_enabled": false' \
  '"signer_access_enabled": false' \
  '"secret_material_exposed": false' \
  '"ledger_write_enabled": false' \
  '"wc_issuance_enabled": false' \
  '"wc_claim_enabled": false' \
  '"void_transfer_enabled": false' \
  '"usdc_transfer_enabled": false' \
  '"buy_pool_execution_enabled": false' \
  '"validator_registration_enabled": false' \
  '"validator_admission_enabled": false' \
  '"validator_set_write_enabled": false' \
  '"epoch_activation_enabled": false' \
  '"datanet_object_write_enabled": false' \
  '"peer_pin_command_enabled": false' \
  '"mirror_command_enabled": false' \
  '"autonomous_ai_write_enabled": false'
do
  grep -Fq "$key" "$PUBLIC_JSON"
done
echo "authority_boundary_green=true"

echo "== forbidden WC cap wording scan =="
if grep -RInE '100,000,000[[:space:]]+WC|100000000[[:space:]]+WC|WC[[:space:]]+supply[[:space:]]+cap|work[[:space:]]+credit[[:space:]]+supply[[:space:]]+cap|capped[[:space:]]+at[[:space:]]+100' "$DOC" "$PUBLIC_JSON" "$PUBLIC_HTML" "$BUILD_MAP_JSON" "$BUILD_MAP_HTML" "$SOURCE_DOC"; then
  echo "forbidden_wc_cap_scan_green=false"
  exit 1
fi
echo "forbidden_wc_cap_scan_green=true"

echo "== result =="
echo "VOID_NETWORK_BUILD_MAP_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1_GREEN"
