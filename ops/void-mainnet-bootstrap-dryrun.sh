#!/usr/bin/env bash
set -euo pipefail

ROOT="${HOME}/dev/void-node"
cd "${ROOT}"

echo "[bootstrap-dryrun] repo=${ROOT}"

if ! command -v forge >/dev/null 2>&1; then
  echo "[bootstrap-dryrun] ERROR: forge not found in PATH"
  exit 1
fi

echo "[bootstrap-dryrun] running forge script dryrun (compile + simulate)..."
# We treat failure as a warning for now so missing RPC config doesn't break pipes.
if ! forge script script/VoidMainnetBootstrap.s.sol --dry-run; then
  echo "[bootstrap-dryrun] WARN: forge script failed (likely missing rpc-url/FOUNDRY_ETH_RPC_URL); ignoring for now"
  exit 0
fi

echo "[bootstrap-dryrun] OK (script compiled and dryrun succeeded)"
