#!/usr/bin/env bash
set -euo pipefail

PROM="http://127.0.0.1:9090"
OUTDIR="/var/lib/node_exporter/textfile_collector"
OUT="$OUTDIR/void_pillars_health.prom"

mkdir -p "$OUTDIR"

q() {
  local expr="$1"
  curl -fsS "$PROM/api/v1/query?query=$expr" \
    | jq -r '.data.result[0].value[1] // "null"' || echo "null"
}

ts_now=$(date +%s)

# Components:
# - safeboot: from exporter job
# - devnet: overall devnet health (5m max)
# - mainnet: pillars aggregate (5m max)
safeboot_raw=$(q 'void_safeboot_health')
devnet_raw=$(q 'void:devnet_overall:max_5m')
mainnet_pillars_raw=$(q 'void:mainnet_pillars:health:last_5m')

norm01() {
  local v="$1"
  if [ "$v" = "null" ] || [ -z "$v" ]; then
    echo "0"
  else
    echo "$v"
  fi
}

safeboot_raw=$(norm01 "$safeboot_raw")
devnet_raw=$(norm01 "$devnet_raw")
mainnet_pillars_raw=$(norm01 "$mainnet_pillars_raw")

safeboot_ok=0
[ "$safeboot_raw" = "1" ] && safeboot_ok=1

devnet_ok=0
[ "$devnet_raw" = "1" ] && devnet_ok=1

mainnet_pillars_ok=0
[ "$mainnet_pillars_raw" = "1" ] && mainnet_pillars_ok=1

pillars_health=$(( safeboot_ok * devnet_ok * mainnet_pillars_ok ))

cat >"$OUT" <<EOF
# HELP void_pillars_safeboot_ok Safeboot pillar OK (1=yes,0=no)
# TYPE void_pillars_safeboot_ok gauge
void_pillars_safeboot_ok $safeboot_ok

# HELP void_pillars_devnet_ok Devnet pillar OK (1=yes,0=no)
# TYPE void_pillars_devnet_ok gauge
void_pillars_devnet_ok $devnet_ok

# HELP void_pillars_mainnet_ok Mainnet pillars OK (1=yes,0=no)
# TYPE void_pillars_mainnet_ok gauge
void_pillars_mainnet_ok $mainnet_pillars_ok

# HELP void_pillars_health Global VOID pillars health (1=ok,0=bad)
# TYPE void_pillars_health gauge
void_pillars_health $pillars_health

# HELP void_pillars_last_run_ts Unix timestamp of last global pillars exporter run
# TYPE void_pillars_last_run_ts gauge
void_pillars_last_run_ts $ts_now
EOF
