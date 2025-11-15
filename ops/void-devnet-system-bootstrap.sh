#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

ADDR_FILE="docs/VOID-DEVNET-PROTOCOL-STATE.json"

if [ ! -f "$ADDR_FILE" ]; then
  echo "[system-bootstrap][ERR] missing $ADDR_FILE – run void-devnet-bootstrap-protocol.sh first" >&2
  exit 1
fi

RPC_URL="${RPC_URL:-$(jq -r '.rpcUrl' "$ADDR_FILE")}"
CHAIN_ID_JSON="$(jq -r '.chainId' "$ADDR_FILE")"
DEPLOYER="$(jq -r '.deployer' "$ADDR_FILE")"
ADMIN_GATE="$(jq -r '.AdminGate' "$ADDR_FILE")"

if [ -z "$RPC_URL" ] || [ "$RPC_URL" = "null" ]; then
  RPC_URL="http://127.0.0.1:8545"
fi

echo "[system-bootstrap] repo:     $ROOT"
echo "[system-bootstrap] RPC_URL:  $RPC_URL"
echo "[system-bootstrap] chainId:  json=$CHAIN_ID_JSON"
echo "[system-bootstrap] deployer: $DEPLOYER"
echo "[system-bootstrap] AdminGate: $ADMIN_GATE"

if [ -z "$ADMIN_GATE" ] || [ "$ADMIN_GATE" = "0x0000000000000000000000000000000000000000" ]; then
  echo "[system-bootstrap][ERR] AdminGate address missing/zero in $ADDR_FILE" >&2
  exit 1
fi

# 1) Chain ID sanity
LIVE_CHAIN_ID="$(cast chain-id --rpc-url "$RPC_URL")"
echo "[system-bootstrap] chainId live=$LIVE_CHAIN_ID"

if [ "$LIVE_CHAIN_ID" != "$CHAIN_ID_JSON" ]; then
  echo "[system-bootstrap][ERR] live chainId ($LIVE_CHAIN_ID) != json ($CHAIN_ID_JSON)" >&2
  exit 1
fi

# 2) Optional DEVNET_PRIVKEY → address check
if [ -n "${DEVNET_PRIVKEY:-}" ]; then
  DEV_ADDR="$(cast wallet address "$DEVNET_PRIVKEY")"
  echo "[system-bootstrap] DEVNET_PRIVKEY addr=$DEV_ADDR"
  if [ "$DEV_ADDR" != "$DEPLOYER" ]; then
    echo "[system-bootstrap][WARN] DEVNET_PRIVKEY addr != deployer – on devnet this is usually a mistake" >&2
  else
    echo "[system-bootstrap] DEVNET_PRIVKEY matches deployer"
  fi
else
  echo "[system-bootstrap][WARN] DEVNET_PRIVKEY not set – will not be able to change masterKey" >&2
fi

# 3) AdminGate masterKey bootstrap
echo "[system-bootstrap] checking AdminGate.masterKey()…"
CUR_MASTER="$(cast call "$ADMIN_GATE" "masterKey()(address)" --rpc-url "$RPC_URL")"
echo "[system-bootstrap] current masterKey = $CUR_MASTER"

if [ "$CUR_MASTER" = "$DEPLOYER" ]; then
  echo "[system-bootstrap][OK] masterKey already set to deployer – nothing to do"
  exit 0
fi

if [ -z "${DEVNET_PRIVKEY:-}" ]; then
  echo "[system-bootstrap][ERR] DEVNET_PRIVKEY not set and masterKey != deployer; cannot fix" >&2
  exit 1
fi

echo "[system-bootstrap] setting masterKey -> deployer via setMasterKey(address)…"
cast send "$ADMIN_GATE" "setMasterKey(address)" "$DEPLOYER" \
  --private-key "$DEVNET_PRIVKEY" \
  --rpc-url "$RPC_URL"

NEW_MASTER="$(cast call "$ADMIN_GATE" "masterKey()(address)" --rpc-url "$RPC_URL")"
echo "[system-bootstrap] new masterKey = $NEW_MASTER"

if [ "$NEW_MASTER" != "$DEPLOYER" ]; then
  echo "[system-bootstrap][ERR] masterKey still not deployer after transaction" >&2
  exit 1
fi

echo "[system-bootstrap][OK] AdminGate masterKey bootstrapped to deployer."

# NOTE: v1 only ensures AdminGate.masterKey is sane on devnet.
# TODO (v2+): once ConfigGate / JobQueue / registries / ValidatorSet are deployed on devnet,
# extend this script to:
#   - set AdminGate systemContracts[...] entries
#   - wire ConfigGate.adminGate and core uint/bool/address keys
#   - snapshot full system-contracts state for comparison.
