#!/usr/bin/env bash
set -euo pipefail

RULE_FILE="/etc/prometheus/rules.d/void-mainnet-mainnet-bootstrap.yml"

echo "=== [prom-rules] VOID mainnet MAINNET bootstrap rules ==="
echo "[cfg] RULE_FILE = ${RULE_FILE}"

sudo bash <<'EOF'
set -euo pipefail

RULE_FILE="/etc/prometheus/rules.d/void-mainnet-mainnet-bootstrap.yml"

mkdir -p /etc/prometheus/rules.d

cat > "${RULE_FILE}" <<'YML'
groups:
  - name: void-mainnet-mainnet-bootstrap
    rules:
      # 5m smoothed view of the MAINNET bootstrap health gauge
      - record: void:mainnet_mainnet_bootstrap:health:last_5m
        expr: max_over_time(void_mainnet_mainnet_bootstrap_health[5m])

      # Alert if it stays bad
      - alert: VoidMainnetMainnetBootstrapUnhealthy
        labels:
          system: void
          pillar: mainnet-bootstrap
          severity: warning
        annotations:
          summary: "VOID mainnet MAINNET bootstrap health is unhealthy"
          description: |
            void:mainnet_mainnet_bootstrap:health:last_5m has been < 1 for 10 minutes.
            Check:
              - ops/void-mainnet-mainnet-health-all.sh
              - ops/void-mainnet-mainnet-health-exporter.sh
              - the VoidMainnetBootstrapMainnet run() dry-run harness.
        expr: void:mainnet_mainnet_bootstrap:health:last_5m < 1
        for: 10m
YML

echo "=== [prom-rules] checking rules with promtool ==="
/usr/bin/promtool check rules "${RULE_FILE}"

echo "=== [prom-rules] reloading Prometheus safely ==="
/usr/local/bin/prom-safe-reload.sh

EOF

echo "=== [prom-rules] DONE ==="
