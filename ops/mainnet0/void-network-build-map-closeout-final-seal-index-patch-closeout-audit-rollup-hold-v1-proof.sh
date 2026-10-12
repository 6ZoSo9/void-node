#!/usr/bin/env bash
set -euo pipefail

MARKER="VOID_NETWORK_BUILD_MAP_CLOSEOUT_FINAL_SEAL_INDEX_PATCH_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1"
INDEX_PATCH_MARKER="VOID_NETWORK_BUILD_MAP_CLOSEOUT_FINAL_SEAL_INDEX_PATCH_HOLD_V1"
FINAL_SEAL_MARKER="VOID_NETWORK_BUILD_MAP_CLOSEOUT_FINAL_SEAL_HOLD_V1"
CLOSEOUT_MARKER="VOID_NETWORK_BUILD_MAP_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1"
BUILD_MAP_PROOF_MARKER="VOID_NETWORK_BUILD_MAP_V1_GREEN"
BUILD_MAP_FINAL_MARKER="VOID_NETWORK_BUILD_MAP_V1_POST_MERGE_EXACT_GREEN"

DOC="docs/public-node/void-network-build-map-closeout-final-seal-index-patch-closeout-audit-rollup-hold-v1.md"
INDEX_JSON="public/public-node/void-network/index.json"
ROOT_PUBLIC_INDEX="public/public-node/index.json"
BUILD_MAP_JSON="public/public-node/void-network/build-map-v1.json"
BUILD_MAP_HTML="public/public-node/void-network/build-map-v1.html"
INDEX_PATCH_JSON="public/public-node/void-network/build-map-closeout-final-seal-index-patch-hold-v1.json"
INDEX_PATCH_HTML="public/public-node/void-network/build-map-closeout-final-seal-index-patch-hold-v1.html"
FINAL_SEAL_JSON="public/public-node/void-network/build-map-closeout-final-seal-hold-v1.json"
FINAL_SEAL_HTML="public/public-node/void-network/build-map-closeout-final-seal-hold-v1.html"
CLOSEOUT_JSON="public/public-node/void-network/build-map-closeout-audit-rollup-hold-v1.json"
CLOSEOUT_HTML="public/public-node/void-network/build-map-closeout-audit-rollup-hold-v1.html"
SOURCE_PROOF="ops/mainnet0/void-network-build-map-closeout-final-seal-index-patch-hold-v1-proof.sh"
PUBLIC_JSON="public/public-node/void-network/build-map-closeout-final-seal-index-patch-closeout-audit-rollup-hold-v1.json"
PUBLIC_HTML="public/public-node/void-network/build-map-closeout-final-seal-index-patch-closeout-audit-rollup-hold-v1.html"

echo "== JSON parse / final seal index closeout binding =="
python3 - "$PUBLIC_JSON" "$INDEX_JSON" "$ROOT_PUBLIC_INDEX" "$INDEX_PATCH_JSON" "$FINAL_SEAL_JSON" "$CLOSEOUT_JSON" "$BUILD_MAP_JSON" "$MARKER" "$INDEX_PATCH_MARKER" "$FINAL_SEAL_MARKER" "$CLOSEOUT_MARKER" "$BUILD_MAP_PROOF_MARKER" "$BUILD_MAP_FINAL_MARKER" <<'PY'
import json
import sys

public_path, index_path, root_path, index_patch_path, final_seal_path, closeout_path, build_map_path, marker, index_patch_marker, final_seal_marker, closeout_marker, proof_marker, build_final_marker = sys.argv[1:14]

closeout_rollup = json.load(open(public_path, encoding="utf-8"))
index_raw = open(index_path, encoding="utf-8").read()
root_raw = open(root_path, encoding="utf-8").read()
json.loads(index_raw)
json.loads(root_raw)
index_patch = json.load(open(index_patch_path, encoding="utf-8"))
final_seal = json.load(open(final_seal_path, encoding="utf-8"))
closeout = json.load(open(closeout_path, encoding="utf-8"))
json.load(open(build_map_path, encoding="utf-8"))

assert closeout_rollup["marker"] == marker
assert closeout_rollup["status"] == "hold"
assert closeout_rollup["public_surface"] is True
assert closeout_rollup["read_only"] is True

source = closeout_rollup["source"]
assert source["index_patch_marker"] == index_patch_marker
assert source["final_seal_marker"] == final_seal_marker
assert source["closeout_marker"] == closeout_marker
assert source["build_map_proof_marker"] == proof_marker
assert source["build_map_final_marker"] == build_final_marker

