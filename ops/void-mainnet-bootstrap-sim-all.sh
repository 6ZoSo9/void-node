#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

echo "=== [mainnet-bootstrap-sim-all] VOID mainnet bootstrap SIM all ==="
echo "[info] REPO_ROOT = ${REPO_ROOT}"

echo
echo "=== [1] SIM health check ==="
set +e
./ops/void-mainnet-bootstrap-mainnet-sim-health.sh
rc_health=$?
set -e

echo
echo "[info] SIM health exit code = ${rc_health}"

echo
echo "=== [2] Export SIM metric to node_exporter textfile_collector ==="
sudo /usr/local/bin/void-mainnet-bootstrap-sim-textfile-export.sh

echo
echo "=== [summary] ==="
if [[ ${rc_health} -eq 0 ]]; then
  echo "[OK] SIM is GREEN (void_mainnet_bootstrap_sim_ok=1); metric exported."
else
  echo "[WARN] SIM is NOT ready yet (void_mainnet_bootstrap_sim_ok=0); metric exported anyway."
  echo "       This is expected while the Solidity bootstrap script is still a stub that reverts."
fi

exit "${rc_health}"
