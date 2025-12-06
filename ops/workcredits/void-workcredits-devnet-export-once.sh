#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-$HOME/dev/void-node}"
CFG="$REPO_ROOT/config/void-workcredits-devnet.live.json"
OUT="/var/lib/node_exporter/textfile_collector/void-workcredits-devnet.prom"

if [[ ! -f "$CFG" ]]; then
  echo "[FATAL] config not found: $CFG" >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "[FATAL] jq not found" >&2
  exit 1
fi

if ! command -v cast >/dev/null 2>&1; then
  echo "[FATAL] cast not found" >&2
  exit 1
fi

CHAIN_ID="$(jq -r '.chainId' "$CFG")"
RPC_URL="$(jq -r '.rpcUrl' "$CFG")"
VOID_TOKEN="$(jq -r '.voidToken' "$CFG")"
WC_TOKEN="$(jq -r '.workCreditsToken' "$CFG")"
LP_POOL="$(jq -r '.lpPool' "$CFG")"

echo "=== [workcredits-devnet-export] ==="
echo "CFG        = $CFG"
echo "CHAIN_ID   = $CHAIN_ID"
echo "NETWORK    = devnet"
echo "RPC_URL    = $RPC_URL"
echo "VOID_TOKEN = $VOID_TOKEN"
echo "WC_TOKEN   = $WC_TOKEN"
echo "LP_POOL    = $LP_POOL"
echo

void_raw="0"
wc_raw="0"
up="1"
has_liquidity="0"

if [[ "$LP_POOL" == "0x0000000000000000000000000000000000000000" || "$LP_POOL" == "0x0" ]]; then
  echo "[info] lpPool is zero-address; treating reserves as 0 for now."
else
  echo "[info] querying reserves from pool..."

  # reserveVOID() and reserveWC() are public uint256 getters
  raw_v="$(cast call "$LP_POOL" "reserveVOID()(uint256)" --rpc-url "$RPC_URL" || echo "0")"
  raw_w="$(cast call "$LP_POOL" "reserveWC()(uint256)" --rpc-url "$RPC_URL" || echo "0")"

  # strip non-digits just in case (defensive)
  void_raw="$(printf '%s' "$raw_v" | tr -cd '0-9')"
  wc_raw="$(printf '%s' "$raw_w" | tr -cd '0-9')"

  [[ -z "$void_raw" ]] && void_raw="0"
  [[ -z "$wc_raw"  ]] && wc_raw="0"

  echo "[info] void_raw from pool = $void_raw"
  echo "[info] wc_raw   from pool = $wc_raw"

  if [[ "$void_raw" != "0" && "$wc_raw" != "0" ]]; then
    has_liquidity="1"
  fi
fi

# simple ratios as floats; don't care if they are rough, they are for dashboards only
wc_per_void="0"
void_per_wc="0"

if [[ "$void_raw" != "0" ]]; then
  wc_per_void="$(python3 - <<PY
from decimal import Decimal, getcontext
getcontext().prec = 40
v = Decimal("$void_raw")
w = Decimal("$wc_raw")
print((w / v).normalize())
PY
  )" || wc_per_void="0"
fi

if [[ "$wc_raw" != "0" ]]; then
  void_per_wc="$(python3 - <<PY
from decimal import Decimal, getcontext
getcontext().prec = 40
v = Decimal("$void_raw")
w = Decimal("$wc_raw")
print((v / w).normalize())
PY
  )" || void_per_wc="0"
fi

echo "[info] wc_per_void = $wc_per_void"
echo "[info] void_per_wc = $void_per_wc"
echo
echo "[info] up            = $up"
echo "[info] has_liquidity = $has_liquidity"
echo
echo "[info] writing metrics to $OUT (via sudo)..."

tmp="$(mktemp)"
cat > "$tmp" <<PROM
# HELP void_workcredits_devnet_up Exporter health for WorkCredits devnet (1 = exporter ran)
# TYPE void_workcredits_devnet_up gauge
void_workcredits_devnet_up{chain="devnet"} $up

# HELP void_workcredits_devnet_has_liquidity Whether LP has non-zero reserves (1=yes,0=no)
# TYPE void_workcredits_devnet_has_liquidity gauge
void_workcredits_devnet_has_liquidity{chain="devnet"} $has_liquidity

# HELP void_workcredits_devnet_void_reserve_raw VOID reserve in pool (raw 18-dec units)
# TYPE void_workcredits_devnet_void_reserve_raw gauge
void_workcredits_devnet_void_reserve_raw{chain="devnet"} $void_raw

# HELP void_workcredits_devnet_wc_reserve_raw WorkCredits reserve in pool (raw 18-dec units)
# TYPE void_workcredits_devnet_wc_reserve_raw gauge
void_workcredits_devnet_wc_reserve_raw{chain="devnet"} $wc_raw

# HELP void_workcredits_devnet_wc_per_void WC per 1 VOID (price)
# TYPE void_workcredits_devnet_wc_per_void gauge
void_workcredits_devnet_wc_per_void{chain="devnet"} $wc_per_void

# HELP void_workcredits_devnet_void_per_wc VOID per 1 WC (price)
# TYPE void_workcredits_devnet_void_per_wc gauge
void_workcredits_devnet_void_per_wc{chain="devnet"} $void_per_wc

# HELP void_workcredits_devnet_pool_meta Static metadata for WC/VOID pool
# TYPE void_workcredits_devnet_pool_meta gauge
void_workcredits_devnet_pool_meta{chain="devnet",rpc_url="$RPC_URL",lp_pool="$LP_POOL"} 1
PROM

sudo mv "$tmp" "$OUT"

echo "[info] done. metrics textfile written."
