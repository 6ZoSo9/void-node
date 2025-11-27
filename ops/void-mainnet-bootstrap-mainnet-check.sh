#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/dev/void-node"

GOOD_CFG="ops/mainnet-bootstrap-addresses.mainnet.example.json"
BAD_CFG="ops/mainnet-bootstrap-addresses.bad-chainid.json"

echo "=== [1] good config should PASS (exit 0) ==="
ops/void-mainnet-bootstrap-mainnet-anvil.sh "$GOOD_CFG"
GOOD_STATUS=$?
echo "[good] exit=${GOOD_STATUS}"
if [ "${GOOD_STATUS}" -ne 0 ]; then
  echo "[good] ERROR: expected exit 0 for ${GOOD_CFG}, got ${GOOD_STATUS}" >&2
  exit 1
fi

echo
echo "=== [2] bad chainId config should FAIL (non-zero) ==="
set +e
ops/void-mainnet-bootstrap-mainnet-anvil.sh "$BAD_CFG"
BAD_STATUS=$?
set -e
echo "[bad-chainid] exit=${BAD_STATUS}"
if [ "${BAD_STATUS}" -eq 0 ]; then
  echo "[bad-chainid] ERROR: expected non-zero exit for ${BAD_CFG}, got 0" >&2
  exit 1
fi

echo
echo "[check] OK: bootstrap harness passes good config and rejects bad chainId"
