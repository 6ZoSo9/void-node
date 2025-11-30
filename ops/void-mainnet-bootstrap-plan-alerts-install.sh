#!/usr/bin/env bash
set -euo pipefail

echo "=== [plan-alerts] install VOID mainnet bootstrap PLAN alerts ==="

ALERT_FILE="/etc/prometheus/alerts/void-mainnet-bootstrap-plan.yml"

# 1) Write alert file
echo "[plan-alerts] writing ${ALERT_FILE}..."
sudo tee "${ALERT_FILE}" >/dev/null <<'ALERT_EOF'
groups:
  - name: void-mainnet-bootstrap-plan
    rules:
      - alert: VoidMainnetBootstrapPlanStuck
        expr: (void_mainnet_bootstrap_plan_configured == 1)
          and (void:mainnet_bootstrap_plan:health:last_5m == 0)
        for: 24h
        labels:
          system: void
          pillar: mainnet-plan
          severity: warning
        annotations:
          summary: "VOID mainnet bootstrap PLAN is configured but not healthy"
          description: |
            void_mainnet_bootstrap_plan_configured == 1 but
            void:mainnet_bootstrap_plan:health:last_5m == 0 for 24h.

            This usually means the live PLAN roles/keys are not wired yet
            (e.g. reason=\"bad_roles\").

            Check:
              - config/void-mainnet-bootstrap-mainnet.live.json
              - docs/void-mainnet-bootstrap-roles-and-keys.md
              - ./ops/void-mainnet-bootstrap-plan-sim.sh
              - ./ops/void-mainnet-bootstrap-plan-health-all.sh
ALERT_EOF

# 2) promtool config check (best-effort)
if command -v promtool >/dev/null 2>&1; then
  echo "[plan-alerts] running promtool check config..."
  sudo promtool check config /etc/prometheus/prometheus.yml
else
  echo "[plan-alerts] promtool not found; skipping config check"
fi

# 3) reload Prometheus via guard, then direct fallback
if command -v prom-safe-reload.sh >/dev/null 2>&1; then
  echo "[plan-alerts] reloading Prometheus via prom-safe-reload.sh..."
  sudo prom-safe-reload.sh
else
  echo "[plan-alerts] prom-safe-reload.sh not found; best-effort HTTP reload..."
  curl -fsS -X POST http://127.0.0.1:9090/-/reload \
    && echo "[plan-alerts] HTTP reload OK" \
    || echo "[plan-alerts] HTTP reload FAILED (check Prometheus manually)"
fi

echo "=== [plan-alerts] done ==="
