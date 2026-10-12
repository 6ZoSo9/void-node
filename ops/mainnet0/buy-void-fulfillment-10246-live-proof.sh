#!/usr/bin/env bash
set -euo pipefail

RPC="${RPC:-http://127.0.0.1:18545}"

VOID_TOKEN="0x470075B85352Eb86F7d089FB9ba88945f12AAd94"
VOID_TREASURY="0x554eCc7be6f0b7cC3d1c578c2BB848e535c02514"
OPS_TREASURY="0xf0D64c62A87034e1838dB8ec1e2e33666814E7D9"
BUYER="0x45dd104e3F7CC2A080F2edA094D011D09c51960B"

BASE_SEND_TX="0x853314073dde64e393985952b03651dcf56dace22921db6d5de8fec86efdb9b3"
BASE_SPEND_TX="0xa9976ddf2f32ff69dab187cb6860cef8f74a3e7d6853b37f5210bfef77cf6d8d"
ETH_SEND_TX="0x6c506f2a89148056c7799751c7e7237496d38781a3ab71f716a8ddf4445286f3"
ETH_SPEND_TX="0xafeef64e72dea6bb1370eea364e20b4d70cd3833740999201707fd7257d40c7f"

expect_eq() {
  local name="$1"
  local got="$2"
  local want="$3"
  if [ "$got" != "$want" ]; then
    echo "[fatal] $name mismatch"
    echo "got:  $got"
    echo "want: $want"
    exit 1
  fi
  echo "[ok] $name=$got"
}

balance_wei() {
  cast call --rpc-url "$RPC" "$VOID_TOKEN" "balanceOf(address)(uint256)" "$1" | awk '{print $1}'
}

receipt_status() {
  cast receipt --rpc-url "$RPC" "$1" status | awk '{print $1}'
}

receipt_to() {
  cast rpc --rpc-url "$RPC" eth_getTransactionByHash "$1" \
    | python3 -c 'import json,sys; print(json.load(sys.stdin)["to"])'
}

echo "=== VOID Buy fulfillment 102.46 live proof ==="

CHAIN_ID="$(cast chain-id --rpc-url "$RPC")"
HEAD="$(cast block-number --rpc-url "$RPC")"
echo "chain_id=$CHAIN_ID"
echo "head=$HEAD"
expect_eq "chain_id" "$CHAIN_ID" "2050"

BUYER_BAL="$(balance_wei "$BUYER")"
OPS_BAL="$(balance_wei "$OPS_TREASURY")"
VOID_TREASURY_BAL="$(balance_wei "$VOID_TREASURY")"

expect_eq "buyer_balance_wei" "$BUYER_BAL" "102460000000000000000"
expect_eq "ops_treasury_balance_wei" "$OPS_BAL" "0"
expect_eq "void_treasury_balance_wei" "$VOID_TREASURY_BAL" "333210230540000000000000000"

for tx_name in BASE_SEND_TX BASE_SPEND_TX ETH_SEND_TX ETH_SPEND_TX; do
  tx="${!tx_name}"
  status="$(receipt_status "$tx")"
  if [ "$status" = "1" ]; then status="true"; fi
  expect_eq "${tx_name}_status" "$status" "true"
done

lower() { printf '%s' "$1" | tr 'A-F' 'a-f'; }

expect_eq "base_send_to" "$(lower "$(receipt_to "$BASE_SEND_TX")")" "$(lower "$VOID_TREASURY")"
expect_eq "base_spend_to" "$(lower "$(receipt_to "$BASE_SPEND_TX")")" "$(lower "$OPS_TREASURY")"
expect_eq "eth_send_to" "$(lower "$(receipt_to "$ETH_SEND_TX")")" "$(lower "$VOID_TREASURY")"
expect_eq "eth_spend_to" "$(lower "$(receipt_to "$ETH_SPEND_TX")")" "$(lower "$OPS_TREASURY")"

echo "VOID_BUY_VOID_FULFILLMENT_10246_LIVE_PROOF_GREEN"
