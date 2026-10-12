#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand 2>/dev/null || true

cd "${VOID_REPO:-$HOME/dev/void-node}"

RPC="${RPC:-http://127.0.0.1:8545}"
ACCOUNT="${ACCOUNT:-zoso}"
AMOUNT_ETH="${AMOUNT_ETH:-1}"
CONFIRM="${CONFIRM_PARTICIPANT_DEVNET_GAS_HELPER:-}"
WALLET_STATUS_URL="${WALLET_STATUS_URL:-http://127.0.0.1:4100/__void/participant/wallet/status?account=${ACCOUNT}}"

echo "=== participant wallet devnet gas helper ==="
echo "account=$ACCOUNT"
echo "rpc=$RPC"
echo "amount_eth=$AMOUNT_ETH"

if [ "$RPC" != "http://127.0.0.1:8545" ]; then
  echo "[ERR] refusing non-local RPC: $RPC"
  exit 1
fi

CHAIN_ID="$(cast chain-id --rpc-url "$RPC" 2>/dev/null || true)"
if [ "$CHAIN_ID" != "2050" ]; then
  echo "[ERR] refusing non-VOID-devnet chain id: $CHAIN_ID"
  exit 1
fi

TMP_STATUS="$(mktemp)"
trap 'rm -f "$TMP_STATUS"' EXIT

curl -fsS --max-time 8 "$WALLET_STATUS_URL" > "$TMP_STATUS"

WALLET="$(python3 - "$TMP_STATUS" <<'PY'
import json, sys
with open(sys.argv[1], "r", encoding="utf-8") as f:
    obj = json.load(f)
print(str(obj.get("address") or ""))
PY
)"

if ! printf '%s' "$WALLET" | grep -Eq '^0x[a-fA-F0-9]{40}$'; then
  echo "[ERR] participant wallet address unavailable"
  exit 1
fi

BEFORE_WEI="$(cast balance --rpc-url "$RPC" "$WALLET" 2>/dev/null || echo 0)"
TARGET_WEI="$(cast to-wei "$AMOUNT_ETH" ether)"
TARGET_HEX="$(python3 - "$TARGET_WEI" <<'PY'
import sys
print(hex(int(sys.argv[1])))
PY
)"

echo "wallet=$WALLET"
echo "chain_id=$CHAIN_ID"
echo "before_wei=$BEFORE_WEI"
echo "target_wei=$TARGET_WEI"
echo "target_hex=$TARGET_HEX"

if [ "$CONFIRM" != "LOCAL_2050_ANVIL_ONLY_SET_BALANCE" ]; then
  echo "[dry-run] set CONFIRM_PARTICIPANT_DEVNET_GAS_HELPER=LOCAL_2050_ANVIL_ONLY_SET_BALANCE to fund this local Anvil wallet"
  echo "mutation=false"
  exit 0
fi

cast rpc --rpc-url "$RPC" anvil_setBalance "$WALLET" "$TARGET_HEX" >/dev/null

AFTER_WEI="$(cast balance --rpc-url "$RPC" "$WALLET")"

echo "after_wei=$AFTER_WEI"
echo "mutation=true"

if [ "$AFTER_WEI" = "0" ]; then
  echo "[ERR] funding failed; balance still zero"
  exit 1
fi

echo "[ok] participant wallet has local devnet gas"
