#!/usr/bin/env bash
set -euo pipefail

PROM="http://127.0.0.1:9090"
OUTDIR="/var/lib/node_exporter/textfile_collector"
OUT="$OUTDIR/void_mainnet_usage.prom"

mkdir -p "$OUTDIR"

q() {
  local expr="$1"
  curl -fsS "$PROM/api/v1/query?query=$expr" \
    | jq -r '.data.result[0].value[1] // "null"' || echo "null"
}

ts_now=$(date +%s)

nonempty_recent_raw=$(q 'void_mainnet_pillars_lastmile_ok or void:mainnet_lastmile:health:last_5m or void_mainnet_lastmile_nonempty_ratio')
gap_raw=$(q 'void:mainnet_lastmile:last_nonempty_gap')

nonempty_recent="$nonempty_recent_raw"
gap="$gap_raw"

if [ "$nonempty_recent" = "null" ] || [ -z "$nonempty_recent" ]; then
  nonempty_recent="0"
fi

if [ "$gap" = "null" ] || [ -z "$gap" ]; then
  gap="0"
fi

nonempty_ok=0
if [ "$nonempty_recent" = "1" ]; then
  nonempty_ok=1
fi

gap_ok=0
# treat non-numeric as bad; small gaps are good
if [[ "$gap" =~ ^[0-9]+(\.[0-9]+)?$ ]]; then
  g_int=${gap%.*}
  if [ "$g_int" -le 50 ]; then
    gap_ok=1
  fi
fi

# Placeholder for future job/receipt-based usage; for now always OK
jobs_ok=1

usage_health=$(( nonempty_ok * gap_ok * jobs_ok ))

cat >"$OUT" <<EOF
# HELP void_mainnet_usage_nonempty_recent Whether recent blocks were non-empty (1=yes,0=no)
# TYPE void_mainnet_usage_nonempty_recent gauge
void_mainnet_usage_nonempty_recent $nonempty_recent

# HELP void_mainnet_usage_last_nonempty_gap Gap in blocks since last non-empty block
# TYPE void_mainnet_usage_last_nonempty_gap gauge
void_mainnet_usage_last_nonempty_gap $gap

# HELP void_mainnet_usage_health Mainnet usage health (1=ok,0=bad) based on non-empty blocks + gap (jobs/receipts later)
# TYPE void_mainnet_usage_health gauge
void_mainnet_usage_health $usage_health

# HELP void_mainnet_usage_last_run_ts Unix timestamp of last exporter run
# TYPE void_mainnet_usage_last_run_ts gauge
void_mainnet_usage_last_run_ts $ts_now
EOF
