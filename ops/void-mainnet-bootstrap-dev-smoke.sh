#!/usr/bin/env bash
set -euo pipefail

# VOID mainnet DEV bootstrap smoke harness
#
# This script is a SMALL, SAFE wrapper that:
#   1) Runs the full dev bootstrap pipeline on anvil (chainId 2050).
#   2) Runs the high-level mainnet health checks.
#   3) Runs the pillars-preflight health hammer.
#
# It does NOT touch real mainnet. It assumes:
#   - anvil is running on 127.0.0.1:8545 with chainId 2050.
#   - Prometheus is on 127.0.0.1:9090.
#
# Goal: one-command sanity check that "dev bootstrap + core mainnet
#       health + pillars" are all green.

REPO="${REPO:-$HOME/dev/void-node}"
ANVIL_RPC="${ANVIL_RPC:-http://127.0.0.1:8545}"
PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"
DEV_CONFIG="${DEV_CONFIG:-config/void-mainnet-bootstrap-dev.json}"

echo "=== [dev-bootstrap-smoke] VOID mainnet dev bootstrap smoke harness ==="
echo "[info] REPO       = $REPO"
echo "[info] ANVIL_RPC  = $ANVIL_RPC"
echo "[info] PROM_URL   = $PROM_URL"
echo "[info] DEV_CONFIG = $DEV_CONFIG"
echo

cd "$REPO"

echo "=== [step 0] quick git + branch sanity ==="
git rev-parse --abbrev-ref HEAD || true
git status -sb || true
echo

echo "=== [step 1] run full dev bootstrap pipeline ==="
if [[ ! -x ops/void-mainnet-dev-bootstrap-full.sh ]]; then
  echo "[FATAL] ops/void-mainnet-dev-bootstrap-full.sh not found or not executable" >&2
  exit 1
fi

ANVIL_RPC="$ANVIL_RPC" ANVIL_CHAINID=2050 \
  ./ops/void-mainnet-dev-bootstrap-full.sh
echo "[step 1] dev bootstrap pipeline completed."
echo

echo "=== [step 2] run PLAN against dev config (read-only) ==="
if [[ ! -x ops/void-mainnet-bootstrap-plan.sh ]]; then
  echo "[FATAL] ops/void-mainnet-bootstrap-plan.sh not found or not executable" >&2
  exit 1
fi

./ops/void-mainnet-bootstrap-plan.sh \
  --config "$DEV_CONFIG" \
  --rpc    "$ANVIL_RPC"
echo "[step 2] PLAN OK."
echo

echo "=== [step 3] run SAFETY (PLAN + Prometheus mainnet gauges) ==="
if [[ ! -x ops/void-mainnet-bootstrap-safety.sh ]]; then
  echo "[FATAL] ops/void-mainnet-bootstrap-safety.sh not found or not executable" >&2
  exit 1
fi

./ops/void-mainnet-bootstrap-safety.sh \
  --config "$DEV_CONFIG" \
  --rpc    "$ANVIL_RPC" \
  --prom   "$PROM_URL"
echo "[step 3] SAFETY OK."
echo

echo "=== [step 4] mainnet-core + tokenomics + lastmile health-all ==="
if [[ -x ops/void-mainnet-health-all.sh ]]; then
  ./ops/void-mainnet-health-all.sh
else
  echo "[warn] ops/void-mainnet-health-all.sh not found; skipping."
fi
echo

echo "=== [step 5] pillars-preflight health-all ==="
if [[ -x ops/void-mainnet-pillars-health-all.sh ]]; then
  ./ops/void-mainnet-pillars-health-all.sh
else
  echo "[warn] ops/void-mainnet-pillars-health-all.sh not found; skipping."
fi
echo

echo "=== [dev-bootstrap-smoke] DONE ==="
echo "If all above steps are OK, dev bootstrap + core mainnet health + pillars are GREEN."
