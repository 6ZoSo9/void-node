#!/usr/bin/env bash
set -euo pipefail

RULES_FILE="${RULES_FILE:-/etc/prometheus/void-mainnet-rewardengine-rules.yml}"
PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

echo "=== [0] target rules file] ==="
echo "[info] RULES_FILE=${RULES_FILE}"

if [ -f "$RULES_FILE" ]; then
  TS="$(date +%Y%m%d-%H%M%S)"
  cp "$RULES_FILE" "${RULES_FILE}.bak.${TS}"
  echo "[info] backup copy: ${RULES_FILE}.bak.${TS}"
else
  echo "[info] rules file does not exist; will create new."
fi

cat > "$RULES_FILE" <<'EOF'
groups:
- name: void-mainnet-rewardengine-econ-rules
  rules:
  # 5m view of RewardEngine econ params health
  - record: void:mainnet_rewardengine_econ:health:last_5m
    expr: max_over_time(void_mainnet_rewardengine_econ_health[5m])
EOF

echo
echo "=== [1] promtool check rules] ==="
promtool check rules "$RULES_FILE"

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
  --data-urlencode 'query=void:mainnet_rewardengine_econ:health:last_5m' \
  | jq '.data.result'
