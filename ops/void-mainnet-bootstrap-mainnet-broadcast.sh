#!/usr/bin/env bash
set -euo pipefail

ROOT="${ROOT:-$HOME/dev/void-node}"
cd "$ROOT"

SCRIPT_FQ="script/VoidMainnetBootstrapMainnet.s.sol:VoidMainnetBootstrapMainnet"
CONFIG_PATH="${CONFIG_PATH:-config/void-mainnet-bootstrap-mainnet.live.json}"
RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"

echo "=== [mainnet-broadcast] VOID mainnet bootstrap BROADCAST harness ==="
echo "[broadcast] ROOT        = ${ROOT}"
echo "[broadcast] SCRIPT_FQ   = ${SCRIPT_FQ}"
echo "[broadcast] CONFIG_PATH = ${CONFIG_PATH}"
echo "[broadcast] RPC_URL     = ${RPC_URL}"
echo

# Hard safety gate: this harness is DISABLED by default.
if [[ "${VOID_MAINNET_BROADCAST_ENABLE:-0}" != "1" ]]; then
  echo "[broadcast][FATAL] VOID_MAINNET_BROADCAST_ENABLE is not set to 1."
  echo "[broadcast][FATAL] This harness is intentionally DISABLED."
  echo "[broadcast][FATAL] Do NOT export VOID_MAINNET_BROADCAST_ENABLE=1 until ALL of these are true:"
  echo "  - Keys pillar is green (void_mainnet_keys_roles_ok == 1)."
  echo "  - Plan pillar is green (void_mainnet_bootstrap_plan_health == 1)."
  echo "  - Mainnet pillars+keys composite is green (void:mainnet_pillars:health_with_keys:last_5m == 1)."
  echo "  - We have manually signed off on the human RUNBOOK for bootstrap."
  echo "  - We have run at least one successful forge dry-run of run(configPath) on the LIVE JSON."
  exit 1
fi

echo "=== [broadcast] sanity: LIVE config quick dump (chainId + roles + validator0) ==="
if ! command -v jq >/dev/null 2>&1; then
  echo "[broadcast][FATAL] jq is required but not installed."
  exit 1
fi

jq '.chainId, .roles, .validator0' "${CONFIG_PATH}" || {
  echo "[broadcast][FATAL] jq failed to read CONFIG_PATH=${CONFIG_PATH}"
  exit 1
}

echo
echo "=== [broadcast] health gates: keys + plan + pillars+keys ==="
echo "[gate] void-mainnet-keys-health.sh..."
./ops/void-mainnet-keys-health.sh

echo
echo "[gate] void-mainnet-bootstrap-plan-health-all.sh..."
./ops/void-mainnet-bootstrap-plan-health-all.sh

echo
echo "[gate] void-mainnet-pillars-keys-health.sh..."
./ops/void-mainnet-pillars-keys-health.sh

echo
echo "[gate] global pillars-preflight (safeboot + devnet + mainnet-core + lastmile + pillars)..."
./ops/void-pillars-preflight.sh

echo
echo "=== [broadcast] forge DRY-RUN (NO --broadcast) ==="
echo "[info] Running VoidMainnetBootstrapMainnet.run(configPath) in simulation mode"
forge script "${SCRIPT_FQ}" \
  --rpc-url "${RPC_URL}" \
  --sig 'run(string)' "${CONFIG_PATH}"

echo
echo "=== [broadcast] STOP: broadcast path still intentionally disabled ==="
echo "[broadcast][FATAL] The actual --broadcast stanza is commented out by design."
echo "[broadcast][FATAL] When we are truly ready for real mainnet:"
echo "  1) Re-run this harness and review ALL logs above."
echo "  2) Only then, in a separate carefully-reviewed commit, we will:"
echo "     - Uncomment the broadcast block below."
echo "     - Run with VOID_MAINNET_BROADCAST_ENABLE=1 in a clean shell."
echo
echo "[broadcast][FATAL] Exiting WITHOUT broadcasting."
exit 1

# === FUTURE-ONLY: REAL BROADCAST BLOCK (KEEP COMMENTED OUT FOR NOW) ===
# echo
# echo "=== [broadcast] REAL BROADCAST (DANGER ZONE) ==="
# forge script "${SCRIPT_FQ}" \
#   --rpc-url "${RPC_URL}" \
#   --sig 'run(string)' "${CONFIG_PATH}" \
#   --broadcast \
#   --slow
#
# echo
# echo "=== [broadcast] DONE: VOID mainnet bootstrap transactions sent ==="
