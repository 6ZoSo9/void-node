#!/usr/bin/env bash
set -euo pipefail

# VOID mainnet — WorkCredits PLAN stub
#
# Purpose:
#   - Read config/void-mainnet-workcredits.live.json
#   - Sanity-check chainId == 2050
#   - Print current WorkCredits token/pool addresses
#   - Explicitly state that this is a STUB-ONLY plan script (no deploy)
#
# This is intentionally non-gating and non-destructive. It is a scaffold for the
# future real WorkCredits mainnet PLAN (deploy + wire WC token + WC/VOID pool).

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CFG="$ROOT/config/void-mainnet-workcredits.live.json"

echo "=== [workcredits-plan-stub] VOID mainnet WorkCredits PLAN stub ==="
echo "[cfg] ROOT = $ROOT"
echo "[cfg] CFG  = $CFG"
echo

if [[ ! -f "$CFG" ]]; then
  echo "[ERR] config file not found: $CFG" >&2
  echo "[HINT] expected config/void-mainnet-workcredits.live.json to exist." >&2
  exit 1
fi

# Extract fields with jq (required dependency for all our ops scripts anyway).
CHAIN_ID="$(jq -r '.chainId' "$CFG")"
WC_TOKEN="$(jq -r '.workCreditsToken' "$CFG")"
WC_POOL="$(jq -r '.workCreditsPool' "$CFG")"

echo "[cfg] chainId          = $CHAIN_ID"
echo "[cfg] workCreditsToken = $WC_TOKEN"
echo "[cfg] workCreditsPool  = $WC_POOL"
echo

# Hard requirement: this JSON is ONLY for VOID mainnet (chainId 2050).
if [[ "$CHAIN_ID" != "2050" ]]; then
  echo "[ERR] chainId mismatch: expected 2050, got $CHAIN_ID" >&2
  echo "[HINT] update config/void-mainnet-workcredits.live.json to use chainId 2050." >&2
  exit 1
fi

ZERO_ADDR="0x0000000000000000000000000000000000000000"

echo "=== [interpretation] ==="
if [[ "$WC_TOKEN" == "$ZERO_ADDR" ]]; then
  echo "- workCreditsToken is ZERO (no mainnet WC token wired yet)."
else
  echo "- workCreditsToken is NON-ZERO (candidate mainnet WC token)."
fi

if [[ "$WC_POOL" == "$ZERO_ADDR" ]]; then
  echo "- workCreditsPool is ZERO (no mainnet WC/VOID pool wired yet)."
else
  echo "- workCreditsPool is NON-ZERO (candidate WC/VOID pool)."
fi

echo
echo "=== [mode] STUB ONLY / NO DEPLOY ==="
echo "- This script does NOT deploy or modify anything."
echo "- It is a PLAN stub to inspect the live WorkCredits config."
echo "- Later, it will evolve into the real WorkCredits mainnet PLAN"
echo "  (deploy WC token, deploy WC/VOID pool, wire it to Treasury/RewardEngine/etc.)."
echo

exit 0
