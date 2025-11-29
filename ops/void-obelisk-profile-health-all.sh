#!/usr/bin/env bash
set -euo pipefail

PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"
PROFILE_HEALTH_RULE="void:obelisk_profile_health:last_5m"
PROFILE_RAW_GAUGE="void_obelisk_profile_health"
PROFILE_CHAINID_GAUGE="void_obelisk_profile_chainid"
PROFILE_HEAD_MAIN_GAUGE="void_obelisk_profile_head_main"
PROFILE_HEAD_SAFE_GAUGE="void_obelisk_profile_head_safeboot"
PROFILE_TXROOT_MAIN_GAUGE="void_obelisk_profile_txroot_main_ok"
PROFILE_TXROOT_SAFE_GAUGE="void_obelisk_profile_txroot_safeboot_ok"

echo "=== [obelisk-health-all] VOID Obelisk mainnet profile pillar ==="
echo "[cfg] PROM_URL = ${PROM_URL}"

cd "$(dirname "$0")/.."

echo
echo "=== [0] local profile health script ==="
if [[ -x ./ops/obelisk-mainnet-profile-health.sh ]]; then
  ./ops/obelisk-mainnet-profile-health.sh || echo "[WARN] obelisk-mainnet-profile-health.sh exited non-zero (see above)"
else
  echo "[WARN] ./ops/obelisk-mainnet-profile-health.sh not found or not executable"
fi

echo
echo "=== [1] raw gauges from Prometheus (textfile collector) ==="

curl -fsS "${PROM_URL}/api/v1/query" \
  --data-urlencode "query=${PROFILE_RAW_GAUGE}" \
  | jq '.data.result' || echo "[]"

curl -fsS "${PROM_URL}/api/v1/query" \
  --data-urlencode "query=${PROFILE_CHAINID_GAUGE}" \
  | jq '.data.result' || echo "[]"

curl -fsS "${PROM_URL}/api/v1/query" \
  --data-urlencode "query=${PROFILE_HEAD_MAIN_GAUGE}" \
  | jq '.data.result' || echo "[]"

curl -fsS "${PROM_URL}/api/v1/query" \
  --data-urlencode "query=${PROFILE_HEAD_SAFE_GAUGE}" \
  | jq '.data.result' || echo "[]"

curl -fsS "${PROM_URL}/api/v1/query" \
  --data-urlencode "query=${PROFILE_TXROOT_MAIN_GAUGE}" \
  | jq '.data.result' || echo "[]"

curl -fsS "${PROM_URL}/api/v1/query" \
  --data-urlencode "query=${PROFILE_TXROOT_SAFE_GAUGE}" \
  | jq '.data.result' || echo "[]"

echo
echo "=== [2] 5m smoothed health rule ==="
curl -fsS "${PROM_URL}/api/v1/query" \
  --data-urlencode "query=${PROFILE_HEALTH_RULE}" \
  | jq '.data.result' || echo "[]"

echo
echo "=== [3] interpretation ==="

raw_val=$(
  curl -fsS "${PROM_URL}/api/v1/query" \
    --data-urlencode "query=${PROFILE_RAW_GAUGE}" \
    | jq -r '.data.result[0].value[1] // empty' 2>/dev/null || true
)

smooth_val=$(
  curl -fsS "${PROM_URL}/api/v1/query" \
    --data-urlencode "query=${PROFILE_HEALTH_RULE}" \
    | jq -r '.data.result[0].value[1] // empty' 2>/dev/null || true
)

if [[ "${raw_val}" == "1" && "${smooth_val}" == "1" ]]; then
  echo "[obelisk-health-all] RESULT: OK (profile health gauges == 1 and last_5m == 1)"
  exit 0
fi

echo "[obelisk-health-all] RESULT: NOT OK"
echo "  raw   = ${raw_val:-<missing>}"
echo "  last5 = ${smooth_val:-<missing>}"
exit 1
