#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/dev/void-node" || exit 1

DOC="ops/mainnet0/datanet-publish-shim-peer-import-two-box-closeout.md"

expect() {
  local name="$1"
  local pattern="$2"
  if ! grep -q "$pattern" "$DOC"; then
    echo "[fatal] missing $name"
    echo "pattern=$pattern"
    exit 1
  fi
  echo "[ok] $name"
}

echo "=== DataNet publish-shim peer import two-box closeout proof ==="

test -f "$DOC"

expect "artifact" "VOID_DATANET_PUBLISH_SHIM_PEER_IMPORT_TWO_BOX_CLOSEOUT_V1"
expect "green result" "result: green"
expect "commit" "7befd9fe"
expect "tag" "ckpt-datanet-publish-shim-peer-import-green-20260608-142024"
expect "precision local green" "VOID_DATANET_PUBLISH_SHIM_PEER_IMPORT_V1_GREEN"
expect "two-box green" "VOID_DATANET_PUBLISH_SHIM_PEER_IMPORT_TWO_BOX_V1_GREEN"
expect "two-box dataset" "90e5ccbda6729388c52760d6dcdc1a62"
expect "precision peer http" "http://100.122.245.125:4100"
expect "id match" "id_match: true"
expect "copied requested id" "copied_to_requested_id: true"
expect "local fetch ok" "local_fetch_ok: true"
expect "no money movement" "money_movement: false"
expect "no validator mutation" "validator_mutation: false"
expect "no buy void fulfillment" "buy_void_fulfillment: false"
expect "closeout green" "VOID_DATANET_PUBLISH_SHIM_PEER_IMPORT_TWO_BOX_CLOSEOUT_GREEN"

echo
echo "VOID_DATANET_PUBLISH_SHIM_PEER_IMPORT_TWO_BOX_CLOSEOUT_GREEN"
