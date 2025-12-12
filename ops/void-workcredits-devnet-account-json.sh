#!/usr/bin/env bash
set -euo pipefail

ROOT="${ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
STATE_JSON="${STATE_JSON:-$ROOT/docs/VOID-DEVNET-PROTOCOL-STATE.json}"
BCAST_FILE="${BCAST_FILE:-$ROOT/broadcast/WorkCreditsDevnetDeploy.s.sol/2050/run-latest.json}"

ACCOUNT="${1:-${ACCOUNT:-}}"

if [[ -z "${ACCOUNT}" ]]; then
  echo "Usage: $0 <address>" >&2
  echo "  or:  ACCOUNT=<address> $0" >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "[ERR] jq not found in PATH" >&2
  exit 1
fi

if ! command -v cast >/dev/null 2>&1; then
  echo "[ERR] cast (foundry) not found in PATH" >&2
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "[ERR] python3 not found in PATH (needed for 18-dec scaling)" >&2
  exit 1
fi

CHAIN="devnet"

# --- helpers ---

resolve_from_state() {
  local key="$1"
  local addr=""
  if [[ -f "$STATE_JSON" ]]; then
    addr="$(jq -r --arg k "$key" '
      def from_val:
        if   (type == "object") and has("address") then .address
        elif type == "string"                          then .
        else empty
        end;

      def pick_addr($name):
        [
          (try .[$name]          | from_val catch empty),
          (try .contracts[$name] | from_val catch empty),
          (.. | objects | to_entries[]
             | select(.key == $name)
             | .value
             | from_val)
        ]
        | map(select(. != null and . != ""))
        | first // "";

      pick_addr($k)
    ' "$STATE_JSON" 2>/dev/null || echo "")"
  fi
  printf '%s\n' "${addr:-}"
}

resolve_from_broadcast() {
  local mode="$1" # "token" or "pool"
  local addr=""

  if [[ ! -f "$BCAST_FILE" ]]; then
    printf '%s\n' ""
    return 0
  fi

  if [[ "$mode" == "token" ]]; then
    addr="$(jq -r '
      [
        # transactions and receipts can both carry contractName/contractAddress
        (.transactions // [] | .[]),
        (.receipts     // [] | .[])
      ]
      | map(select(.contractName? | type=="string"))
      | map(select(
          (.contractName | test("WorkCredits.*Token"; "i"))
          or
          (.contractName | test("Token.*WorkCredits"; "i"))
        ))
      | map(.contractAddress? // "")
      | map(select(. != null and . != ""))
      | first // ""
    ' "$BCAST_FILE" 2>/dev/null || echo "")"
  else
    addr="$(jq -r '
      [
        (.transactions // [] | .[]),
        (.receipts     // [] | .[])
      ]
      | map(select(.contractName? | type=="string"))
      | map(select(
          (.contractName | test("WorkCredits.*Pool"; "i"))
          or
          (.contractName | test("Pool.*WorkCredits"; "i"))
        ))
      | map(.contractAddress? // "")
      | map(select(. != null and . != ""))
      | first // ""
    ' "$BCAST_FILE" 2>/dev/null || echo "")"
  fi

  printf '%s\n' "${addr:-}"
}

# --- resolve WorkCreditsToken address ---

WC_ADDR="$(resolve_from_state "workCreditsToken")"

SRC="state"
if [[ -z "$WC_ADDR" || "$WC_ADDR" == "null" ]]; then
  WC_ADDR="$(resolve_from_broadcast "token")"
  SRC="broadcast"
fi

if [[ -z "$WC_ADDR" || "$WC_ADDR" == "null" ]]; then
  echo "[ERR] could not resolve WorkCredits token address from state or broadcast" >&2
  echo "[HINT] check $STATE_JSON and $BCAST_FILE for workCredits token address" >&2
  exit 1
fi

# --- resolve Pool address (optional meta) ---

POOL_ADDR="$(resolve_from_state "workCreditsPoolV1")"
POOL_SRC="state"
if [[ -z "$POOL_ADDR" || "$POOL_ADDR" == "null" ]]; then
  POOL_ADDR="$(resolve_from_broadcast "pool")"
  POOL_SRC="broadcast"
fi

if [[ -z "$POOL_ADDR" || "$POOL_ADDR" == "null" ]]; then
  echo "[WARN] could not resolve WorkCredits pool address; stubbing as 0x0" >&2
  POOL_ADDR="0x0000000000000000000000000000000000000000"
  POOL_SRC="stub"
fi

echo "[info] WorkCreditsToken=$WC_ADDR (source=$SRC), Pool=$POOL_ADDR (source=$POOL_SRC)" >&2

# --- query balance ---

WC_RAW="$(cast call --rpc-url "$RPC_URL" "$WC_ADDR" "balanceOf(address)(uint256)" "$ACCOUNT" 2>/dev/null || echo "0")"

WC_HUMAN="$(python3 - <<PY
from decimal import Decimal, getcontext
getcontext().prec = 40

raw_str = "$WC_RAW".strip()
if raw_str.startswith(("0x", "0X")):
    raw = Decimal(int(raw_str, 16))
else:
    raw = Decimal(raw_str or "0")

scale = Decimal(10) ** 18
val = raw / scale
val = val.normalize()
print(val)
PY
)"

VOID_RAW="0"
VOID_HUMAN="0.0"
LP_RAW="0"
LP_HUMAN="0.0"
PENDING_WC_RAW="0"
PENDING_WC_HUMAN="0.0"

UPDATED_AT="$(date +%s)"

cat <<JSON
{
  "chain": "$CHAIN",
  "address": "$ACCOUNT",
  "up": 1,
  "balances": {
    "void_raw": "$VOID_RAW",
    "wc_raw": "$WC_RAW",
    "lp_raw": "$LP_RAW",
    "void": $VOID_HUMAN,
    "wc": $WC_HUMAN,
    "lp": $LP_HUMAN
  },
  "earnings": {
    "pending_wc_raw": "$PENDING_WC_RAW",
    "pending_wc": $PENDING_WC_HUMAN
  },
  "meta": {
    "pool_address": "$POOL_ADDR",
    "workcredits_token": "$WC_ADDR",
    "rpc_url": "$RPC_URL",
    "state_json": "$STATE_JSON",
    "broadcast_file": "$BCAST_FILE",
    "updated_at": $UPDATED_AT
  }
}
JSON
