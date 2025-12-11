#!/usr/bin/env bash
set -euo pipefail

RULES_FILE="/etc/prometheus/void-mainnet-pillars-rules.yml"

echo "=== [pillars-workcredits-plan-recording-embed] target: ${RULES_FILE} ==="

if sudo grep -q 'void:mainnet_workcredits_plan:health:last_5m' "$RULES_FILE"; then
  echo "[info] recording rule already present; skipping append."
else
  echo "[info] appending recording group to ${RULES_FILE}"
  sudo tee -a "$RULES_FILE" >/dev/null <<'EOF'
  - name: void-mainnet-workcredits-plan-rules
    rules:
    - record: void:mainnet_workcredits_plan:health:last_5m
      expr: max_over_time(void_mainnet_workcredits_plan_health[5m])
    - record: void:mainnet_pillars_with_validators_rewardengine_econ_workcredits_plan:health:last_5m
      expr: scalar(void:mainnet_pillars_with_validators_rewardengine_econ:health:last_5m) * scalar(void:mainnet_workcredits_plan:health:last_5m)
EOF
fi

echo
echo "=== [1] promtool check rules] ==="
sudo promtool check rules "$RULES_FILE"

echo
echo "=== [2] reload prometheus] ==="
sudo systemctl reload prometheus
echo "[reload OK]"

echo
echo "=== [3] sanity query] ==="
curl -fsS "http://127.0.0.1:9090/api/v1/query" \
  --data-urlencode 'query=void:mainnet_workcredits_plan:health:last_5m' \
  | jq '.data.result'

curl -fsS "http://127.0.0.1:9090/api/v1/query" \
  --data-urlencode 'query=void:mainnet_pillars_with_validators_rewardengine_econ_workcredits_plan:health:last_5m' \
  | jq '.data.result'
