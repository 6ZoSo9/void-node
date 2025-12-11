#!/usr/bin/env bash
set -euo pipefail

ROOT="${ROOT:-$HOME/dev/void-node}"
STATE="${STATE:-$ROOT/docs/VOID-DEVNET-PROTOCOL-STATE.json}"
RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"

echo "=== [VOID WorkCredits DEVNET on-chain diag v2] ==="
echo "[cfg] ROOT     = $ROOT"
echo "[cfg] STATE    = $STATE"
echo "[cfg] RPC_URL  = $RPC_URL"
echo

if ! command -v jq >/dev/null 2>&1; then
  echo "[ERROR] jq is required. sudo apt install jq" >&2
  exit 1
fi

if ! command -v cast >/dev/null 2>&1; then
  echo "[ERROR] cast (foundry) is required. Install via: curl -L https://foundry.paradigm.xyz | bash" >&2
  exit 1
fi

if [ ! -f "$STATE" ]; then
  echo "[ERROR] state file not found: $STATE" >&2
  exit 1
fi

echo "=== [1] extract addresses from devnet state] ==="

# In current devnet state these are plain strings, not objects.
WC_TOKEN_ADDR="$(jq -r '.workCreditsToken // empty' "$STATE" || true)"
POOL_ADDR="$(jq -r '.workCreditsPoolV1 // empty' "$STATE" || true)"

echo "  workCreditsToken     = ${WC_TOKEN_ADDR:-<missing>}"
echo "  workCreditsPoolV1    = ${POOL_ADDR:-<missing>}"
echo

if [ -z "${WC_TOKEN_ADDR:-}" ] || [ "$WC_TOKEN_ADDR" = "null" ]; then
  echo "[WARN] workCreditsToken not set in state JSON"
fi

if [ -z "${POOL_ADDR:-}" ] || [ "$POOL_ADDR" = "null" ]; then
  echo "[WARN] workCreditsPoolV1 not set in state JSON"
fi

echo
echo "=== [2] code presence] ==="

check_code() {
  local label="$1"
  local addr="$2"

  if [ -z "$addr" ] || [ "$addr" = "null" ]; then
    echo "  [$label] address missing"
    return
  fi

  local code
  if ! code="$(cast code --rpc-url "$RPC_URL" "$addr" 2>/dev/null)"; then
    echo "  [$label] ERROR: cast code failed (RPC or chain issue?)"
    return
  fi

  if [ "$code" = "0x" ] || [ "$code" = "0x0" ]; then
    echo "  [$label] NO CODE at $addr"
  else
    echo "  [$label] has code at $addr"
  fi
}

check_code "WorkCreditsToken" "$WC_TOKEN_ADDR"
check_code "WorkCreditsPoolV1" "$POOL_ADDR"

echo
echo "=== [3] WorkCreditsToken ERC20 basics (best-effort)] ==="

if [ -n "${WC_TOKEN_ADDR:-}" ] && [ "$WC_TOKEN_ADDR" != "null" ]; then
  set +e
  DECIMALS="$(cast call --rpc-url "$RPC_URL" "$WC_TOKEN_ADDR" "decimals()(uint8)" 2>/dev/null)"
  DEC_RC=$?
  TOTAL_SUPPLY="$(cast call --rpc-url "$RPC_URL" "$WC_TOKEN_ADDR" "totalSupply()(uint256)" 2>/dev/null)"
  TS_RC=$?
  set -e

  if [ $DEC_RC -ne 0 ]; then
    echo "  [token] decimals() call FAILED"
  else
    echo "  [token] decimals          = $DECIMALS"
  fi

  if [ $TS_RC -ne 0 ]; then
    echo "  [token] totalSupply() call FAILED"
  else
    echo "  [token] totalSupply (raw) = $TOTAL_SUPPLY"
  fi
else
  echo "  [token] SKIP: token address missing"
fi

echo
echo "=== [4] WorkCreditsPoolV1 reserves (best-effort)] ==="

if [ -n "${POOL_ADDR:-}" ] && [ "$POOL_ADDR" != "null" ]; then
  set +e
  # Best-guess signature; if wrong or pool not live, this just fails noisily.
  RESERVES="$(cast call --rpc-url "$RPC_URL" "$POOL_ADDR" "getReserves()(uint256,uint256)" 2>/dev/null)"
  RC=$?
  set -e

  if [ $RC -ne 0 ]; then
    echo "  [pool] getReserves() call FAILED (signature may not match or pool not deployed)."
  else
    echo "  [pool] getReserves raw = $RESERVES"
  fi
else
  echo "  [pool] SKIP: pool address missing"
fi

echo
echo "=== [5] reminder: Prometheus exporter view] ==="
echo "Use: ./ops/void-workcredits-devnet-dashboard.sh"
echo "to compare on-chain reality with:"
echo "  - void_workcredits_devnet_void_reserve_raw"
echo "  - void_workcredits_devnet_wc_reserve_raw"
echo "  - void_workcredits_devnet_wc_per_void"
echo "  - void_workcredits_devnet_void_per_wc"
echo
echo "=== [done] WorkCredits DEVNET on-chain diag v2] ==="
