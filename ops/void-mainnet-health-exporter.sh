#!/usr/bin/env bash
set -euo pipefail

PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

# node_exporter textfile collector dir
TEXTFILE_DIR_DEFAULT="/var/lib/node_exporter/textfile_collector"
TEXTFILE_DIR="${TEXTFILE_DIR:-$TEXTFILE_DIR_DEFAULT}"
OUT_FILE="$TEXTFILE_DIR/void_mainnet_pillars.prom"

echo "[pillars-exporter] prom_url=${PROM_URL}"
echo "[pillars-exporter] TEXTFILE_DIR=${TEXTFILE_DIR}"
echo "[pillars-exporter] OUT_FILE=${OUT_FILE}"

mkdir -p "${TEXTFILE_DIR}"

query_scalar() {
  local expr="$1"
  curl -fsS "${PROM_URL}/api/v1/query" \
    --data-urlencode "query=${expr}" \
    | jq -r '.data.result[0].value[1] // "NaN"' 2>/dev/null
}

to_bool() {
  local v="${1:-NaN}"
  if [ "${v}" = "1" ]; then
    echo 1
  else
    echo 0
  fi
}

now_ts() {
  date +%s
}

# === [1] Fetch base health metrics ===

core_health_raw="$(query_scalar 'void_mainnet_core_health')"
tokenomics_health_raw="$(query_scalar 'void_mainnet_tokenomics_health')"
# New: spec health SLO, 5m-smoothed
tokenomics_spec_health_raw="$(query_scalar 'void:mainnet_tokenomics:spec_health:last_5m')"
lastmile_health_raw="$(query_scalar 'void_mainnet_pillars_lastmile_ok or void:mainnet_lastmile:health:last_5m or void_mainnet_lastmile_nonempty_ratio')"
usage_health_raw="$(query_scalar 'void_mainnet_usage_health')"

echo "[pillars-exporter] core_health_raw=${core_health_raw}"
echo "[pillars-exporter] tokenomics_health_raw=${tokenomics_health_raw}"
echo "[pillars-exporter] tokenomics_spec_health_raw=${tokenomics_spec_health_raw}"
echo "[pillars-exporter] lastmile_health_raw=${lastmile_health_raw}"
echo "[pillars-exporter] usage_health_raw=${usage_health_raw}"

core_ok="$(to_bool "${core_health_raw}")"
tokenomics_ok_base="$(to_bool "${tokenomics_health_raw}")"
tokenomics_spec_ok="$(to_bool "${tokenomics_spec_health_raw}")"
lastmile_ok="$(to_bool "${lastmile_health_raw}")"
usage_ok="$(to_bool "${usage_health_raw}")"

# Tokenomics pillar is only OK if BOTH structural tokenomics and spec health are OK.
if [ "${tokenomics_ok_base}" -eq 1 ] && [ "${tokenomics_spec_ok}" -eq 1 ]; then
  tokenomics_ok=1
else
  tokenomics_ok=0
fi

# Overall pillar OK = all sub-pillars OK (simple AND via multiplication)
overall_ok=$(( core_ok * tokenomics_ok * lastmile_ok * usage_ok ))

# For now, pillars_health just mirrors overall_ok as a convenience
pillars_health="${overall_ok}"

ts_now="$(now_ts)"

# === [2] Write textfile metrics ===

cat >"${OUT_FILE}" <<EOF
# HELP void_mainnet_pillars_core_ok Mainnet core pillar OK (1=yes,0=no)
# TYPE void_mainnet_pillars_core_ok gauge
void_mainnet_pillars_core_ok ${core_ok}

# HELP void_mainnet_pillars_tokenomics_ok Mainnet tokenomics pillar OK (1=yes,0=no, requires spec + structural health)
# TYPE void_mainnet_pillars_tokenomics_ok gauge
void_mainnet_pillars_tokenomics_ok ${tokenomics_ok}

# HELP void_mainnet_pillars_lastmile_ok Mainnet last-mile pillar OK (1=yes,0=no)
# TYPE void_mainnet_pillars_lastmile_ok gauge
void_mainnet_pillars_lastmile_ok ${lastmile_ok}

# HELP void_mainnet_pillars_usage_ok Mainnet usage pillar OK (1=yes,0=no)
# TYPE void_mainnet_pillars_usage_ok gauge
void_mainnet_pillars_usage_ok ${usage_ok}

# HELP void_mainnet_pillars_overall_ok Mainnet overall pillar OK (1=yes,0=no)
# TYPE void_mainnet_pillars_overall_ok gauge
void_mainnet_pillars_overall_ok ${overall_ok}

# HELP void_mainnet_pillars_health Mainnet pillars aggregate health (1=ok,0=bad)
# TYPE void_mainnet_pillars_health gauge
void_mainnet_pillars_health ${pillars_health}

# HELP void_mainnet_pillars_last_run_ts Unix timestamp of last mainnet pillars exporter run
# TYPE void_mainnet_pillars_last_run_ts gauge
void_mainnet_pillars_last_run_ts ${ts_now}
EOF

echo "[pillars-exporter] wrote ${OUT_FILE}"
