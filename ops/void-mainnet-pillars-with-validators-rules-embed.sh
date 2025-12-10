#!/usr/bin/env bash
set -euo pipefail

RULES="/etc/prometheus/rules.d/void-mainnet-pillars-with-validators.yml"

echo "=== [pillars-with-validators-rules-embed] target: $RULES ==="

if sudo test -f "$RULES"; then
  if sudo grep -q 'void:mainnet_pillars_with_validators:health:last_5m' "$RULES"; then
    echo "[info] rules file already has pillars-with-validators 5m rule; skipping write."
  else
    echo "[error] rules file exists but missing expected rule; inspect manually: $RULES"
    exit 1
  fi
else
  echo "[info] creating new rules file: $RULES"
  sudo tee "$RULES" >/dev/null <<'YML'
groups:
- name: void-mainnet-pillars-with-validators
  rules:
  # 5m smoothed view of combined pillars+validators health.
  # We just smooth the already-combined gauge, so we don't depend on
  # upstream 5m aliases or group ordering.
  - record: void:mainnet_pillars_with_validators:health:last_5m
    expr: max_over_time(void_mainnet_pillars_with_validators_health[5m])
YML
fi

echo
echo "[step] promtool check rules..."
sudo promtool check rules "$RULES"

echo
echo "[step] Prometheus safe reload..."
sudo /usr/local/bin/prom-safe-reload.sh

echo
echo "[done] pillars-with-validators 5m rules installed and Prometheus reloaded."
