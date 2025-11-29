#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-$HOME/dev/void-node}"
cd "$REPO_ROOT"

CONFIG_PATH="${CONFIG_PATH:-config/void-mainnet-bootstrap-mainnet.live.json}"
RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
SCRIPT="script/VoidMainnetBootstrapMainnet.s.sol:VoidMainnetBootstrapMainnet"

echo "=== [mainnet-bootstrap-plan-sim] VOID mainnet PLAN simulation ==="
echo "[info] REPO_ROOT   = $PWD"
echo "[info] RPC_URL     = $RPC_URL"
echo "[info] CONFIG_PATH = $CONFIG_PATH"
echo

if [ ! -f "$CONFIG_PATH" ]; then
  echo "[FATAL] config file not found: $CONFIG_PATH" >&2
  exit 1
fi

echo "=== [0] chainId sanity vs live.json ==="
CHAIN_JSON="$(jq -r '.chainId // 0' "$CONFIG_PATH")"
echo "  chainId (config) : $CHAIN_JSON"

if command -v cast >/dev/null 2>&1; then
  set +e
  # IMPORTANT: use --rpc-url instead of positional URL
  RUNTIME_CHAINID_RAW="$(cast chain-id --rpc-url "$RPC_URL" 2>/dev/null)"
  RUNTIME_RC=$?
  set -e
  if [ $RUNTIME_RC -eq 0 ]; then
    echo "  chainId (RPC)    : $RUNTIME_CHAINID_RAW"
    if [ "$RUNTIME_CHAINID_RAW" = "$CHAIN_JSON" ]; then
      echo "  -> chainId sanity: OK"
    else
      echo "  -> chainId sanity: MISMATCH (config=$CHAIN_JSON, rpc=$RUNTIME_CHAINID_RAW)"
    fi
  else
    echo "  chainId (RPC)    : ERROR (cast chain-id failed; RPC down or not anvil-2050?)"
    echo "[FATAL] cannot talk to RPC_URL=${RPC_URL}" >&2
    exit 1
  fi
else
  echo "  cast not found; skipping runtime chainId check."
fi

echo
echo "=== [1] forge script PLAN simulation (expect stub revert) ==="
echo "[step] running:"
echo "  forge script ${SCRIPT} --rpc-url ${RPC_URL} --sig 'run(string)' ${CONFIG_PATH} -vvvv"
echo

set +e
FORGE_OUT="$(
  forge script "${SCRIPT}" \
    --rpc-url "${RPC_URL}" \
    --sig "run(string)" \
    "${CONFIG_PATH}" \
    -vvvv 2>&1
)"
RC=$?
set -e

echo "=== [forge output] begin ==="
echo "${FORGE_OUT}"
echo "=== [forge output] end ==="
echo
echo "[plan-sim] forge exit code = ${RC}"

# We EXPECT a non-zero exit with the stub-only revert.
STUB_MARKER="stub only; implement real wiring before broadcast"

if echo "${FORGE_OUT}" | grep -q "${STUB_MARKER}"; then
  echo
  echo "[plan-sim] detected expected stub revert marker:"
  echo "  \"${STUB_MARKER}\""
  echo "[plan-sim] This means the script parsed the config, logged roles/contracts/validator0,"
  echo "           and then reverted intentionally as a stub."
  echo
  echo "[plan-sim] RESULT: OK (PLAN sim path wired; still stub-only, no broadcast)."
  exit 0
fi

echo
echo "[plan-sim] ERROR: forge script did NOT show the expected stub marker."
echo "  - Either the script reverted for another reason, or it did not revert at all."
echo "  - Inspect logs above and update VoidMainnetBootstrapMainnet.s.sol or this harness."
exit 1
