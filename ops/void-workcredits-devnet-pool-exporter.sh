#!/usr/bin/env bash
set -euo pipefail

# Make sure foundry (cast) is visible even under sudo.
export PATH="/home/zoso/.foundry/bin:$PATH"

ROOT="${ROOT:-/home/zoso/dev/void-node}"
STATE="$ROOT/docs/VOID-DEVNET-PROTOCOL-STATE.json"
RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"

OUT_DIR="/var/lib/node_exporter/textfile_collector"
OUT_FILE="$OUT_DIR/void_workcredits_devnet_pool.prom"

jq_check() {
  if ! command -v jq >/dev/null 2>&1; then
    echo "[ERROR] jq is required but not installed. sudo apt install jq" >&2
    exit 1
  fi
}

cast_check() {
  if ! command -v cast >/dev/null 2>&1; then
    echo "[ERROR] cast is required but not installed (foundry)." >&2
    exit 1
  fi
}

jq_check
cast_check

if [ ! -f "$STATE" ]; then
  echo "[WARN] devnet state json not found at $STATE, writing stub zeros." >&2
  POOL_ADDR="0x0000000000000000000000000000000000000000"
  VOID_ADDR=""
  WC_ADDR=""
  MODE="stub-no-state"
else
  echo "[INFO] reading addresses from $STATE" >&2
  POOL_ADDR="$(jq -r '
    ( .workCreditsPoolV1
      | if type == "object" then .address else . end
    )
    // ( .WorkCreditsPoolV1
      | if type == "object" then .address else . end
    )
    // ( .contracts.WorkCreditsPoolV1
      | if type == "object" then .address else . end
    )
    // ( .contracts.workCreditsPoolV1
      | if type == "object" then .address else . end
    )
    // ""
  ' "$STATE")"

  VOID_ADDR="$(jq -r '
    ( .VoidToken
      | if type == "object" then .address else . end
    )
    // ( .contracts.VoidToken
      | if type == "object" then .address else . end
    )
    // ( .voidToken
      | if type == "object" then .address else . end
    )
    // ""
  ' "$STATE")"

  WC_ADDR="$(jq -r '
    ( .WorkCreditsToken
      | if type == "object" then .address else . end
    )
    // ( .contracts.WorkCreditsToken
      | if type == "object" then .address else . end
    )
    // ( .workCreditsToken
      | if type == "object" then .address else . end
    )
    // ""
  ' "$STATE")"

  MODE="unknown"
fi

echo "[INFO] POOL_ADDR = ${POOL_ADDR:-<none>}" >&2
echo "[INFO] VOID_ADDR = ${VOID_ADDR:-<none>}" >&2
echo "[INFO] WC_ADDR   = ${WC_ADDR:-<none>}" >&2

has_code() {
  local addr="$1"
  if [ -z "$addr" ] || [ "$addr" = "0x0000000000000000000000000000000000000000" ]; then
    echo 0
    return
  fi
  local code
  code="$(cast code "$addr" --rpc-url "$RPC_URL" 2>/dev/null || echo "0x")"
  if [ "$code" = "0x" ]; then
    echo 0
  else
    echo 1
  fi
}

POOL_HAS_CODE="$(has_code "$POOL_ADDR")"
VOID_HAS_CODE="$(has_code "$VOID_ADDR")"
WC_HAS_CODE="$(has_code "$WC_ADDR")"

echo "[INFO] code presence: pool=$POOL_HAS_CODE void=$VOID_HAS_CODE wc=$WC_HAS_CODE" >&2

VOID_RESERVE_RAW=0
WC_RESERVE_RAW=0
WC_PER_VOID=0
VOID_PER_WC=0

if [ "$POOL_HAS_CODE" -eq 1 ] && [ "$VOID_HAS_CODE" -eq 1 ] && [ "$WC_HAS_CODE" -eq 1 ]; then
  MODE="live"
  echo "[INFO] all contracts present, querying ERC20 balances..." >&2

  VOID_RESERVE_RAW="$(cast call "$VOID_ADDR" 'balanceOf(address)(uint256)' "$POOL_ADDR" --rpc-url "$RPC_URL" 2>/dev/null || echo 0)"
  WC_RESERVE_RAW="$(cast call "$WC_ADDR"   'balanceOf(address)(uint256)' "$POOL_ADDR" --rpc-url "$RPC_URL" 2>/dev/null || echo 0)"

  if [ "$VOID_RESERVE_RAW" != "0" ] && [ "$WC_RESERVE_RAW" != "0" ]; then
    WC_PER_VOID="$(awk "BEGIN { if ($VOID_RESERVE_RAW == 0) print 0; else print $WC_RESERVE_RAW / $VOID_RESERVE_RAW }" 2>/dev/null || echo 0)"
    VOID_PER_WC="$(awk "BEGIN { if ($WC_RESERVE_RAW == 0) print 0; else print $VOID_RESERVE_RAW / $WC_RESERVE_RAW }" 2>/dev/null || echo 0)"
  else
    WC_PER_VOID=0
    VOID_PER_WC=0
  fi
else
  if [ "$POOL_HAS_CODE" -eq 0 ] && [ "$VOID_HAS_CODE" -eq 0 ] && [ "$WC_HAS_CODE" -eq 0 ]; then
    MODE="stub-no-code"
  else
    MODE="stub-partial"
  fi
  echo "[WARN] treating pool as stub (MODE=$MODE); emitting zeros but exiting 0." >&2
fi

mkdir -p "$OUT_DIR"
TMP_FILE="$(mktemp)"

{
  echo "# HELP void_workcredits_devnet_void_reserve_raw VOID reserve in pool (raw 18-dec units)"
  echo "# TYPE void_workcredits_devnet_void_reserve_raw gauge"
  echo "void_workcredits_devnet_void_reserve_raw{chain=\"devnet\"} $VOID_RESERVE_RAW"
  echo
  echo "# HELP void_workcredits_devnet_wc_reserve_raw WorkCredits reserve in pool (raw 18-dec units)"
  echo "# TYPE void_workcredits_devnet_wc_reserve_raw gauge"
  echo "void_workcredits_devnet_wc_reserve_raw{chain=\"devnet\"} $WC_RESERVE_RAW"
  echo
  echo "# HELP void_workcredits_devnet_wc_per_void WC per 1 VOID (price)"
  echo "# TYPE void_workcredits_devnet_wc_per_void gauge"
  echo "void_workcredits_devnet_wc_per_void{chain=\"devnet\"} $WC_PER_VOID"
  echo
  echo "# HELP void_workcredits_devnet_void_per_wc VOID per 1 WC (price)"
  echo "# TYPE void_workcredits_devnet_void_per_wc gauge"
  echo "void_workcredits_devnet_void_per_wc{chain=\"devnet\"} $VOID_PER_WC"
  echo
  echo "# HELP void_workcredits_devnet_pool_meta Static metadata for WC/VOID pool"
  echo "# TYPE void_workcredits_devnet_pool_meta gauge"
  echo "void_workcredits_devnet_pool_meta{chain=\"devnet\",rpc_url=\"$RPC_URL\",mode=\"$MODE\"} 1"
} > "$TMP_FILE"

mv "$TMP_FILE" "$OUT_FILE"

echo "[INFO] wrote metrics to $OUT_FILE (MODE=$MODE)" >&2
