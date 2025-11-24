#!/usr/bin/env bash
set -euo pipefail

PROM="http://127.0.0.1:9090"
OUTDIR="/var/lib/node_exporter/textfile_collector"
OUT="$OUTDIR/void_mainnet_health.prom"

mkdir -p "$OUTDIR"

q() {
  local expr="$1"
  curl -fsS "$PROM/api/v1/query?query=$expr" \
    | jq -r '.data.result[0].value[1] // "null"' || echo "null"
}

ts_now=$(date +%s)

core_v2=$(q 'void:mainnet_overall_v2:core:last_5m')
core_v1=$(q 'void:mainnet_core:health:last_5m')
token_v1=$(q 'void:mainnet_tokenomics:health:last_5m')
overall_v1=$(q 'void:mainnet_overall:health:last_5m')
overall_v2=$(q 'void:mainnet_overall_v2:health:last_5m')
alias_v2=$(q 'void:mainnet_overall:health:last_5m_v2')

nonempty_5m=$(q 'void:mainnet_lastmile:nonempty_recent_5m')
gap_blocks=$(q 'void:mainnet_lastmile:last_nonempty_gap')

usage_health=$(q 'void:mainnet_usage:health:last_5m')

# Normalise nulls
norm01() {
  local v="$1"
  if [ "$v" = "null" ] || [ -z "$v" ]; then
    echo "0"
  else
    echo "$v"
  fi
}

core_v2=$(norm01 "$core_v2")
core_v1=$(norm01 "$core_v1")
token_v1=$(norm01 "$token_v1")
overall_v1=$(norm01 "$overall_v1")
overall_v2=$(norm01 "$overall_v2")
alias_v2=$(norm01 "$alias_v2")
nonempty_5m=$(norm01 "$nonempty_5m")
gap_blocks=$(norm01 "$gap_blocks")
usage_health=$(norm01 "$usage_health")

core_ok=0
[ "$core_v2" = "1" ] && core_ok=1

token_ok=0
[ "$token_v1" = "1" ] && token_ok=1

overall_ok=0
if [ "$overall_v2" = "1" ] || [ "$alias_v2" = "1" ]; then
  overall_ok=1
fi

lastmile_ok=0
if [ "$nonempty_5m" = "1" ]; then
  # guard gap; treat non-numeric as bad
  if [[ "$gap_blocks" =~ ^[0-9]+(\.[0-9]+)?$ ]]; then
    g_int=${gap_blocks%.*}
    if [ "$g_int" -le 50 ]; then
      lastmile_ok=1
    fi
  fi
fi

usage_ok=0
[ "$usage_health" = "1" ] && usage_ok=1

pillar_health=$(( core_ok * lastmile_ok * token_ok * overall_ok * usage_ok ))

cat >"$OUT" <<EOF
# HELP void_mainnet_pillars_core_ok Mainnet core pillar OK (1=yes,0=no)
# TYPE void_mainnet_pillars_core_ok gauge
void_mainnet_pillars_core_ok $core_ok

# HELP void_mainnet_pillars_lastmile_ok Mainnet last-mile pillar OK (1=yes,0=no)
# TYPE void_mainnet_pillars_lastmile_ok gauge
void_mainnet_pillars_lastmile_ok $lastmile_ok

# HELP void_mainnet_pillars_tokenomics_ok Mainnet tokenomics pillar OK (1=yes,0=no)
# TYPE void_mainnet_pillars_tokenomics_ok gauge
void_mainnet_pillars_tokenomics_ok $token_ok

# HELP void_mainnet_pillars_overall_ok Mainnet overall pillar OK (1=yes,0=no)
# TYPE void_mainnet_pillars_overall_ok gauge
void_mainnet_pillars_overall_ok $overall_ok

# HELP void_mainnet_pillars_usage_ok Mainnet usage pillar OK (1=yes,0=no)
# TYPE void_mainnet_pillars_usage_ok gauge
void_mainnet_pillars_usage_ok $usage_ok

# HELP void_mainnet_pillars_health Mainnet pillars aggregate health (1=ok,0=bad)
# TYPE void_mainnet_pillars_health gauge
void_mainnet_pillars_health $pillar_health

# HELP void_mainnet_pillars_last_run_ts Unix timestamp of last mainnet pillars exporter run
# TYPE void_mainnet_pillars_last_run_ts gauge
void_mainnet_pillars_last_run_ts $ts_now
EOF
