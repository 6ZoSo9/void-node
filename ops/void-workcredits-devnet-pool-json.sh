#!/usr/bin/env bash
set -euo pipefail

ROOT="${ROOT:-$HOME/dev/void-node}"
PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"
STATE_FILE="${STATE_FILE:-$ROOT/docs/VOID-WORKCREDITS-DEVNET-STATE.json}"

q_val() {
  local expr="$1"
  curl -fsS "$PROM_URL/api/v1/query" \
    --data-urlencode "query=$expr" \
    2>/dev/null \
    | jq -r ".data.result[0].value[1] // empty" 2>/dev/null || true
}

echo "=== [cfg] workcredits-devnet pool JSON ===" 1>&2
echo "  ROOT       = $ROOT" 1>&2
echo "  PROM_URL   = $PROM_URL" 1>&2
echo "  STATE_FILE = $STATE_FILE" 1>&2
echo 1>&2

UP="$(q_val "void_workcredits_devnet_up{chain=\"devnet\"}")"
VOID_RAW="$(q_val "void_workcredits_devnet_void_reserve_raw{chain=\"devnet\"}")"
WC_RAW="$(q_val "void_workcredits_devnet_wc_reserve_raw{chain=\"devnet\"}")"
WC_PER_VOID="$(q_val "void_workcredits_devnet_wc_per_void{chain=\"devnet\"}")"
VOID_PER_WC="$(q_val "void_workcredits_devnet_void_per_wc{chain=\"devnet\"}")"

HEALTH="$(q_val "void_workcredits_devnet_pool_health{chain=\"devnet\"}")"
HEALTH_5M="$(q_val "void:workcredits_devnet_pool_health:last_5m{chain=\"devnet\"}")"

POOL_META_JSON="$(curl -fsS "$PROM_URL/api/v1/query" \
  --data-urlencode "query=void_workcredits_devnet_pool_meta{chain=\"devnet\"}" \
  2>/dev/null || true)"

POOL_ADDR="$(printf "%s" "$POOL_META_JSON" | jq -r ".data.result[0].metric.pool_address // \"\"" 2>/dev/null || true)"
RPC_URL="$(printf "%s" "$POOL_META_JSON" | jq -r ".data.result[0].metric.rpc_url // \"\"" 2>/dev/null || true)"

if [[ -f "$STATE_FILE" ]]; then
  NEED_FALLBACK=0
  if [[ -z "${VOID_RAW:-}" || -z "${WC_RAW:-}" ]]; then
    NEED_FALLBACK=1
  elif [[ "${VOID_RAW:-0}" == "0" && "${WC_RAW:-0}" == "0" ]]; then
    NEED_FALLBACK=1
  fi

  if [[ "$NEED_FALLBACK" == "1" ]]; then
    echo "[fallback] using live chain via ops/void-workcredits-devnet-pool-state.sh" 1>&2

    POOL_ADDR="$(jq -r ".pool_address // \"\"" "$STATE_FILE" 2>/dev/null || true)"
    if [[ -z "${RPC_URL:-}" ]]; then
      RPC_URL="$(jq -r ".rpc_url // \"http://127.0.0.1:8545\"" "$STATE_FILE" 2>/dev/null || true)"
    fi

    TMP_OUT="$(mktemp)"
    RPC_URL="$RPC_URL" bash "$ROOT/ops/void-workcredits-devnet-pool-state.sh" > "$TMP_OUT"

    VOID_RAW="$(awk -F"= " "/voidReserveRaw/ {print \$2}" "$TMP_OUT" | tail -n1 | tr -d "[:space:]")"
    WC_RAW="$(awk -F"= " "/wcReserveRaw/ {print \$2}" "$TMP_OUT" | tail -n1 | tr -d "[:space:]")"
    VOID_PER_WC="$(awk -F"= " "/VOID_per_WC/ {print \$2}" "$TMP_OUT" | tail -n1 | tr -d "[:space:]")"
    WC_PER_VOID="$(awk -F"= " "/WC_per_VOID/ {print \$2}" "$TMP_OUT" | tail -n1 | tr -d "[:space:]")"
    rm -f "$TMP_OUT"

    UP="1"
    HEALTH="1"
    HEALTH_5M="1"
  fi
fi

jq -n \
  --arg chain "devnet" \
  --arg up "${UP:-0}" \
  --arg voidRaw "${VOID_RAW:-0}" \
  --arg wcRaw "${WC_RAW:-0}" \
  --arg wcPerVoid "${WC_PER_VOID:-0}" \
  --arg voidPerWc "${VOID_PER_WC:-0}" \
  --arg health "${HEALTH:-0}" \
  --arg health5m "${HEALTH_5M:-0}" \
  --arg poolAddress "${POOL_ADDR:-}" \
  --arg rpcUrl "${RPC_URL:-http://127.0.0.1:8545}" "
  {
    chain: \$chain,
    up: ((\$up | select(. != \"\") | tonumber) // 0),
    health: ((\$health | select(. != \"\") | tonumber) // 0),
    health_5m: ((\$health5m | select(. != \"\") | tonumber) // 0),
    pool: {
      address: \$poolAddress,
      rpcUrl: \$rpcUrl
    },
    reserves: {
      void_raw: ((\$voidRaw | select(. != \"\") | tonumber) // 0),
      wc_raw: ((\$wcRaw | select(. != \"\") | tonumber) // 0)
    },
    price: {
      wc_per_void: ((\$wcPerVoid | select(. != \"\") | tonumber) // 0),
      void_per_wc: ((\$voidPerWc | select(. != \"\") | tonumber) // 0)
    }
  }
  | .reserves.void = (.reserves.void_raw / 1e18)
  | .reserves.wc   = (.reserves.wc_raw / 1e18)
"
