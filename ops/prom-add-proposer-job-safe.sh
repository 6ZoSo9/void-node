#!/usr/bin/env bash
set -euo pipefail

CFG="/etc/prometheus/prometheus.yml"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP="/root/prometheus-config-OK.${STAMP}.yml"
TMP="/tmp/prometheus.yml.$$"

echo "[proposer-safe] Config:  ${CFG}"
echo "[proposer-safe] Backup:  ${BACKUP}"

# 1) Backup current config
sudo cp "${CFG}" "${BACKUP}"

# 2) If job already present, bail out
if grep -q "job_name: 'void-proposer-v3b'" "${CFG}"; then
  echo "[proposer-safe] Job void-proposer-v3b already present, nothing to do."
  exit 0
fi

echo "[proposer-safe] Inserting void-proposer-v3b job before END AUTO PATCH marker..."

awk '
  BEGIN { added = 0 }
  {
    if (!added && $0 ~ /# --- END AUTO PATCH \(void-autoheal\) ---/) {
      # Insert new job block just before END marker
      print "  - job_name: '\''void-proposer-v3b'\''"
      print "    scrape_interval: 5s"
      print "    scrape_timeout: 4s"
      print "    metrics_path: /metrics/void/proposer.v3b.prom"
      print "    static_configs:"
      print "      - targets: ['127.0.0.1:4100']"
      print ""
      added = 1
    }
    print
  }
  END {
    if (!added) {
      # Fallback: append at end (still valid YAML even if marker missing)
      print ""
      print "  - job_name: '\''void-proposer-v3b'\''"
      print "    scrape_interval: 5s"
      print "    scrape_timeout: 4s"
      print "    metrics_path: /metrics/void/proposer.v3b.prom"
      print "    static_configs:"
      print "      - targets: ['127.0.0.1:4100']"
    }
  }
' "${CFG}" > "${TMP}"

sudo mv "${TMP}" "${CFG}"

echo "[proposer-safe] Checking Prometheus config..."
if ! sudo promtool check config "${CFG}"; then
  echo "[proposer-safe] ERROR: promtool check FAILED, restoring backup..."
  sudo cp "${BACKUP}" "${CFG}"
  exit 1
fi

echo "[proposer-safe] Reloading Prometheus..."
curl -fsS -X POST http://127.0.0.1:9090/-/reload >/dev/null || {
  echo "[proposer-safe] WARN: reload POST failed; check Prometheus manually."
}

echo "[proposer-safe] Done. To inspect proposer job targets:"
echo "  curl -fsS 'http://127.0.0.1:9090/api/v1/targets' | jq '.data.activeTargets[] | select(.labels.job==\"void-proposer-v3b\")'"
