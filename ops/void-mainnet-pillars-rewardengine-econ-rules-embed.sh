#!/usr/bin/env bash
set -euo pipefail

RULES_FILE="/etc/prometheus/void-mainnet-pillars-rules.yml"
PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"
GROUP_NAME="void-mainnet-pillars-rewardengine-econ"

echo "=== [pillars-rewardengine-econ-recording-embed] target: ${RULES_FILE} ==="

if ! sudo test -f "${RULES_FILE}"; then
  echo "[info] rules file does not exist; will create new."
  sudo tee "${RULES_FILE}" >/dev/null <<'YML'
groups:
- name: void-mainnet-pillars-rewardengine-econ
  rules:
  - record: void_mainnet_pillars_with_validators_rewardengine_econ_health
    expr: scalar(void_mainnet_pillars_with_validators_health) * scalar(void:mainnet_rewardengine_econ:health:last_5m)
  - record: void:mainnet_pillars_with_validators_rewardengine_econ:health:last_5m
    expr: max_over_time(void_mainnet_pillars_with_validators_rewardengine_econ_health[5m])
YML
else
  if sudo grep -q "name: ${GROUP_NAME}" "${RULES_FILE}"; then
    echo "[info] group ${GROUP_NAME} already present in ${RULES_FILE}; nothing to do."
  else
    echo "[info] appending recording group to ${RULES_FILE}"
    sudo tee -a "${RULES_FILE}" >/dev/null <<'YML'
- name: void-mainnet-pillars-rewardengine-econ
  rules:
  - record: void_mainnet_pillars_with_validators_rewardengine_econ_health
    expr: scalar(void_mainnet_pillars_with_validators_health) * scalar(void:mainnet_rewardengine_econ:health:last_5m)
  - record: void:mainnet_pillars_with_validators_rewardengine_econ:health:last_5m
    expr: max_over_time(void_mainnet_pillars_with_validators_rewardengine_econ_health[5m])
YML
  fi
fi

echo
echo "=== [1] promtool check rules] ==="
sudo promtool check rules "${RULES_FILE}"

echo
echo "=== [2] reload prometheus] ==="
if curl -fsS -X POST "${PROM_URL}/-/reload" >/dev/null; then
  echo "[reload OK]"
else
  echo "[reload FAILED]"
fi

echo
echo "=== [3] sanity query] ==="
curl -fsS "${PROM_URL}/api/v1/query" \
  --data-urlencode 'query=void:mainnet_pillars_with_validators_rewardengine_econ:health:last_5m' \
  | jq '.data.result'
