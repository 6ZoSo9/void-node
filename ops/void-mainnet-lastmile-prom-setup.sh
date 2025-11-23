#!/usr/bin/env bash
set -euo pipefail

RULES_FILE="/etc/prometheus/void-mainnet-lastmile-rules.yml"
ALERTS_FILE="/etc/prometheus/alerts/void-mainnet-lastmile-alerts.yml"

echo "[lastmile-prom] Writing rules to ${RULES_FILE} ..."
sudo tee "${RULES_FILE}" >/dev/null <<'EOF'
groups:
- name: void-mainnet-lastmile-rules
  rules:
  - record: void:mainnet_lastmile_nonempty_ratio:last_10m
    expr: last_over_time(void_mainnet_lastmile_nonempty_ratio{chain="mainnet-core"}[10m])

  - record: void:mainnet_lastmile_window_size:last
    expr: last_over_time(void_mainnet_lastmile_window_size{chain="mainnet-core"}[10m])

  - record: void:mainnet_lastmile_expect_nonempty:last
    expr: last_over_time(void_mainnet_lastmile_expect_nonempty{chain="mainnet-core"}[10m])
EOF

echo "[lastmile-prom] Writing alerts to ${ALERTS_FILE} ..."
sudo tee "${ALERTS_FILE}" >/dev/null <<'EOF'
groups:
- name: void-mainnet-lastmile-alerts
  rules:
  - alert: VoidMainnetLastmileEmptyBlocks
    expr: |
      (void:mainnet_lastmile_window_size:last >= 64)
      and
      (void:mainnet_lastmile_nonempty_ratio:last_10m == 0)
      and
      (void:mainnet_lastmile_expect_nonempty:last == 1)
      and
      (void:mainnet_core:health:last_5m == 1)
    for: 10m
    labels:
      system: void
      pillar: mainnet-core
      severity: warning
    annotations:
      summary: "VOID mainnet last-mile: only empty blocks"
      description: >
        Mainnet core is healthy and last-mile expects non-empty blocks,
        but the last-mile window has ratio 0. Check tx injection, proposer,
        and tx ingestion path.
EOF

echo "[lastmile-prom] Checking Prometheus config..."
sudo promtool check config /etc/prometheus/prometheus.yml

echo "[lastmile-prom] Reloading Prometheus..."
curl -fsS -X POST http://127.0.0.1:9090/-/reload >/dev/null

echo "[lastmile-prom] Done. You can inspect rules via:"
echo "  curl -fsS 'http://127.0.0.1:9090/api/v1/rules' | jq '.data.groups[] | select(.name==\"void-mainnet-lastmile-rules\")'"
echo "  curl -fsS 'http://127.0.0.1:9090/api/v1/rules' | jq '.data.groups[] | select(.name==\"void-mainnet-lastmile-alerts\")'"
