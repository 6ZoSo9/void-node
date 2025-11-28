#!/usr/bin/env bash
set -euo pipefail

echo "[tokenomics-dev] checking VOID mainnet dev invariants..."

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
SUMMARY="/tmp/void-mainnet-bootstrap-dev-out.txt"

if [ ! -f "$SUMMARY" ]; then
  echo "[tokenomics-dev] ERROR: summary file not found: $SUMMARY" >&2
  echo "  Re-run /tmp/void-mainnet-bootstrap-dev-run.sh to regenerate it." >&2
  exit 1
fi

RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"

# Pull addresses from the summary
TOKEN="$(grep '^voidToken=' "$SUMMARY"           | cut -d= -f2)"
TREASURY_ADDR="$(grep '^voidTreasury=' "$SUMMARY"   | cut -d= -f2)"
OPS_ADDR="$(grep '^opsTreasury=' "$SUMMARY"        | cut -d= -f2)"
REWARD_ADDR="$(grep '^rewardEngine=' "$SUMMARY"    | cut -d= -f2)"
VALIDATOR_ADDR="$(grep '^validator0.reward=' "$SUMMARY" | cut -d= -f2)"

echo "[tokenomics-dev] RPC_URL       = $RPC_URL"
echo "[tokenomics-dev] TOKEN         = $TOKEN"
echo "[tokenomics-dev] TREASURY_ADDR = $TREASURY_ADDR"
echo "[tokenomics-dev] OPS_ADDR      = $OPS_ADDR"
echo "[tokenomics-dev] REWARD_ADDR   = $REWARD_ADDR"
echo "[tokenomics-dev] VALIDATOR     = $VALIDATOR_ADDR"
echo

if [ -z "$TOKEN" ] || [ -z "$TREASURY_ADDR" ] || [ -z "$OPS_ADDR" ] || [ -z "$REWARD_ADDR" ] || [ -z "$VALIDATOR_ADDR" ]; then
  echo "[tokenomics-dev] ERROR: missing one or more addresses from summary file" >&2
  exit 1
fi

# cast call prints "N [X.eYY]" — keep only the first column
SUPPLY_RAW="$(
  cast call "$TOKEN" 'totalSupply()(uint256)' --rpc-url "$RPC_URL" \
    | awk '{print $1}'
)"
TREASURY_RAW="$(
  cast call "$TOKEN" 'balanceOf(address)(uint256)' "$TREASURY_ADDR" --rpc-url "$RPC_URL" \
    | awk '{print $1}'
)"
OPS_RAW="$(
  cast call "$TOKEN" 'balanceOf(address)(uint256)' "$OPS_ADDR" --rpc-url "$RPC_URL" \
    | awk '{print $1}'
)"
REWARD_RAW="$(
  cast call "$TOKEN" 'balanceOf(address)(uint256)' "$REWARD_ADDR" --rpc-url "$RPC_URL" \
    | awk '{print $1}'
)"
VALIDATOR_RAW="$(
  cast call "$TOKEN" 'balanceOf(address)(uint256)' "$VALIDATOR_ADDR" --rpc-url "$RPC_URL" \
    | awk '{print $1}'
)"

echo "== RAW (wei) =="
echo "  totalSupply : $SUPPLY_RAW"
echo "  treasury    : $TREASURY_RAW"
echo "  ops         : $OPS_RAW"
echo "  reward      : $REWARD_RAW"
echo "  validator   : $VALIDATOR_RAW"
echo

# Pretty-print in VOID units
SUPPLY_VOID="$(cast from-wei "$SUPPLY_RAW")"
TREASURY_VOID="$(cast from-wei "$TREASURY_RAW")"
OPS_VOID="$(cast from-wei "$OPS_RAW")"
REWARD_VOID="$(cast from-wei "$REWARD_RAW")"
VALIDATOR_VOID="$(cast from-wei "$VALIDATOR_RAW")"

echo "== VOID units =="
echo "  totalSupply : $SUPPLY_VOID"
echo "  treasury    : $TREASURY_VOID"
echo "  ops         : $OPS_VOID"
echo "  reward      : $REWARD_VOID"
echo "  validator   : $VALIDATOR_VOID"
echo

# Invariant check in Python (Decimal-safe)
python3 - <<PY
from decimal import Decimal

supply    = Decimal("$SUPPLY_RAW")
treasury  = Decimal("$TREASURY_RAW")
ops       = Decimal("$OPS_RAW")
reward    = Decimal("$REWARD_RAW")
validator = Decimal("$VALIDATOR_RAW")

components = treasury + ops + reward + validator

print("== invariant check (raw wei) ==")
print(f"  supply     = {supply}")
print(f"  components = {components} (treasury+ops+reward+validator)")

if supply != components:
    print("\\n[FAIL] invariant broken: supply != sum(components)", flush=True)
    raise SystemExit(1)

print("\\n[OK] invariant holds: supply == treasury + ops + reward + validator")
PY

echo
echo "[tokenomics-dev] DONE."
