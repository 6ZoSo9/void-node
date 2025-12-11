#!/usr/bin/env bash
set -euo pipefail

# Make sure foundry (cast) is visible even under sudo.
export PATH="/home/zoso/.foundry/bin:$PATH"

ROOT="${ROOT:-/home/zoso/dev/void-node}"
STATE_PROTOCOL="$ROOT/docs/VOID-DEVNET-PROTOCOL-STATE.json"
STATE_DEVNET="$ROOT/docs/VOID-WORKCREDITS-DEVNET-STATE.json"

RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"

OUT_DIR="/var/lib/node_exporter/textfile_collector"
OUT_FILE="$OUT_DIR/void_workcredits_devnet_pool.prom"

# Known devnet VoidToken address (from DevnetVoidTokenDeploy output)
HARDCODED_DEVNET_VOID="0xF49183759D2C6510b131F0D2Ba584fff624fb8ec"

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

# Strip human annotations like " [1e24]" from u256 strings
clean_u256() {
  local raw="$1"
  # Take first whitespace-delimited token
  set -- $raw
  local first="${1:-0}"
  # Keep digits only
  echo "$first" | tr -cd '0-9'
}

jq_check
cast_check

POOL_ADDR=""
VOID_ADDR=""
WC_ADDR=""
MODE="unknown"

if [ ! -f "$STATE_PROTOCOL" ]; then
  echo "[WARN] devnet protocol state json not found at $STATE_PROTOCOL, writing stub zeros." >&2
  POOL_ADDR="0x0000000000000000000000000000000000000000"
  VOID_ADDR=""
  WC_ADDR=""
  MODE="stub-no-state"
else
  echo "[INFO] reading addresses from $STATE_PROTOCOL" >&2
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
  ' "$STATE_PROTOCOL")"

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
  ' "$STATE_PROTOCOL")"

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
  ' "$STATE_PROTOCOL")"
fi

echo "[INFO] POOL_ADDR = ${POOL_ADDR:-<none>}" >&2
echo "[INFO] VOID_ADDR (pre-fallback) = ${VOID_ADDR:-<none>}" >&2
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

# If VoidToken is missing or has no code, fallback to known devnet address.
if [ -z "${VOID_ADDR:-}" ] || [ "$(has_code "$VOID_ADDR")" -eq 0 ]; then
  echo "[WARN] VoidToken not found or has no code in state; falling back to HARDCODED_DEVNET_VOID=$HARDCODED_DEVNET_VOID" >&2
  VOID_ADDR="$HARDCODED_DEVNET_VOID"
fi

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

  local_void_raw="$(cast call "$VOID_ADDR" 'balanceOf(address)(uint256)' "$POOL_ADDR" --rpc-url "$RPC_URL" 2>/dev/null || echo 0)"
  local_wc_raw="$(cast call "$WC_ADDR"   'balanceOf(address)(uint256)' "$POOL_ADDR" --rpc-url "$RPC_URL" 2>/dev/null || echo 0)"

  VOID_RESERVE_RAW="$(clean_u256 "$local_void_raw")"
  WC_RESERVE_RAW="$(clean_u256 "$local_wc_raw")"

  if [ -z "$VOID_RESERVE_RAW" ]; then VOID_RESERVE_RAW=0; fi
  if [ -z "$WC_RESERVE_RAW" ]; then WC_RESERVE_RAW=0; fi

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

# --- Write HTTP state JSON for src/http/workcredits-devnet.ts ---
TMP_STATE="$(mktemp)"
cat > "$TMP_STATE" <<EOF
{
  "chain": "devnet",
  "rpc_url": "$RPC_URL",
  "pool_address": "$POOL_ADDR",
  "void_reserve_raw": "$VOID_RESERVE_RAW",
  "wc_reserve_raw": "$WC_RESERVE_RAW"
}
EOF

mv "$TMP_STATE" "$STATE_DEVNET"

# If running as root (systemd), hand ownership back to zoso so the node can read it.
if [ "$(id -u)" -eq 0 ]; then
  chown zoso:zoso "$STATE_DEVNET" || true
fi

echo "[INFO] wrote WorkCredits devnet state to $STATE_DEVNET (MODE=$MODE)" >&2

# --- Prom textfile output for node_exporter ---
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
