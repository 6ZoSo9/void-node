#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-$HOME/dev/void-node}"
TEXTFILE_DIR="${TEXTFILE_DIR:-/var/lib/node_exporter/textfile_collector}"
STATE_JSON="${STATE_JSON:-$REPO_ROOT/docs/VOID-WORKCREDITS-DEVNET-STATE.json}"
OUT_FILE="${OUT_FILE:-$TEXTFILE_DIR/void_workcredits_devnet_pool.prom}"

cd "$REPO_ROOT"

echo "=== [workcredits-devnet-health] VOID WorkCredits devnet pool health ==="
echo "[cfg] REPO_ROOT   = $REPO_ROOT"
echo "[cfg] STATE_JSON  = $STATE_JSON"
echo "[cfg] TEXTFILE_DIR= $TEXTFILE_DIR"
echo "[cfg] OUT_FILE    = $OUT_FILE"

if ! command -v jq >/dev/null 2>&1; then
  echo "[fatal] jq is required but not installed" >&2
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "[fatal] python3 is required but not installed" >&2
  exit 1
fi

if [[ ! -f "$STATE_JSON" ]]; then
  echo "[fatal] state file missing: $STATE_JSON" >&2
  echo "        create it (you can start from the sample we installed) and rerun." >&2
  exit 1
fi

echo
echo "=== [1] reading state JSON ==="
chain="$(jq -r '.chain // "devnet"' "$STATE_JSON")"
rpc_url="$(jq -r '.rpc_url // ""' "$STATE_JSON")"
void_raw="$(jq -r '.void_reserve_raw // "0"' "$STATE_JSON")"
wc_raw="$(jq -r '.wc_reserve_raw // "0"' "$STATE_JSON")"

echo "[state] chain           = $chain"
echo "[state] rpc_url         = $rpc_url"
echo "[state] void_reserve_raw= $void_raw"
echo "[state] wc_reserve_raw  = $wc_raw"

echo
echo "=== [2] computing price ratios ==="
ratios_out="$(python3 - <<PY
from decimal import Decimal, getcontext
getcontext().prec = 36

void_raw = Decimal(str("$void_raw"))
wc_raw = Decimal(str("$wc_raw"))

if void_raw == 0 or wc_raw == 0:
    wc_per_void = Decimal(0)
    void_per_wc = Decimal(0)
else:
    wc_per_void = wc_raw / void_raw
    void_per_wc = void_raw / wc_raw

print(f"wc_per_void={wc_per_void}")
print(f"void_per_wc={void_per_wc}")
PY
)"

wc_per_void="$(printf '%s\n' "$ratios_out" | awk -F= '/^wc_per_void=/{print $2}')"
void_per_wc="$(printf '%s\n' "$ratios_out" | awk -F= '/^void_per_wc=/{print $2}')"

echo "[price] wc_per_void = $wc_per_void"
echo "[price] void_per_wc = $void_per_wc"

echo
echo "=== [3] writing Prometheus textfile ==="
tmp="$(mktemp)"

cat > "$tmp" <<EOF
# HELP void_workcredits_devnet_void_reserve_raw VOID reserve in pool (raw 18-dec units)
# TYPE void_workcredits_devnet_void_reserve_raw gauge
void_workcredits_devnet_void_reserve_raw{chain="$chain"} $void_raw

# HELP void_workcredits_devnet_wc_reserve_raw WorkCredits reserve in pool (raw 18-dec units)
# TYPE void_workcredits_devnet_wc_reserve_raw gauge
void_workcredits_devnet_wc_reserve_raw{chain="$chain"} $wc_raw

# HELP void_workcredits_devnet_wc_per_void WC per 1 VOID (price)
# TYPE void_workcredits_devnet_wc_per_void gauge
void_workcredits_devnet_wc_per_void{chain="$chain"} $wc_per_void

# HELP void_workcredits_devnet_void_per_wc VOID per 1 WC (price)
# TYPE void_workcredits_devnet_void_per_wc gauge
void_workcredits_devnet_void_per_wc{chain="$chain"} $void_per_wc

# HELP void_workcredits_devnet_pool_meta Static metadata for WC/VOID pool
# TYPE void_workcredits_devnet_pool_meta gauge
void_workcredits_devnet_pool_meta{chain="$chain",rpc_url="$rpc_url"} 1
EOF

echo "[write] $OUT_FILE"
if [[ ! -d "$TEXTFILE_DIR" ]]; then
  echo "[info] creating TEXTFILE_DIR (sudo may prompt): $TEXTFILE_DIR"
  sudo mkdir -p "$TEXTFILE_DIR"
fi

sudo tee "$OUT_FILE" >/dev/null < "$tmp"
rm -f "$tmp"

echo
echo "=== [4] done ==="
echo "You can check node_exporter metrics with, e.g.:"
echo "  curl -fsS \"http://127.0.0.1:9100/metrics\" | grep '^void_workcredits_devnet_' || true"
