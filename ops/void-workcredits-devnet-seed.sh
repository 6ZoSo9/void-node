#!/usr/bin/env bash
set -euo pipefail

ROOT="${ROOT:-$HOME/dev/void-node}"
RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
STATE="$ROOT/docs/VOID-DEVNET-PROTOCOL-STATE.json"
KEY_FILE="${KEY_FILE:-$ROOT/.secrets/devnet-deployer.key}"

# This is the same devnet VoidToken used in WorkCreditsDevnetDeploy.s.sol
DEVNET_VOID_TOKEN="0xF49183759D2C6510b131F0D2Ba584fff624fb8ec"

# One-time seed amounts (18 decimals):
#   VOID_SEED = 1e24  = 1,000,000 VOID
#   WC_SEED   = 1e26  = 100,000,000 WC
VOID_SEED="1000000000000000000000000"
WC_SEED="100000000000000000000000000"

echo "=== [VOID WorkCredits DEVNET seed] ==="
echo "[cfg] ROOT     = $ROOT"
echo "[cfg] RPC_URL  = $RPC_URL"
echo "[cfg] STATE    = $STATE"
echo "[cfg] KEY_FILE = $KEY_FILE"
echo

# --- sanity checks ---

if ! command -v cast >/dev/null 2>&1; then
  echo "[ERROR] cast not found in PATH; install foundry (cast) first."
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "[ERROR] jq not found in PATH; install jq first."
  exit 1
fi

if [ ! -f "$STATE" ]; then
  echo "[ERROR] devnet state file not found: $STATE"
  exit 1
fi

if [ ! -f "$KEY_FILE" ]; then
  echo "[ERROR] devnet deployer key file not found: $KEY_FILE"
  exit 1
fi

# --- parse addresses from devnet state ---

WORKCREDITS_TOKEN="$(jq -r '.workCreditsToken // ""' "$STATE")"
WORKCREDITS_POOL_V1="$(jq -r '.workCreditsPoolV1 // ""' "$STATE")"

echo "=== [1] devnet state addresses] ==="
echo "  workCreditsToken  = $WORKCREDITS_TOKEN"
echo "  workCreditsPoolV1 = $WORKCREDITS_POOL_V1"
echo "  DEVNET_VOID_TOKEN = $DEVNET_VOID_TOKEN"
echo

if [ -z "$WORKCREDITS_TOKEN" ] || [ "$WORKCREDITS_TOKEN" = "null" ]; then
  echo "[ERROR] workCreditsToken missing in $STATE"
  exit 1
fi

if [ -z "$WORKCREDITS_POOL_V1" ] || [ "$WORKCREDITS_POOL_V1" = "null" ]; then
  echo "[ERROR] workCreditsPoolV1 missing in $STATE"
  exit 1
fi

# --- load deployer key & derive address (treasury) ---

DEVNET_KEY="$(tr -d ' \n\r' < "$KEY_FILE")"

if [ -z "$DEVNET_KEY" ]; then
  echo "[ERROR] devnet deployer key in $KEY_FILE is empty"
  exit 1
fi

echo "=== [2] derive treasury/deployer address] ==="
TREASURY_ADDR="$(cast wallet address --private-key "$DEVNET_KEY")"
echo "  treasury/deployer = $TREASURY_ADDR"
echo

# --- balances before seed ---

echo "=== [3] balances BEFORE seed] ==="
VOID_BALANCE="$(cast call "$DEVNET_VOID_TOKEN" 'balanceOf(address)(uint256)' "$TREASURY_ADDR" --rpc-url "$RPC_URL")"
WC_BALANCE="$(cast call "$WORKCREDITS_TOKEN" 'balanceOf(address)(uint256)' "$TREASURY_ADDR" --rpc-url "$RPC_URL")"

echo "  VOID balanceOf(treasury) = $VOID_BALANCE"
echo "  WC   balanceOf(treasury) = $WC_BALANCE"
echo
echo "  planned VOID_SEED = $VOID_SEED"
echo "  planned WC_SEED   = $WC_SEED"
echo
echo "NOTE: If the seed tx reverts with a balance/allowance error, we may need to"
echo "      mint more devnet VOID/WC to $TREASURY_ADDR or adjust seed amounts."
echo

# --- approvals ---

echo "=== [4] approvals] ==="

echo "[4a] approve pool to pull VOID from treasury..."
cast send "$DEVNET_VOID_TOKEN" \
  'approve(address,uint256)(bool)' \
  "$WORKCREDITS_POOL_V1" "$VOID_SEED" \
  --rpc-url "$RPC_URL" \
  --private-key "$DEVNET_KEY"

echo
echo "[4b] approve pool to pull WC from treasury..."
cast send "$WORKCREDITS_TOKEN" \
  'approve(address,uint256)(bool)' \
  "$WORKCREDITS_POOL_V1" "$WC_SEED" \
  --rpc-url "$RPC_URL" \
  --private-key "$DEVNET_KEY"

echo

# --- seed call ---

echo "=== [5] seed WorkCreditsPoolV1] ==="
echo "Calling seed(voidAmount, wcAmount) on $WORKCREDITS_POOL_V1"
echo "  voidAmount = $VOID_SEED"
echo "  wcAmount   = $WC_SEED"
echo

cast send "$WORKCREDITS_POOL_V1" \
  'seed(uint256,uint256)' \
  "$VOID_SEED" "$WC_SEED" \
  --rpc-url "$RPC_URL" \
  --private-key "$DEVNET_KEY"

echo
echo "=== [6] reserves AFTER seed (best-effort)] ==="
RESERVES_RAW="$(cast call "$WORKCREDITS_POOL_V1" 'getReserves()(uint256,uint256)' --rpc-url "$RPC_URL")"
echo "  getReserves() = $RESERVES_RAW"

echo
echo "=== [done] WorkCredits DEVNET pool seeded (if no errors above) ==="
echo "You can re-run:"
echo "  ./ops/void-workcredits-devnet-onchain-diag.sh | sed -n '1,160p'"
echo "  ./ops/void-workcredits-devnet-dashboard.sh   | sed -n '1,160p'"
echo "to confirm on-chain + exporter views."
