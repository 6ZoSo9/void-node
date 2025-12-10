#!/usr/bin/env bash
set -euo pipefail

RULES="/etc/prometheus/void-mainnet-pillars-rules.yml"

echo "=== [validator-plan-rules-embed] target: $RULES ==="

if ! sudo test -f "$RULES"; then
  echo "[error] rules file not found: $RULES"
  exit 1
fi

if sudo grep -q 'void_mainnet_validators_plan_health' "$RULES"; then
  echo "[info] validators plan rules already present; skipping append."
else
  echo "[info] appending validators plan rules to $RULES"
  sudo tee -a "$RULES" >/dev/null <<'YML'

  # Validators pillar: join PLAN health (aggregates per-validator plan_ok gauges)
  - record: void_mainnet_validators_plan_health
    expr: min(void_mainnet_validator_join_plan_ok)

  # 5m smoothed view of validators plan health
  - record: void:mainnet_validators:plan:last_5m
    expr: min_over_time(void_mainnet_validators_plan_health[5m])
YML
fi

echo
echo "[step] promtool check rules..."
sudo promtool check rules "$RULES"

echo
echo "[step] Prometheus safe reload..."
sudo /usr/local/bin/prom-safe-reload.sh

echo
echo "[done] validators plan rules installed and Prometheus reloaded."
