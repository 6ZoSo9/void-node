#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/dev/void-node"

CFG="config/void-mainnet-bootstrap-mainnet.live.json"

echo "=== [contracts-zero-guard] LIVE JSON contracts must all be zero (pre-deploy) ==="
jq '.contracts' "$CFG"

NON_ZERO=$(jq -r '
  .contracts
  | to_entries[]
  | select(.value != "0x0000000000000000000000000000000000000000")
  | "\(.key)=\(.value)"
' "$CFG")

if [[ -n "${NON_ZERO}" ]]; then
  echo "[FATAL] found non-zero contract addresses in LIVE JSON:"
  echo "${NON_ZERO}"
  exit 1
fi

echo "[OK] all .contracts.* entries are zero-address (pre-deploy PLAN state)."
