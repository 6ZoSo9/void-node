#!/usr/bin/env bash
set -euo pipefail
PROM="${PROM:-http://127.0.0.1:9090}"

# Reuse the existing local hammer if present, otherwise inline the core query.
if command -v void-mainnet-overall-health-v2.sh >/dev/null 2>&1; then
  void-mainnet-overall-health-v2.sh
else
  echo '=== [VOID mainnet-core / mainnet-overall v2 health check] ==='
  core_v2="$(curl -fsS "$PROM/api/v1/query?query=max(void:mainnet_core:health:last_5m_v2)" \
    | jq -r '.data.result[0].value[1] // "0"')" || core_v2="0"
  overall_v2="$(curl -fsS "$PROM/api/v1/query?query=max(void:mainnet_overall:health:last_5m_v2)" \
    | jq -r '.data.result[0].value[1] // "0"')" || overall_v2="0"
  echo "core_v2    = $core_v2"
  echo "overall_v2 = $overall_v2"
  if [ "$core_v2" = "1" ] && [ "$overall_v2" = "1" ]; then
    echo "mainnet-core v2: OK (core_v2=1, overall_v2=1)"
  else
    echo "mainnet-core v2: BAD (core_v2=$core_v2, overall_v2=$overall_v2)" >&2
    exit 1
  fi
fi
