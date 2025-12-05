#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-$HOME/dev/void-node}"
cd "$REPO_ROOT"

RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"

echo "=== [wc-devnet-deploy] repo ==="
pwd
echo
echo "=== [wc-devnet-deploy] RPC_URL ==="
echo "RPC_URL=${RPC_URL}"

echo
echo "=== [wc-devnet-deploy] locating devnet deployer key ==="
KEY_FILE_DEFAULT="${REPO_ROOT}/.secrets/devnet-deployer.key"
KEY_FILE_FALLBACK="${REPO_ROOT}/.secrets/devnet-caller.key"

KEY_FILE="${DEVNET_DEPLOYER_KEY_PATH:-$KEY_FILE_DEFAULT}"

if [ ! -f "$KEY_FILE" ] && [ -f "$KEY_FILE_FALLBACK" ]; then
  echo "[info] ${KEY_FILE} not found, falling back to ${KEY_FILE_FALLBACK}"
  KEY_FILE="$KEY_FILE_FALLBACK"
fi

if [ ! -f "$KEY_FILE" ]; then
  echo "[FATAL] devnet deployer key file not found."
  echo "  Tried:"
  echo "    ${KEY_FILE_DEFAULT}"
  echo "    ${KEY_FILE_FALLBACK}"
  echo "  You can override with DEVNET_DEPLOYER_KEY_PATH=/path/to/key"
  exit 1
fi

DEVNET_DEPLOYER_KEY="$(tr -d ' \n\r' < "$KEY_FILE")"
if [ -z "$DEVNET_DEPLOYER_KEY" ]; then
  echo "[FATAL] DEVNET_DEPLOYER_KEY is empty (file: ${KEY_FILE})"
  exit 1
fi

echo "[ok] using deployer key from: ${KEY_FILE}"

echo
echo "=== [wc-devnet-deploy] running forge script (broadcast) ==="
DEVNET_DEPLOYER_KEY="${DEVNET_DEPLOYER_KEY}" \
forge script script/WorkCreditsDevnetDeploy.s.sol:WorkCreditsDevnetDeploy \
  --rpc-url "${RPC_URL}" \
  --broadcast \
  -vvv

echo
echo "=== [wc-devnet-deploy] reading broadcast JSON ==="
BROADCAST_DIR="broadcast/WorkCreditsDevnetDeploy.s.sol/2050"
LATEST_JSON="${BROADCAST_DIR}/run-latest.json"

if [ ! -f "${LATEST_JSON}" ]; then
  echo "[FATAL] broadcast JSON not found at ${LATEST_JSON}"
  exit 1
fi

echo "[info] using broadcast file: ${LATEST_JSON}"

WC_TOKEN_ADDR="$(
  jq -r '.transactions[] | select(.contractName=="WorkCreditsToken") | .contractAddress' "${LATEST_JSON}"
)"
WC_POOL_ADDR="$(
  jq -r '.transactions[] | select(.contractName=="WorkCreditsPoolV1") | .contractAddress' "${LATEST_JSON}"
)"
WC_RELAYER_ADDR="$(
  jq -r '.transactions[] | select(.contractName=="WorkCreditsRelayerV1") | .contractAddress' "${LATEST_JSON}"
)"

if [ -z "${WC_TOKEN_ADDR}" ] || [ "${WC_TOKEN_ADDR}" = "null" ]; then
  echo "[FATAL] WorkCreditsToken address not found in broadcast JSON"
  exit 1
fi
if [ -z "${WC_POOL_ADDR}" ] || [ "${WC_POOL_ADDR}" = "null" ]; then
  echo "[FATAL] WorkCreditsPoolV1 address not found in broadcast JSON"
  exit 1
fi
if [ -z "${WC_RELAYER_ADDR}" ] || [ "${WC_RELAYER_ADDR}" = "null" ]; then
  echo "[FATAL] WorkCreditsRelayerV1 address not found in broadcast JSON"
  exit 1
fi

echo
echo "=== [wc-devnet-deploy] deployed addresses ==="
echo "WorkCreditsToken      = ${WC_TOKEN_ADDR}"
echo "WorkCreditsPoolV1     = ${WC_POOL_ADDR}"
echo "WorkCreditsRelayerV1  = ${WC_RELAYER_ADDR}"

STATE_FILE="docs/VOID-DEVNET-PROTOCOL-STATE.json"

if [ ! -f "${STATE_FILE}" ]; then
  echo
  echo "[warn] ${STATE_FILE} not found; printing JSON snippet to add manually:"
  cat <<EOF

{
  "workCreditsToken":    "${WC_TOKEN_ADDR}",
  "workCreditsPoolV1":   "${WC_POOL_ADDR}",
  "workCreditsRelayerV1":"${WC_RELAYER_ADDR}"
}

EOF
  echo "[warn] you can merge the above into ${STATE_FILE} when ready."
  exit 0
fi

echo
echo "=== [wc-devnet-deploy] updating ${STATE_FILE} ==="
TMP="$(mktemp)"

jq \
  --arg wcToken "${WC_TOKEN_ADDR}" \
  --arg wcPool "${WC_POOL_ADDR}" \
  --arg wcRelayer "${WC_RELAYER_ADDR}" \
  '.workCreditsToken = $wcToken
   | .workCreditsPoolV1 = $wcPool
   | .workCreditsRelayerV1 = $wcRelayer' \
  "${STATE_FILE}" > "${TMP}"

mv "${TMP}" "${STATE_FILE}"

echo "[ok] updated ${STATE_FILE} with WorkCredits addresses"

echo
echo "=== [wc-devnet-deploy] done ==="
