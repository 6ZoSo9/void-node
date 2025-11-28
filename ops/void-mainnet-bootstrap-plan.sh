#!/usr/bin/env bash
set -euo pipefail

# PLAN-only mainnet bootstrap checker
#
# - Reads a *.live.json config
# - Runs VoidMainnetBootstrapMainnet.s.sol in simulation mode (NO broadcast)
# - Writes a Prometheus-style .prom file with plan status
#
# Env vars (optional):
#   CONFIG_PATH : path to .live.json (default: config/void-mainnet-bootstrap-mainnet.live.json)
#   RPC_URL     : RPC used for simulation (default: http://127.0.0.1:8545)
#   OUT_DIR     : where to write .prom file (default: ops/out)

cd "$HOME/dev/void-node"

CONFIG_PATH="${CONFIG_PATH:-config/void-mainnet-bootstrap-mainnet.live.json}"
RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
OUT_DIR="${OUT_DIR:-ops/out}"
PROM_FILE="${OUT_DIR}/void-mainnet-bootstrap-plan.prom"

echo "=== [plan] VOID mainnet bootstrap PLAN-only check ==="
echo "[plan]  CONFIG_PATH = ${CONFIG_PATH}"
echo "[plan]  RPC_URL     = ${RPC_URL}"
echo "[plan]  OUT_DIR     = ${OUT_DIR}"
echo "[plan]  PROM_FILE   = ${PROM_FILE}"
echo

# --- [0] basic sanity checks -------------------------------------------------

if ! command -v jq >/dev/null 2>&1; then
  echo "[plan] ERROR: jq not found; install jq first." >&2
  exit 1
fi

if ! command -v forge >/dev/null 2>&1; then
  echo "[plan] ERROR: forge not found; install Foundry (forge)." >&2
  exit 1
fi

if [ ! -f "${CONFIG_PATH}" ]; then
  echo "[plan] ERROR: config file not found: ${CONFIG_PATH}" >&2
  exit 1
fi

mkdir -p "${OUT_DIR}"

CONFIG_SHA=$(sha256sum "${CONFIG_PATH}" | awk '{print $1}')
NOW_UNIX=$(date +%s)

echo "[plan] config sha256 = ${CONFIG_SHA}"
echo

# --- [1] human-readable summary of config -----------------------------------

echo "=== [plan] config summary (best-effort jq) ==="
# We keep this tolerant; missing fields are allowed.

CHAIN_ID=$(jq -r '(.chainId // 0)' "${CONFIG_PATH}" 2>/dev/null || echo "0")
NETWORK_NAME=$(jq -r '(.network // "unknown")' "${CONFIG_PATH}" 2>/dev/null || echo "unknown")
TREASURY_ADDR=$(jq -r '(.treasury.address // "null")' "${CONFIG_PATH}" 2>/dev/null || echo "null")
OPS_ADDR=$(jq -r '(.opsTreasury.address // "null")' "${CONFIG_PATH}" 2>/dev/null || echo "null")
PREMINE_TOTAL=$(jq -r '(.premine.total // "null")' "${CONFIG_PATH}" 2>/dev/null || echo "null")
VALIDATOR_COUNT=$(jq -r '((.validators | length) // 0)' "${CONFIG_PATH}" 2>/dev/null || echo "0")

echo "[plan] network      = ${NETWORK_NAME}"
echo "[plan] chainId      = ${CHAIN_ID}"
echo "[plan] treasury     = ${TREASURY_ADDR}"
echo "[plan] opsTreasury  = ${OPS_ADDR}"
echo "[plan] premine.total= ${PREMINE_TOTAL}"
echo "[plan] validators   = ${VALIDATOR_COUNT}"
echo

echo "=== [plan] validators (if present) ==="
# Non-fatal if this structure doesn't match; it's just for your eyeballs.
jq -r '
  (.validators // []) as $v
  | if ($v | length) == 0 then
      "[plan] (no validators array in config.validators)"
    else
      $v
      | to_entries[]
      | "[plan] validator[\(.key)]: addr=\(.value.address // "null") stake=\(.value.stake // "null")"
    end
' "${CONFIG_PATH}" 2>/dev/null || echo "[plan] (validators listing failed; non-fatal)"

echo
echo "=== [plan] running forge script (SIMULATION ONLY, no broadcast) ==="

PLAN_OK=0

# We rely on the existing VoidMainnetBootstrapMainnet.s.sol script.
# By default, 'forge script' without --broadcast only simulates.
set +e
forge script \
  script/VoidMainnetBootstrapMainnet.s.sol:VoidMainnetBootstrapMainnet \
  --rpc-url "${RPC_URL}" \
  --sig "run(string)" "${CONFIG_PATH}" \
  -vvvv

STATUS=$?
set -e

if [ "${STATUS}" -eq 0 ]; then
  echo
  echo "[plan] forge script simulation succeeded."
  PLAN_OK=1
else
  echo
  echo "[plan] forge script simulation FAILED (exit code ${STATUS})."
  PLAN_OK=0
fi

# --- [2] write Prometheus-style .prom file -----------------------------------

echo
echo "=== [plan] writing Prometheus file: ${PROM_FILE} ==="

cat > "${PROM_FILE}.tmp" <<EOF
# HELP void_mainnet_bootstrap_plan_ok VOID mainnet bootstrap PLAN check (0=bad, 1=ok)
# TYPE void_mainnet_bootstrap_plan_ok gauge
void_mainnet_bootstrap_plan_ok{config_sha="${CONFIG_SHA}",network="${NETWORK_NAME}"} ${PLAN_OK}

# HELP void_mainnet_bootstrap_plan_last_run_unix Last time the PLAN check ran (unix seconds)
# TYPE void_mainnet_bootstrap_plan_last_run_unix gauge
void_mainnet_bootstrap_plan_last_run_unix ${NOW_UNIX}

# HELP void_mainnet_bootstrap_plan_validators Number of validators in the plan config
# TYPE void_mainnet_bootstrap_plan_validators gauge
void_mainnet_bootstrap_plan_validators ${VALIDATOR_COUNT}

# HELP void_mainnet_bootstrap_plan_chainid Planned chainId for VOID mainnet (0 if missing)
# TYPE void_mainnet_bootstrap_plan_chainid gauge
void_mainnet_bootstrap_plan_chainid ${CHAIN_ID}
EOF

mv "${PROM_FILE}.tmp" "${PROM_FILE}"

echo "[plan] wrote ${PROM_FILE}"
echo
echo "=== [plan] summary ==="
echo "[plan] PLAN_OK      = ${PLAN_OK}"
echo "[plan] CONFIG_SHA   = ${CONFIG_SHA}"
echo "[plan] CHAIN_ID     = ${CHAIN_ID}"
echo "[plan] VALIDATORS   = ${VALIDATOR_COUNT}"
echo "[plan] PROM_FILE    = ${PROM_FILE}"
echo
echo "[plan] done."
