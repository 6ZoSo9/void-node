#!/usr/bin/env bash
set -euo pipefail

echo "=== [systemd user units matching void-node@safe*] ==="
systemctl --user list-units 'void-node@safe*' || echo "no safe units?"

echo
echo "=== [status: void-node@safe-4100.service] ==="
systemctl --user status void-node@safe-4100.service --no-pager || echo "status failed"

echo
echo "=== [journal: last 40 lines for safe-4100] ==="
journalctl --user -u void-node@safe-4100.service -n 40 --no-pager || echo "journalctl failed"

echo
echo "=== [safeboot metrics raw from Prometheus] ==="
curl -fsS 'http://127.0.0.1:9090/api/v1/query?query=void:safeboot:overall' \
  | jq '.data.result'

echo
echo "=== [targets with job label containing safeboot] ==="
curl -fsS 'http://127.0.0.1:9090/api/v1/targets' \
  | jq '.data.activeTargets[]
        | select(.labels.job|tostring|test("safeboot"))
        | {job: .labels.job, instance: .labels.instance, health: .health, scrapeUrl: .scrapeUrl}'

echo
echo "=== [safeboot textfile metrics, if any] ==="
TEXTDIR="/var/lib/node_exporter/textfile_collector"
ls -l "${TEXTDIR}"/void_safeboot* 2>/dev/null || echo "no void_safeboot*.prom in ${TEXTDIR}"
