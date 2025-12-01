#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/dev/void-node"

RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"

echo "=== [mainnet-broadcast] VOID mainnet bootstrap BROADCAST skeleton v2 ==="
echo "[cfg] REPO_ROOT = $(pwd)"
echo "[cfg] RPC_URL   = ${RPC_URL}"
echo

echo "=== [0] preflight: PLAN + mainnet health ==="

if [[ -x ./ops/void-mainnet-plan-all.sh ]]; then
  ./ops/void-mainnet-plan-all.sh
else
  echo "[WARN] ./ops/void-mainnet-plan-all.sh missing or not executable; skipping PLAN bundle."
fi
echo

if [[ -x ./ops/void-mainnet-health-all.sh ]]; then
  ./ops/void-mainnet-health-all.sh
else
  echo "[WARN] ./ops/void-mainnet-health-all.sh missing or not executable; skipping mainnet-core health."
fi
echo

if [[ -x ./ops/void-mainnet-tokenomics-health-all.sh ]]; then
  ./ops/void-mainnet-tokenomics-health-all.sh
else
  echo "[WARN] ./ops/void-mainnet-tokenomics-health-all.sh missing or not executable; skipping tokenomics health."
fi
echo

if [[ -x ./ops/void-mainnet-lastmile-health.sh ]]; then
  ./ops/void-mainnet-lastmile-health.sh
else
  echo "[WARN] ./ops/void-mainnet-lastmile-health.sh missing or not executable; skipping lastmile health."
fi
echo

if [[ -x ./ops/void-mainnet-plan-ready-cli.sh ]]; then
  ./ops/void-mainnet-plan-ready-cli.sh
else
  echo "[WARN] ./ops/void-mainnet-plan-ready-cli.sh missing or not executable; skipping plan-ready check."
fi
echo

echo "=== [1] BROADCAST IS DISABLED ==="
echo "[FATAL] This script is intentionally DISABLED."
echo "[FATAL] Do NOT enable until:"
echo "  - Real mainnet keys are generated and stored safely (LUKS / hardware)."
echo "  - LIVE JSON has FINAL public addresses, no sentinels."
echo "  - We have re-run all preflight checks and signed off on the plan."

echo
echo "[NOTE] When the time comes, this script will:"
echo "  1) Re-check PLAN and mainnet health."
echo "  2) Run the forge script with --broadcast using hardware-backed keys."
echo "  3) Capture tx hashes and update docs/metrics."
echo
echo "For now, it is a dry preflight harness only."
exit 1
