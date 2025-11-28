#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

echo "=== [mainnet-bootstrap-plan-all] VOID mainnet bootstrap PLAN all ==="
echo "[info] REPO_ROOT = ${REPO_ROOT}"

echo
echo "=== [1] PLAN health check ==="
set +e
./ops/void-mainnet-bootstrap-mainnet-plan-health.sh
rc_health=$?
set -e

echo
echo "[info] PLAN health exit code = ${rc_health}"

echo
echo "=== [2] Export PLAN metric to node_exporter textfile_collector ==="
sudo /usr/local/bin/void-mainnet-bootstrap-plan-textfile-export.sh

echo
echo "=== [summary] ==="
if [[ ${rc_health} -eq 0 ]]; then
  echo "[OK] PLAN is GREEN (void_mainnet_bootstrap_plan_ready=1); metric exported."
else
  echo "[WARN] PLAN is NOT ready yet (void_mainnet_bootstrap_plan_ready=0); metric exported anyway."
  echo "       This is expected until real mainnet keys + addresses are populated in the live config."
fi

exit "${rc_health}"
