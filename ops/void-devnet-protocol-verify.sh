#!/usr/bin/env bash
set -euo pipefail

REPO=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
cd "$REPO"

STATE_FILE="docs/VOID-DEVNET-PROTOCOL-STATE.json"

if [ ! -f "$STATE_FILE" ]; then
  echo "[protocol-verify][ERR] missing $STATE_FILE; run ops/void-devnet-bootstrap-protocol.sh first" >&2
  exit 1
fi

RPC_URL="${RPC_URL:-$(jq -r '.rpcUrl' "$STATE_FILE")}"
CHAIN_JSON=$(jq -r '.chainId'   "$STATE_FILE")
DEPLOYER_JSON=$(jq -r '.deployer' "$STATE_FILE")
TOKEN=$(jq -r '.VoidToken'      "$STATE_FILE")
ADMIN=$(jq -r '.AdminGate'      "$STATE_FILE")

echo "[protocol-verify] repo:     $REPO"
echo "[protocol-verify] RPC_URL:  $RPC_URL"
echo "[protocol-verify] chainId:  json=$CHAIN_JSON"
echo "[protocol-verify] deployer: $DEPLOYER_JSON"
echo "[protocol-verify] VoidToken: $TOKEN"
echo "[protocol-verify] AdminGate: $ADMIN"

CHAIN_LIVE=$(cast chain-id --rpc-url "$RPC_URL")
echo "[protocol-verify] chainId live=$CHAIN_LIVE"

if [ "$CHAIN_LIVE" != "$CHAIN_JSON" ]; then
  echo "[FAIL] chainId mismatch: live=$CHAIN_LIVE json=$CHAIN_JSON" >&2
  exit 1
fi

if [ -n "${DEVNET_PRIVKEY:-}" ]; then
  KEY_ADDR=$(cast wallet address "$DEVNET_PRIVKEY")
  echo "[protocol-verify] DEVNET_PRIVKEY addr=$KEY_ADDR"
  if [ "$KEY_ADDR" != "$DEPLOYER_JSON" ]; then
    echo "[FAIL] DEVNET_PRIVKEY address mismatch: key=$KEY_ADDR json=$DEPLOYER_JSON" >&2
    exit 1
  fi
  echo "[protocol-verify] DEVNET_PRIVKEY matches deployer"
else
  echo "[protocol-verify][WARN] DEVNET_PRIVKEY not set; skipping deployer-key check"
fi

echo "[OK] devnet protocol snapshot matches live chain-id (and key if provided)"
