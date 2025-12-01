#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/dev/void-node"

ROOT="$PWD"
SCRIPT_FQ="script/VoidMainnetBootstrapDev.s.sol:VoidMainnetBootstrapDev"
CONFIG_PATH="config/void-mainnet-bootstrap-mainnet.live.json"
RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"

echo "=== [mainnet-bootstrap-dev-wiring] VOID mainnet DEV bootstrap wiring rehearsal ==="
echo "[cfg] ROOT        = ${ROOT}"
echo "[cfg] SCRIPT_FQ   = ${SCRIPT_FQ}"
echo "[cfg] CONFIG_PATH = ${CONFIG_PATH}"
echo "[cfg] RPC_URL     = ${RPC_URL}"

echo
echo "=== [1] quick JSON sanity (role + validator0 fields) ==="
jq '.chainId' "${CONFIG_PATH}"

jq '.roles' "${CONFIG_PATH}" | jq '{
  deployer,
  treasuryAdmin,
  opsTreasuryAdmin,
  validatorAdmin,
  adminGateOwner,
  updateGateOwner,
  configGateOwner,
  treasuryOwner,
  opsTreasuryOwner,
  rewardEngineOwner,
  validatorSetOwner,
  opsTreasury,
  updateGateAdmin,
  configGateAdmin,
  rewardAdmin
}'

jq '.validator0' "${CONFIG_PATH}" | jq '{
  reward,
  stakeVOID,
  consensusKey
}'

echo
echo "=== [2] forge script DEV run (sim-only, NO broadcast) ==="
echo ">>> forge script ${SCRIPT_FQ} --rpc-url ${RPC_URL} --sig 'run()'"
echo

set -x
forge script "${SCRIPT_FQ}" \
  --rpc-url "${RPC_URL}" \
  --sig "run()"
set +x

echo
echo "=== [mainnet-bootstrap-dev-wiring] DONE (DEV rehearsal only – no tx broadcast) ==="
