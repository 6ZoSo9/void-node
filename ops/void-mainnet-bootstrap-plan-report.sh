#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/dev/void-node"

LIVE_CFG="${LIVE_CFG:-config/void-mainnet-bootstrap-mainnet.live.json}"

echo "=== [mainnet-plan-report] VOID mainnet bootstrap PLAN report ==="
echo "[cfg] LIVE_CFG = ${LIVE_CFG}"
echo

if [[ ! -f "${LIVE_CFG}" ]]; then
  echo "[FATAL] LIVE_CFG does not exist"
  exit 1
fi

echo "=== [0] chainId & validator0 ==="
jq -r '
  "chainId              : \(.chainId)\n"
  + "validator0.reward   : \(.validator0.reward)\n"
  + "validator0.stakeVOID: \(.validator0.stakeVOID)\n"
  + "validator0.consensusKey:\n  \(.validator0.consensusKey)"
' "${LIVE_CFG}"

echo
echo "=== [1] roles ==="
jq -r '
  .roles
  | to_entries[]
  | "\(.key) = \(.value)"
' "${LIVE_CFG}"

echo
echo "=== [2] contracts (0x0 => UNDEPLOYED) ==="
jq -r '
  .contracts
  | to_entries[]
  | .key as $k
  | .value as $v
  | if $v == "0x0000000000000000000000000000000000000000"
    then "\($k) = \($v)  [UNDEPLOYED]"
    else "\($k) = \($v)"
    end
' "${LIVE_CFG}"

echo
echo "=== [done] PLAN report generated from LIVE JSON only (no chain calls) ==="
