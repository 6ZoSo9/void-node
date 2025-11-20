#!/usr/bin/env bash
set -euo pipefail

REPO=${REPO:-"$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"}
PROM_URL=${PROM_URL:-"http://127.0.0.1:9090"}

cd "$REPO"

echo "[health-all] repo=$REPO"
echo "[health-all] prom_url=$PROM_URL"
echo

echo "[health-all] step 1: devnet FULL CI smoke (jobs/coverage + registries)..."
./ops/void-devnet-full-ci-smoke.sh
echo "[health-all] >>> FULL CI smoke OK"
echo

echo "[health-all] step 2: devnet overall health export..."
./ops/void-devnet-overall-health-exporter.sh
echo "[health-all] >>> overall health textfile export OK"
echo

echo "[health-all] step 3: Prometheus overall health sanity..."

overall_raw=$(
  curl -fsS "$PROM_URL/api/v1/query" \
    --data-urlencode 'query=void_devnet_overall_health' \
  | jq -r '.data.result[0].value[1]'
)

echo "[health-all] void_devnet_overall_health = ${overall_raw:-null}"

overall_5m=$(
  curl -fsS "$PROM_URL/api/v1/query" \
    --data-urlencode 'query=void:devnet_overall:max_5m' \
  | jq -r '.data.result[0].value[1]'
)

echo "[health-all] void:devnet_overall:max_5m = ${overall_5m:-null}"

if [[ "${overall_raw:-null}" != "1" || "${overall_5m:-null}" != "1" ]]; then
  echo "[health-all] ERROR: overall devnet health not 1 (raw=${overall_raw:-null}, max_5m=${overall_5m:-null})" >&2
  exit 1
fi

echo
echo "[health-all] RESULT: OK (devnet overall health==1 and FULL CI smoke passed)"

echo
echo "[spool] check void_devnet_spool_health"
SPOOL_HEALTH=$(curl -fsS "http://127.0.0.1:9090/api/v1/query?query=void_devnet_spool_health" | jq -r '.data.result[0].value[1]')
echo "[spool] void_devnet_spool_health = ${SPOOL_HEALTH:-<none>}"

/bin/echo "[spool] RESULT:" $(
  if [ "$SPOOL_HEALTH" = "1" ]; then
    echo "OK"
  else
    echo "BAD (spool health != 1)"
  fi
)
