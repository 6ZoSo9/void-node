#!/usr/bin/env bash
set -euo pipefail

ROOT="${ROOT:-$HOME/dev/void-node}"
PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

q_val() {
  local expr="$1"
  curl -fsS "$PROM_URL/api/v1/query" \
    --data-urlencode "query=$expr" \
    | jq -r '.data.result[0].value[1] // empty'
}

echo "=== [cfg] workcredits-devnet pool JSON ===" 1>&2
echo "  ROOT     = $ROOT" 1>&2
echo "  PROM_URL = $PROM_URL" 1>&2
echo 1>&2

UP="$(q_val 'void_workcredits_devnet_up{chain="devnet"}')"
VOID_RAW="$(q_val 'void_workcredits_devnet_void_reserve_raw{chain="devnet"}')"
WC_RAW="$(q_val 'void_workcredits_devnet_wc_reserve_raw{chain="devnet"}')"
# --- bigint-safe human formatting (no jq tonumber / float) ---
fmt_18() {
  python3 - <<'PYFMT'
import os
raw = os.environ.get("RAW","0").strip()
raw = "".join([c for c in raw if c.isdigit()]) or "0"
d = 18
if len(raw) <= d:
  out = "0." + ("0"*(d-len(raw))) + raw
else:
  out = raw[:-d] + "." + raw[-d:]
out = out.rstrip("0").rstrip(".")
print(out if out else "0")
PYFMT
}
VOID_HUMAN="$(RAW="$VOID_RAW" fmt_18)"
WC_HUMAN="$(RAW="$WC_RAW" fmt_18)"


WC_PER_VOID="$(q_val 'void_workcredits_devnet_wc_per_void{chain="devnet"}')"
VOID_PER_WC="$(q_val 'void_workcredits_devnet_void_per_wc{chain="devnet"}')"

HEALTH="$(q_val 'void_workcredits_devnet_pool_health{chain="devnet"}')"
HEALTH_5M="$(q_val 'void:workcredits_devnet_pool_health:last_5m{chain="devnet"}')"

POOL_META_JSON="$(curl -fsS "$PROM_URL/api/v1/query" \
  --data-urlencode 'query=void_workcredits_devnet_pool_meta{chain="devnet"}')"

POOL_ADDR="$(echo "$POOL_META_JSON" | jq -r '.data.result[0].metric.pool_address // ""')"
RPC_URL="$(echo "$POOL_META_JSON" | jq -r '.data.result[0].metric.rpc_url // ""')"

jq -n \
  --arg chain "devnet" \
  --arg up "$UP" \
  --arg voidRaw "$VOID_RAW" \
  --arg wcRaw "$WC_RAW" \
  --arg voidHuman "$VOID_HUMAN" \
  --arg wcHuman "$WC_HUMAN" \
  --arg wcPerVoid "$WC_PER_VOID" \
  --arg voidPerWc "$VOID_PER_WC" \
  --arg health "$HEALTH" \
  --arg health5m "$HEALTH_5M" \
  --arg poolAddress "$POOL_ADDR" \
  --arg rpcUrl "$RPC_URL" '
  {
    chain: $chain,
    up: ( ($up | select(. != "") | tonumber) // 0 ),
    health: ( ($health | select(. != "") | tonumber) // 0 ),
    health_5m: ( ($health5m | select(. != "") | tonumber) // 0 ),
    pool: {
      address: $poolAddress,
      rpcUrl: $rpcUrl
    },
    reserves: {
      void_raw: ( ($voidRaw | select(. != "") | tonumber) // 0 ),
      wc_raw: ( ($wcRaw | select(. != "") | tonumber) // 0 )
    },
    price: {
      wc_per_void: ( ($wcPerVoid | select(. != "") | tonumber) // 0 ),
      void_per_wc: ( ($voidPerWc | select(. != "") | tonumber) // 0 )
    }
  }
  | .reserves.void = $voidHuman
  | .reserves.wc   = $wcHuman
'
