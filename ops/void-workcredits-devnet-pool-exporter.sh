#!/usr/bin/env bash
set -euo pipefail

# REPO_ROOT: default to repo root (one level above ops/)
REPO_ROOT="${REPO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"

STATE_SCRIPT="$REPO_ROOT/ops/void-workcredits-devnet-pool-state.sh"

# Where node_exporter textfile collector reads from
TEXTFILE_DIR="${TEXTFILE_DIR:-/var/lib/node_exporter/textfile_collector}"
OUT_FILE="$TEXTFILE_DIR/void_workcredits_devnet_pool.prom"

if [[ ! -x "$STATE_SCRIPT" ]]; then
  echo "[FATAL] state script not executable: $STATE_SCRIPT" >&2
  exit 1
fi

# Run the state script and capture all of its stdout.
state_out="$("$STATE_SCRIPT")"

echo "[DEBUG] state_out:"
printf '%s\n' "$state_out"

# Parse token + pool addresses
voidToken="$(printf '%s\n' "$state_out" | awk '/^VoidToken[[:space:]]*=/{print $NF}' | head -n1)"
workCreditsToken="$(printf '%s\n' "$state_out" | awk '/^WorkCreditsToken[[:space:]]*=/{print $NF}' | head -n1)"
workCreditsPool="$(printf '%s\n' "$state_out" | awk '/^WorkCreditsPoolV1[[:space:]]*=/{print $NF}' | head -n1)"

if [[ -z "$voidToken" || -z "$workCreditsToken" || -z "$workCreditsPool" ]]; then
  echo "[FATAL] could not parse VoidToken/WorkCreditsToken/WorkCreditsPoolV1 from state output" >&2
  exit 1
fi

# Parse reserves (raw 18-dec)
void_reserve_raw="$(printf '%s\n' "$state_out" | awk '/^voidReserveRaw/{print $NF}' | head -n1)"
wc_reserve_raw="$(printf '%s\n' "$state_out" | awk '/^wcReserveRaw/{print $NF}' | head -n1)"

# Parse ratios
wc_per_void="$(printf '%s\n' "$state_out" | awk '/^WC_per_VOID[[:space:]]*=/ {print $NF}' | head -n1)"
void_per_wc="$(printf '%s\n' "$state_out" | awk '/^VOID_per_WC[[:space:]]*=/ {print $NF}' | head -n1)"

if [[ -z "$void_reserve_raw" || -z "$wc_reserve_raw" || -z "$wc_per_void" || -z "$void_per_wc" ]]; then
  echo "[FATAL] could not parse reserves/ratios from state output" >&2
  exit 1
fi

tmp="$(mktemp)"

cat > "$tmp" <<EOF
# HELP void_workcredits_devnet_void_reserve_raw VOID reserve in pool (raw 18-dec units)
# TYPE void_workcredits_devnet_void_reserve_raw gauge
void_workcredits_devnet_void_reserve_raw{chain="devnet"} $void_reserve_raw

# HELP void_workcredits_devnet_wc_reserve_raw WorkCredits reserve in pool (raw 18-dec units)
# TYPE void_workcredits_devnet_wc_reserve_raw gauge
void_workcredits_devnet_wc_reserve_raw{chain="devnet"} $wc_reserve_raw

# HELP void_workcredits_devnet_wc_per_void WC per 1 VOID (price)
# TYPE void_workcredits_devnet_wc_per_void gauge
void_workcredits_devnet_wc_per_void{chain="devnet"} $wc_per_void

# HELP void_workcredits_devnet_void_per_wc VOID per 1 WC (price)
# TYPE void_workcredits_devnet_void_per_wc gauge
void_workcredits_devnet_void_per_wc{chain="devnet"} $void_per_wc

# HELP void_workcredits_devnet_pool_meta Static metadata for WC/VOID pool
# TYPE void_workcredits_devnet_pool_meta gauge
void_workcredits_devnet_pool_meta{chain="devnet",voidToken="$voidToken",workCreditsToken="$workCreditsToken",pool="$workCreditsPool"} 1
EOF

# Install with sane perms for node_exporter
install -m 0644 "$tmp" "$OUT_FILE"
rm -f "$tmp"

echo "[OK] wrote $OUT_FILE"
