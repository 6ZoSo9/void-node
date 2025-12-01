#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/dev/void-node"

CONFIG_PATH="config/void-mainnet-bootstrap-mainnet.live.json"
SCRIPT_FQ="script/VoidMainnetBootstrapMainnet.s.sol:VoidMainnetBootstrapMainnet"
RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"

echo "=== [mainnet-dry-run] VOID mainnet bootstrap MAINNET run() dry-run ==="
echo "[cfg] ROOT        = \$(pwd)"
echo "[cfg] SCRIPT_FQ   = \${SCRIPT_FQ}"
echo "[cfg] CONFIG_PATH = \${CONFIG_PATH}"
echo "[cfg] RPC_URL     = \${RPC_URL}"

echo
echo "=== [1] chainId sanity via cast chain-id ==="
cast chain-id --rpc-url "\${RPC_URL}"

echo
echo "=== [2] forge script run(configPath) simulation (EXPECT STUB REVERT) ==="

tmpout=\$(mktemp)
set +e
forge script "\${SCRIPT_FQ}" \
  --rpc-url "\${RPC_URL}" \
  --sig 'run(string)' "\${CONFIG_PATH}" \
  >"\${tmpout}" 2>&1
status=\$?
set -e

cat "\${tmpout}"

if grep -q 'VoidMainnetBootstrapMainnet: stub only; implement real wiring before broadcast' "\${tmpout}"; then
  echo
  echo "=== [mainnet-dry-run] OK: saw expected stub-only revert message."
  echo "=== [mainnet-dry-run] This confirms LIVE JSON is readable and script wiring is intact."
  rm -f "\${tmpout}"
  exit 0
fi

echo
echo "=== [mainnet-dry-run] ERROR: did NOT see expected stub-only revert message."
echo "status=\${status}"
echo "tmpout=\${tmpout} (left for inspection)"
exit 1
