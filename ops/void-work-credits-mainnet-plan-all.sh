#!/usr/bin/env bash
set -euo pipefail

echo "=== [wc-mainnet-plan-all] VOID Work Credits mainnet PLAN + health ==="

REPO_ROOT="${REPO_ROOT:-$HOME/dev/void-node}"

cd "$REPO_ROOT"

echo
echo "--- [1] ensure LIVE JSON has WC/LLP/relayer keys ---"
if [[ -x ./ops/void-work-credits-mainnet-plan-json.sh ]]; then
  ./ops/void-work-credits-mainnet-plan-json.sh
else
  echo "[ERROR] missing ./ops/void-work-credits-mainnet-plan-json.sh" >&2
  exit 1
fi

echo
echo "--- [2] roles vs /mnt/voidkey roles-mapping (PLAN) ---"
if [[ -x ./ops/void-work-credits-mainnet-roles-plan.sh ]]; then
  ./ops/void-work-credits-mainnet-roles-plan.sh
else
  echo "[ERROR] missing ./ops/void-work-credits-mainnet-roles-plan.sh" >&2
  exit 1
fi

echo
echo "--- [3] WC PLAN sim (10M split + pending roles) ---"
if [[ -x ./ops/void-work-credits-mainnet-plan-sim.sh ]]; then
  ./ops/void-work-credits-mainnet-plan-sim.sh
else
  echo "[ERROR] missing ./ops/void-work-credits-mainnet-plan-sim.sh" >&2
  exit 1
fi

echo
echo "--- [4] WC mainnet health (planning + WC + relayers + pillars) ---"
if [[ -x ./ops/void-work-credits-mainnet-health-all.sh ]]; then
  ./ops/void-work-credits-mainnet-health-all.sh
else
  echo "[ERROR] missing ./ops/void-work-credits-mainnet-health-all.sh" >&2
  exit 1
fi

echo
echo "=== [wc-mainnet-plan-all] DONE (PLAN-only, no broadcasts) ==="
