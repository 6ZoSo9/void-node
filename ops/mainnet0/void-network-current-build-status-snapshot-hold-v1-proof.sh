#!/usr/bin/env bash
set -euo pipefail

MARKER="VOID_NETWORK_CURRENT_BUILD_STATUS_SNAPSHOT_HOLD_V1"
BUILD_MAP_FINAL_MARKER="VOID_NETWORK_BUILD_MAP_DISCOVERY_CHAIN_ROLLUP_INDEX_PATCH_CLOSEOUT_FINAL_SEAL_HOLD_V1_POST_MERGE_EXACT_GREEN"
BUILD_MAP_PROOF="ops/mainnet0/void-network-build-map-discovery-chain-rollup-index-patch-closeout-final-seal-hold-v1-proof.sh"

DOC="docs/public-node/void-network-current-build-status-snapshot-hold-v1.md"
INDEX_JSON="public/public-node/void-network/index.json"
ROOT_PUBLIC_INDEX="public/public-node/index.json"
PUBLIC_JSON="public/public-node/void-network/current-build-status-snapshot-hold-v1.json"
PUBLIC_HTML="public/public-node/void-network/current-build-status-snapshot-hold-v1.html"

echo "== JSON parse / status snapshot binding =="
python3 - "$PUBLIC_JSON" "$INDEX_JSON" "$ROOT_PUBLIC_INDEX" "$MARKER" "$BUILD_MAP_FINAL_MARKER" <<'PY'
import json
import sys

public_path, index_path, root_path, marker, build_map_final_marker = sys.argv[1:6]

snapshot = json.load(open(public_path, encoding="utf-8"))
index_raw = open(index_path, encoding="utf-8").read()
root_raw = open(root_path, encoding="utf-8").read()
json.loads(index_raw)
json.loads(root_raw)

assert snapshot["marker"] == marker
assert snapshot["status"] == "hold"
assert snapshot["public_surface"] is True
assert snapshot["read_only"] is True
assert snapshot["source"]["build_map_final_marker"] == build_map_final_marker

for key in ["datanet", "work_credits", "mainnet0_validators", "usdc_void_buy_pool", "apollyon", "public_node"]:
    assert key in snapshot["summary"], key

assert "unlimited" in snapshot["summary"]["work_credits"].lower()
assert "uncapped" in snapshot["summary"]["work_credits"].lower()

assert marker in index_raw
assert "current-build-status-snapshot-hold-v1.json" in index_raw
assert "current-build-status-snapshot-hold-v1.html" in index_raw
assert "void-network" in root_raw

boundary = snapshot["boundary"]
assert boundary["status_snapshot_only"] is True
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

print("void_network_current_build_status_snapshot_binding_green=true")
PY

echo "== marker/source presence =="
grep -Fq "$MARKER" "$DOC"
grep -Fq "$MARKER" "$PUBLIC_JSON"
grep -Fq "$MARKER" "$PUBLIC_HTML"
grep -Fq "$MARKER" "$INDEX_JSON"
grep -Fq "$MARKER" "$0"
grep -Fq "$BUILD_MAP_FINAL_MARKER" "$DOC"
grep -Fq "$BUILD_MAP_FINAL_MARKER" "$PUBLIC_JSON"

echo "== build map source proof =="
bash "$BUILD_MAP_PROOF"

echo "== public static read-only scan =="
if grep -RInE '<form|method=|fetch\(|XMLHttpRequest|navigator\.|localStorage|sessionStorage|indexedDB|onclick=|onload=|<script' "$PUBLIC_JSON" "$PUBLIC_HTML" "$INDEX_JSON"; then
  echo "public_static_readonly_scan_green=false"
  exit 1
fi
echo "public_static_readonly_scan_green=true"

echo "== forbidden WC cap wording scan =="
if grep -RInE '100,000,000[[:space:]]+WC|100000000[[:space:]]+WC|WC[[:space:]]+supply[[:space:]]+cap|work[[:space:]]+credit[[:space:]]+supply[[:space:]]+cap|capped[[:space:]]+at[[:space:]]+100' "$DOC" "$PUBLIC_JSON" "$PUBLIC_HTML" "$INDEX_JSON"; then
  echo "forbidden_wc_cap_scan_green=false"
  exit 1
fi
echo "forbidden_wc_cap_scan_green=true"

echo "== result =="
echo "VOID_NETWORK_CURRENT_BUILD_STATUS_SNAPSHOT_HOLD_V1_GREEN"
