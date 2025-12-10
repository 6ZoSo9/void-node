#!/usr/bin/env bash
set -euo pipefail

RULES="/etc/prometheus/void-mainnet-pillars-rules.yml"

echo "=== [pillars-validators-rules-embed] target: $RULES ==="

if ! sudo test -f "$RULES"; then
  echo "[error] rules file not found: $RULES"
  exit 1
fi

if sudo grep -q 'void_mainnet_pillars_with_validators_health' "$RULES"; then
  echo "[info] pillars+validators rules already present; skipping append."
else
  echo "[info] appending pillars+validators rules to $RULES"
  sudo tee -a "$RULES" >/dev/null <<'YML'

  # Combined pillars + validators PLAN health
  - record: void_mainnet_pillars_with_validators_health
    expr: min(void_mainnet_pillars_health, void_mainnet_validators_plan_health)

  # 5m smoothed view of combined pillars + validators PLAN health
  - record: void:mainnet_pillars_with_validators:health:last_5m
    expr: min(void:mainnet_pillars:health:last_5m, void:mainnet_validators:plan:last_5m)
YML
fi

echo
echo "[step] promtool check rules..."
sudo promtool check rules "$RULES"

echo
echo "[step] Prometheus safe reload..."
sudo /usr/local/bin/prom-safe-reload.sh

echo
echo "[done] pillars+validators rules installed and Prometheus reloaded."
