#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/dev/void-node"

CFG="${1:-config/void-mainnet-bootstrap-dev.json}"

echo "=== VOID mainnet bootstrap FromJson (dev, read-only) ==="
echo "[dev-from-json] config path: $CFG"
echo

if [ ! -f "$CFG" ]; then
  echo "[dev-from-json] FATAL: config file not found: $CFG" >&2
  exit 1
fi

export VOID_MAINNET_CONFIG="$CFG"

forge script script/VoidMainnetBootstrapFromJson.s.sol:VoidMainnetBootstrapFromJson \
  --sig "run()"
