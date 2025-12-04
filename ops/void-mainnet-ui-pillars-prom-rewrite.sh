#!/usr/bin/env bash
set -euo pipefail

PROM_DIR="/etc/prometheus"
BACKUP="/root/prometheus-config-OK.$(date +%Y%m%d-%H%M%S).tgz"

echo "=== [ui-pillars-prom-rewrite] backing up Prom config to $BACKUP ==="
sudo tar -czf "$BACKUP" -C "$PROM_DIR" .

echo
echo "=== [ui-pillars-prom-rewrite] writing ui-pillars rules ==="
sudo tee /etc/prometheus/void-mainnet-ui-pillars-rules.yml >/dev/null <<'EOF'
groups:
- name: void-mainnet-ui-pillars-rules
  rules:
  - record: "void:mainnet_ui_pillars:health:last_5m"
    expr: "max_over_time(void_mainnet_ui_pillars_health[5m])"
  - record: "void:mainnet_pillars_with_ui:health:last_5m"
    expr: "void:mainnet_pillars:health:last_5m * void:mainnet_ui_pillars:health:last_5m"
EOF

echo
echo "=== [ui-pillars-prom-rewrite] writing ui-pillars alerts ==="
sudo tee /etc/prometheus/void-mainnet-ui-pillars-alerts.yml >/dev/null <<'EOF'
groups:
- name: void-mainnet-ui-pillars-alerts
  rules:
  - alert: VoidMainnetUiPillarsUnhealthy
    expr: void:mainnet_ui_pillars:health:last_5m < 1
    for: 10m
    labels:
      severity: warning
      system: void
      pillar: mainnet-ui
    annotations:
      summary: "VOID mainnet UI pillars unhealthy"
      description: "Work Credits + Main Dashboard layer is not fully healthy for at least 10 minutes."
EOF

echo
echo "=== [ui-pillars-prom-rewrite] promtool check rules ==="
sudo promtool check rules /etc/prometheus/void-mainnet-ui-pillars-rules.yml
sudo promtool check rules /etc/prometheus/void-mainnet-ui-pillars-alerts.yml

echo
echo "=== [ui-pillars-prom-rewrite] reloading prometheus ==="
if command -v /usr/local/bin/prom-safe-reload.sh >/dev/null 2>&1; then
  sudo /usr/local/bin/prom-safe-reload.sh
else
  sudo systemctl reload prometheus
fi

echo
echo "=== [ui-pillars-prom-rewrite] done ==="
