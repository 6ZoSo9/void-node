#!/usr/bin/env bash
set -euo pipefail

echo "=== [keys-health] VOID mainnet keys / roles health ==="

ROOT="$(git rev-parse --show-toplevel)"
KEY_ROOT="${KEY_ROOT:-/mnt/voidkey}"
MAPPING="$KEY_ROOT/meta/mainnet-roles-mapping.txt"
LIVE_CFG="$ROOT/config/void-mainnet-bootstrap-mainnet.live.json"

echo "[keys-health] ROOT     = $ROOT"
echo "[keys-health] KEY_ROOT = $KEY_ROOT"
echo "[keys-health] MAPPING  = $MAPPING"
echo "[keys-health] LIVE_CFG = $LIVE_CFG"
echo

# 0) Basic sanity on paths
if ! mountpoint -q "$KEY_ROOT"; then
  echo "[ERROR] KEY_ROOT is not a mountpoint: $KEY_ROOT"
  echo "void_mainnet_keys_roles_ok 0"
  exit 1
fi

if [[ ! -f "$MAPPING" ]]; then
  echo "[ERROR] mapping file not found: $MAPPING"
  echo "void_mainnet_keys_roles_ok 0"
  exit 1
fi

if [[ ! -f "$LIVE_CFG" ]]; then
  echo "[ERROR] live config not found: $LIVE_CFG"
  echo "void_mainnet_keys_roles_ok 0"
  exit 1
fi

echo "[keys-health] prerequisites OK (voidkey mounted, mapping + live cfg present)"
echo

# 1) Run the roles verifier we just added
echo "[keys-health] running roles verifier..."
set +e
"$ROOT/ops/void-mainnet-roles-verify.sh"
RC=$?
set -e
echo

if [[ $RC -ne 0 ]]; then
  echo "[keys-health] RESULT: BAD (roles mapping vs live JSON verifier FAILED; rc=$RC)"
  echo "void_mainnet_keys_roles_ok 0"
  exit 1
fi

echo "[keys-health] RESULT: OK (roles mapping matches live config)"
echo "void_mainnet_keys_roles_ok 1"
exit 0
