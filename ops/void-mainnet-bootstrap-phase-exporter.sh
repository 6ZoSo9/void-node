#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"
METRICS_DIR="${METRICS_DIR:-${REPO_ROOT}/ops/metrics}"
METRICS_FILE="${METRICS_FILE:-${METRICS_DIR}/void_mainnet_bootstrap_phase.prom}"

query_scalar() {
  local expr="$1"
  local val

  val=$(curl -fsS "${PROM_URL}/api/v1/query" \
        --get --data-urlencode "query=${expr}" \
        | jq -r '.data.result[0].value[1] // "NaN"' 2>/dev/null || echo "NaN")

  echo "$val"
}

echo "=== [phase-exporter] VOID mainnet bootstrap phase exporter ==="
echo "[cfg] PROM_URL    = ${PROM_URL}"
echo "[cfg] METRICS_DIR = ${METRICS_DIR}"
echo "[cfg] METRICS_FILE= ${METRICS_FILE}"
echo

echo "=== [1] read core + PLAN gauges ==="

pillars=$(query_scalar 'void:mainnet_pillars:health:last_5m')
lastmile=$(query_scalar 'void:mainnet_lastmile:health:last_5m')
plan_configured=$(query_scalar 'void:mainnet_bootstrap_plan:configured:last_5m')
plan_health=$(query_scalar 'void:mainnet_bootstrap_plan:health:last_5m')

printf "  %-45s = %s\n" "void:mainnet_pillars:health:last_5m"            "${pillars}"
printf "  %-45s = %s\n" "void:mainnet_lastmile:health:last_5m"           "${lastmile}"
printf "  %-45s = %s\n" "void:mainnet_bootstrap_plan:configured:last_5m" "${plan_configured}"
printf "  %-45s = %s\n" "void:mainnet_bootstrap_plan:health:last_5m"     "${plan_health}"
echo

echo "=== [2] compute phase code ==="

phase="PRE"
code=0

if [[ "${pillars}" == "1" && "${lastmile}" == "1" ]]; then
  if [[ "${plan_configured}" != "1" ]]; then
    phase="A"
    code=1
  else
    if [[ "${plan_health}" == "1" ]]; then
      phase="C"
      code=3
    else
      phase="B"
      code=2
    fi
  fi
fi

echo "  phase : ${phase}"
echo "  code  : ${code}"
echo

echo "=== [3] write Prometheus metrics file ==="

mkdir -p "${METRICS_DIR}"

tmp_file="$(mktemp "${METRICS_DIR}/.void_mainnet_bootstrap_phase.prom.tmp.XXXXXX")"

cat > "${tmp_file}" <<EOF
# HELP void_mainnet_bootstrap_phase_code Bootstrap phase code (0=PRE,1=A,2=B,3=C)
# TYPE void_mainnet_bootstrap_phase_code gauge
void_mainnet_bootstrap_phase_code{phase="${phase}"} ${code}
EOF

mv "${tmp_file}" "${METRICS_FILE}"

echo "[phase-exporter] wrote metrics to ${METRICS_FILE}"
echo "=== [phase-exporter] DONE ==="
