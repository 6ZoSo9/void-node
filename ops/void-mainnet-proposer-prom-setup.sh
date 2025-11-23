#!/usr/bin/env bash
set -euo pipefail

CFG="/etc/prometheus/prometheus.yml"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP="/root/prometheus-config-OK.${STAMP}.yml"
TMP="/tmp/prometheus.yml.$$"

echo "[proposer-prom] Config:  ${CFG}"
echo "[proposer-prom] Backup:  ${BACKUP}"

# 1) Backup current config
sudo cp "${CFG}" "${BACKUP}"

# 2) If job already present, skip modification
if grep -q 'job_name: "void-proposer-v3b"' "${CFG}"; then
  echo "[proposer-prom] Job void-proposer-v3b already present, skipping insert."
else
  echo "[proposer-prom] Inserting void-proposer-v3b scrape job before first rule_files: ..."

  awk '
    BEGIN { added = 0 }
    /^rule_files:/ && !added {
      print "  - job_name: \"void-proposer-v3b\""
      print "    scrape_interval: 5s"
      print "    scrape_timeout: 4s"
      print "    metrics_path: \"/metrics/void/proposer.v3b.prom\""
      print "    static_configs:"
      print "      - targets: [\"127.0.0.1:4100\"]"
      print "        labels:"
      print "          env: \"dev\""
      print ""
      added = 1
    }
    { print }
    END {
      if (!added) {
        # Fallback: append at end (still under scrape_configs in typical layout)
        print ""
        print "  - job_name: \"void-proposer-v3b\""
        print "    scrape_interval: 5s"
        print "    scrape_timeout: 4s"
        print "    metrics_path: \"/metrics/void/proposer.v3b.prom\""
        print "    static_configs:"
        print "      - targets: [\"127.0.0.1:4100\"]"
        print "        labels:"
        print "          env: \"dev\""
      }
    }
  ' "${CFG}" > "${TMP}"

  sudo mv "${TMP}" "${CFG}"
fi

echo "[proposer-prom] Checking Prometheus config..."
if ! sudo promtool check config "${CFG}"; then
  echo "[proposer-prom] ERROR: promtool check FAILED, restoring backup..."
  sudo cp "${BACKUP}" "${CFG}"
  exit 1
fi

echo "[proposer-prom] Reloading Prometheus..."
curl -fsS -X POST http://127.0.0.1:9090/-/reload >/dev/null || {
  echo "[proposer-prom] WARN: reload POST failed; check Prometheus manually."
}

echo "[proposer-prom] Done. To inspect proposer job targets:"
echo "  curl -fsS 'http://127.0.0.1:9090/api/v1/targets' | jq '.data.activeTargets[] | select(.labels.job==\"void-proposer-v3b\")'"
