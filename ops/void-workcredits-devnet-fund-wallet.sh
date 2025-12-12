#!/usr/bin/env bash
# DEVNET_WORKCREDITS_OWNER_PK TODO:
# --------------------------------------------------------------------
# Current devnet VOID/WC owner on-chain is 0x3022E757dC810E133019aC0780aB3363043fC871,
# but we do NOT have its private key wired anywhere sane yet.
# The old DEVNET_WORKCREDITS_OWNER_PK was a placeholder and later a different key
# (0x7D49...) that is NOT the owner and has no ETH.
#
# Until we either:
#   (A) re-bootstrap the WorkCredits devnet stack with a known dev owner, or
#   (B) locate the real devnet owner key for 0x3022... and set DEVNET_WORKCREDITS_OWNER_PK,
# this faucet script is disabled on purpose.
#
# This exit is intentional so we don't keep chasing "out of gas" / revert noise.
echo "[workcredits-devnet-fund-wallet] DISABLED: missing real devnet owner key (0x3022...)."
exit 1
#!/usr/bin/env bash
set -euo pipefail

ROOT="${ROOT:-$(pwd)}"
cd "$ROOT"

RPC="${RPC:-http://127.0.0.1:8545}"
STATE="${STATE:-docs/VOID-WORKCREDITS-DEVNET-STATE.json}"

# Dev wallet you use in Obelisk (can be overridden via WALLET env)
WALLET="${WALLET:-0xdf994e1b8c1ac9078c66892b589c8aa76c3be592}"

# Private key for the WorkCredits devnet owner (0x3022E7...)
# MUST be set in your environment before running this script.
OWNER_PK="${DEVNET_WORKCREDITS_OWNER_PK:-}"

if [[ -z "$OWNER_PK" ]]; then
  echo "[ERROR] DEVNET_WORKCREDITS_OWNER_PK is not set."
  echo "        Export the private key for the owner address (0x3022E7...) and retry."
  exit 1
fi

echo "=== [config] ==="
echo "ROOT   = $ROOT"
echo "RPC    = $RPC"
echo "STATE  = $STATE"
echo "WALLET = $WALLET"
echo

if [[ ! -f "$STATE" ]]; then
  echo "[FATAL] State file not found: $STATE"
  exit 1
fi

POOL_ADDR="$(jq -r '.pool_address' "$STATE")"
if [[ -z "$POOL_ADDR" || "$POOL_ADDR" == "null" ]]; then
  echo "[FATAL] pool_address missing in $STATE"
  exit 1
fi

echo "POOL   = $POOL_ADDR"
echo

echo "=== [resolve tokens from pool] ==="
VOID_TOKEN="$(cast call "$POOL_ADDR" "voidToken()(address)" --rpc-url "$RPC")"
WC_TOKEN="$(cast call "$POOL_ADDR" "wcToken()(address)" --rpc-url "$RPC")"
echo "VoidToken: $VOID_TOKEN"
echo "WCToken  : $WC_TOKEN"
echo

echo "=== [resolve owner from VoidToken] ==="
OWNER_ADDR="$(cast call "$VOID_TOKEN" "owner()(address)" --rpc-url "$RPC")"
echo "owner() = $OWNER_ADDR"
echo

echo "=== [balances BEFORE] ==="
echo "- VOID:"
cast call "$VOID_TOKEN" "balanceOf(address)(uint256)" "$WALLET" --rpc-url "$RPC"
echo "- WC:"
cast call "$WC_TOKEN" "balanceOf(address)(uint256)" "$WALLET" --rpc-url "$RPC"
echo

# Amounts to send (in raw 18-dec units)
# 1,000 VOID and 100,000 WC for devnet testing.
AMOUNT_VOID="${AMOUNT_VOID:-1000000000000000000000}"        # 1_000 * 1e18
AMOUNT_WC="${AMOUNT_WC:-100000000000000000000000}"          # 100_000 * 1e18

echo "=== [FUND VOID -> wallet] ==="
echo "sending $AMOUNT_VOID raw VOID to $WALLET"
cast send "$VOID_TOKEN" \
  "transfer(address,uint256)(bool)" \
  "$WALLET" "$AMOUNT_VOID" \
  --rpc-url "$RPC" \
  --private-key "$OWNER_PK" || {
    echo "[VOID transfer failed]"
  }
echo

echo "=== [FUND WC -> wallet] ==="
echo "sending $AMOUNT_WC raw WC to $WALLET"
cast send "$WC_TOKEN" \
  "transfer(address,uint256)(bool)" \
  "$WALLET" "$AMOUNT_WC" \
  --rpc-url "$RPC" \
  --private-key "$OWNER_PK" || {
    echo "[WC transfer failed]"
  }
echo

echo "=== [balances AFTER] ==="
echo "- VOID:"
cast call "$VOID_TOKEN" "balanceOf(address)(uint256)" "$WALLET" --rpc-url "$RPC"
echo "- WC:"
cast call "$WC_TOKEN" "balanceOf(address)(uint256)" "$WALLET" --rpc-url "$RPC"
echo

echo "[done] dev wallet funding script finished."
