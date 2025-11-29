#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

LIVE_CONFIG="config/void-mainnet-bootstrap-mainnet.live.json"
DEMO_CONFIG="config/void-mainnet-bootstrap-mainnet.plan-demo.json"
RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"

echo "=== [plan-demo] VOID mainnet PLAN demo rehearsal (NO BROADCAST) ==="
echo "[cfg] REPO_ROOT   = $REPO_ROOT"
echo "[cfg] LIVE_CONFIG = $LIVE_CONFIG"
echo "[cfg] DEMO_CONFIG = $DEMO_CONFIG"
echo "[cfg] RPC_URL     = $RPC_URL"
echo
echo "NOTE: This script:"
echo "  - Copies the live PLAN config to a DEMO file under config/."
echo "  - Fills DEMO roles/contracts/validator0 with obvious non-zero test values."
echo "  - Runs the PLAN rehearsal script against the DEMO file."
echo "  - Deletes the DEMO config afterwards."
echo "  - NEVER touches the real live config."
echo

if [[ ! -f "$LIVE_CONFIG" ]]; then
  echo "[FATAL] live PLAN config not found at $LIVE_CONFIG" >&2
  exit 1
fi

echo "=== [plan-demo] copying live PLAN config to $DEMO_CONFIG ==="
cp "$LIVE_CONFIG" "$DEMO_CONFIG"

echo
echo "=== [plan-demo] BEFORE (roles/contracts/validator0) ==="
jq '{roles, contracts, validator0}' "$DEMO_CONFIG" || true

echo
echo "=== [plan-demo] filling DEMO non-zero values in $DEMO_CONFIG (test-only) ==="
jq '
  .roles.deployer         = "0x1111111111111111111111111111111111111111" |
  .roles.treasuryAdmin    = "0x4444444444444444444444444444444444444444" |
  .roles.opsTreasuryAdmin = "0x5555555555555555555555555555555555555555" |
  .roles.validatorAdmin   = "0x7777777777777777777777777777777777777777" |
  .roles.adminGateOwner   = "0x1111111111111111111111111111111111111111" |
  .roles.updateGateOwner  = "0x2222222222222222222222222222222222222222" |
  .roles.configGateOwner  = "0x3333333333333333333333333333333333333333" |
  .roles.treasuryOwner    = "0x4444444444444444444444444444444444444444" |
  .roles.opsTreasuryOwner = "0x5555555555555555555555555555555555555555" |
  .roles.rewardEngineOwner = "0x6666666666666666666666666666666666666666" |
  .roles.validatorSetOwner = "0x7777777777777777777777777777777777777777" |

  .contracts.updateGate    = "0x1111111111111111111111111111111111111111" |
  .contracts.adminGate     = "0x1111111111111111111111111111111111111111" |
  .contracts.configGate    = "0x1111111111111111111111111111111111111111" |
  .contracts.validatorSet  = "0x1111111111111111111111111111111111111111" |
  .contracts.voidToken     = "0x1111111111111111111111111111111111111111" |
  .contracts.voidTreasury  = "0x1111111111111111111111111111111111111111" |
  .contracts.opsTreasury   = "0x1111111111111111111111111111111111111111" |
  .contracts.rewardEngine  = "0x1111111111111111111111111111111111111111" |
  .contracts.premineVault  = "0x1111111111111111111111111111111111111111" |
  .contracts.treasury      = "0x1111111111111111111111111111111111111111" |

  .validator0.reward       = "0x1111111111111111111111111111111111111111" |
  .validator0.stakeVOID    = "1000000e18" |
  .validator0.consensusKey = "0x000000000000000000000000000000000000000000000000000000000000BEEF"
' "$DEMO_CONFIG" > "${DEMO_CONFIG}.tmp"

mv "${DEMO_CONFIG}.tmp" "$DEMO_CONFIG"

echo
echo "=== [plan-demo] AFTER (roles/contracts/validator0) ==="
jq '{roles, contracts, validator0}' "$DEMO_CONFIG" || true

echo
echo "=== [plan-demo] running PLAN rehearsal against DEMO config (NO BROADCAST) ==="
forge script script/VoidMainnetBootstrapPlanRehearse.s.sol:VoidMainnetBootstrapPlanRehearse \
  --rpc-url "$RPC_URL" \
  --sig "run(string)" \
  "$DEMO_CONFIG"

echo
echo "=== [plan-demo] cleaning up demo config $DEMO_CONFIG ==="
rm -f "$DEMO_CONFIG"

echo
echo "=== [plan-demo] DONE (live PLAN config unchanged; demo config removed) ==="
