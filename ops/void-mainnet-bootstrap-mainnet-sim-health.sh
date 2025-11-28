#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

CONFIG_PATH="config/void-mainnet-bootstrap-mainnet.live.json"
METRIC_FILE="${REPO_ROOT}/ops/textfile/void_mainnet_bootstrap_sim.prom"

mkdir -p "${REPO_ROOT}/ops/textfile"

echo "=== [mainnet-bootstrap-sim-health] VOID mainnet bootstrap SIM health ==="
echo "[info] REPO_ROOT   = ${REPO_ROOT}"
echo "[info] CONFIG_PATH = ${CONFIG_PATH}"
echo "[info] METRIC_FILE = ${METRIC_FILE}"

echo
echo "=== [1] SIM harness run (no broadcast) ==="
set +e
./ops/void-mainnet-bootstrap-mainnet-sim.sh "${CONFIG_PATH}"
rc_sim=$?
set -e

if [[ ${rc_sim} -eq 0 ]]; then
  sim_ok=1
  result_msg="[OK] SIM harness completed without revert (rc=0)."
else
  sim_ok=0
  result_msg="[WARN] SIM harness failed (rc=${rc_sim}); this is EXPECTED while the Solidity script is still a stub."
fi

echo
echo "=== [2] Metric write ==="
cat > "${METRIC_FILE}" <<EOF
# HELP void_mainnet_bootstrap_sim_ok 1 if mainnet bootstrap SIM run completed without revert
# TYPE void_mainnet_bootstrap_sim_ok gauge
void_mainnet_bootstrap_sim_ok ${sim_ok}
# HELP void_mainnet_bootstrap_sim_rc Last exit code from SIM harness
# TYPE void_mainnet_bootstrap_sim_rc gauge
void_mainnet_bootstrap_sim_rc ${rc_sim}
EOF

echo "[info] wrote SIM metric to ${METRIC_FILE}"

echo
echo "=== [summary] ==="
echo "${result_msg}"

exit "${rc_sim}"