assert index_patch["marker"] == index_patch_marker
assert index_patch["source_marker"] == final_seal_marker
assert final_seal["marker"] == final_seal_marker
assert final_seal["read_only"] is True
assert closeout["marker"] == closeout_marker
assert closeout["read_only"] is True
assert closeout["source"]["source_proof_marker"] == proof_marker
assert closeout["source"]["source_final_marker"] == build_final_marker

for marker_value in [
    index_patch_marker,
    final_seal_marker,
    closeout_marker,
    proof_marker,
    build_final_marker
]:
    assert marker_value in index_raw, marker_value

for name in [
    "build-map-v1.json",
    "build-map-v1.html",
    "build-map-closeout-audit-rollup-hold-v1.json",
    "build-map-closeout-audit-rollup-hold-v1.html",
    "build-map-closeout-final-seal-hold-v1.json",
    "build-map-closeout-final-seal-hold-v1.html",
    "build-map-closeout-final-seal-index-patch-hold-v1.json",
    "build-map-closeout-final-seal-index-patch-hold-v1.html"
]:
    assert name in index_raw, name

assert "void-network" in root_raw

for key, value in closeout_rollup["audit"].items():
    assert value is True, key

boundary = closeout_rollup["boundary"]
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

print("void_network_build_map_closeout_final_seal_index_patch_closeout_binding_green=true")
PY

echo "== marker/source presence =="
for f in "$DOC" "$PUBLIC_JSON" "$PUBLIC_HTML" "$0"; do
  test -f "$f"
  grep -Fq "$MARKER" "$f"
done
grep -Fq "$INDEX_PATCH_MARKER" "$INDEX_JSON"
grep -Fq "$INDEX_PATCH_MARKER" "$INDEX_PATCH_JSON"
grep -Fq "$INDEX_PATCH_MARKER" "$INDEX_PATCH_HTML"
grep -Fq "$FINAL_SEAL_MARKER" "$INDEX_JSON"
grep -Fq "$FINAL_SEAL_MARKER" "$FINAL_SEAL_JSON"
grep -Fq "$FINAL_SEAL_MARKER" "$FINAL_SEAL_HTML"
grep -Fq "$CLOSEOUT_MARKER" "$INDEX_JSON"
grep -Fq "$CLOSEOUT_MARKER" "$CLOSEOUT_JSON"
grep -Fq "$CLOSEOUT_MARKER" "$CLOSEOUT_HTML"
grep -Fq "$BUILD_MAP_PROOF_MARKER" "$INDEX_JSON"
grep -Fq "$BUILD_MAP_PROOF_MARKER" "$SOURCE_PROOF"
grep -Fq "$BUILD_MAP_FINAL_MARKER" "$INDEX_JSON"
grep -Fq "$BUILD_MAP_FINAL_MARKER" "$FINAL_SEAL_JSON"
test -f "$BUILD_MAP_JSON"
test -f "$BUILD_MAP_HTML"
test -f "$ROOT_PUBLIC_INDEX"
echo "marker_source_green=true"

echo "== source proof =="
bash "$SOURCE_PROOF"

echo "== public static read-only scan =="
if grep -RInE '<form|method=|fetch\(|XMLHttpRequest|navigator\.|localStorage|sessionStorage|indexedDB|onclick=|onload=|<script' "$PUBLIC_JSON" "$PUBLIC_HTML" "$INDEX_PATCH_JSON" "$INDEX_PATCH_HTML" "$FINAL_SEAL_JSON" "$FINAL_SEAL_HTML" "$CLOSEOUT_JSON" "$CLOSEOUT_HTML" "$BUILD_MAP_JSON" "$BUILD_MAP_HTML" "$INDEX_JSON"; then
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
if grep -RInE '100,000,000[[:space:]]+WC|100000000[[:space:]]+WC|WC[[:space:]]+supply[[:space:]]+cap|work[[:space:]]+credit[[:space:]]+supply[[:space:]]+cap|capped[[:space:]]+at[[:space:]]+100' "$DOC" "$INDEX_JSON" "$PUBLIC_JSON" "$PUBLIC_HTML" "$INDEX_PATCH_JSON" "$FINAL_SEAL_JSON" "$CLOSEOUT_JSON" "$BUILD_MAP_JSON"; then
  echo "forbidden_wc_cap_scan_green=false"
  exit 1
fi
echo "forbidden_wc_cap_scan_green=true"

echo "== result =="
echo "VOID_NETWORK_BUILD_MAP_CLOSEOUT_FINAL_SEAL_INDEX_PATCH_CLOSEOUT_AUDIT_ROLLUP_HOLD_V1_GREEN"
