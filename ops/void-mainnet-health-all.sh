#!/usr/bin/env bash
set -euo pipefail

PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

q() {
  local label="$1"
  local query="$2"

  echo
  echo ">>> $label"
  local value
  value=$(curl -fsS -G "${PROM_URL}/api/v1/query" \
    --data-urlencode "query=${query}" \
    | jq -r '.data.result[0].value[1] // "NaN"' 2>/dev/null) || value="NaN"

  echo "${label}=${value}"

  if [[ "${value}" == "NaN" ]]; then
    echo "[err] ${label} returned no data" >&2
    return 1
  fi

  if [[ "${value}" != "1" ]]; then
    echo "[warn] ${label} != 1" >&2
    return 2
  fi
}

rc=0

# Overall mainnet (v2)
q 'void:mainnet_overall:health:last_5m_v2' 'max(void:mainnet_overall:health:last_5m_v2)' || rc=1

# Mainnet pillars (core + lastmile + tokenomics folded together)
q 'void:mainnet_pillars:health:last_5m' 'max(void:mainnet_pillars:health:last_5m)' || rc=1

# Mainnet lastmile – 5m SLO + latest scalar
q 'void:mainnet_lastmile:health:last_5m' 'void:mainnet_lastmile:health:last_5m' || rc=1
q 'void:mainnet_lastmile_health:last' 'void:mainnet_lastmile_health:last' || rc=1

# Safeboot pillar (from node_exporter textfile)
q 'void_safeboot_overall_health' 'void_safeboot_overall_health' || rc=1

echo
if [[ "${rc}" -eq 0 ]]; then
  echo "[mainnet-health-all] RESULT: OK (overall + pillars + lastmile + safeboot all green)"
else
  echo "[mainnet-health-all] RESULT: BAD (see warnings above)"
fi

exit "${rc}"
