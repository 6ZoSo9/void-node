#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/dev/void-node"

CFG_DEV="config/void-mainnet-bootstrap-mainnet.dev.json"
CFG_LIVE="config/void-mainnet-bootstrap-mainnet.live.json"

echo "=== [wc-plan-dump] VOID mainnet Work Credits PLAN dump ==="

dump_cfg() {
  local cfg="$1"
  local label="$2"

  echo
  echo "=== [wc-plan-dump] $label ==="
  if [ ! -f "$cfg" ]; then
    echo "[warn] $cfg not found"
    return 0
  fi

  jq -r '
    "chainId = \(.chainId)",
    "",
    "roles (if any):",
    "  rewardEngineOwner      = \(.roles.rewardEngineOwner // "0x0000000000000000000000000000000000000000")",
    "  opsTreasuryAdmin       = \(.roles.opsTreasuryAdmin  // "0x0000000000000000000000000000000000000000")",
    "",
    "contracts (core):",
    "  voidToken              = \(.contracts.voidToken      // "0x0000000000000000000000000000000000000000")",
    "  voidTreasury           = \(.contracts.voidTreasury   // "0x0000000000000000000000000000000000000000")",
    "  opsTreasury            = \(.contracts.opsTreasury    // "0x0000000000000000000000000000000000000000")",
    "  rewardEngine           = \(.contracts.rewardEngine   // "0x0000000000000000000000000000000000000000")",
    "",
    "contracts (Work Credits):",
    "  workCreditsToken       = \(.contracts.workCreditsToken        // "0x0000000000000000000000000000000000000000")",
    "  workCreditsMinter      = \(.contracts.workCreditsMinter       // "0x0000000000000000000000000000000000000000")",
    "  workCreditsRelayerHelper= \(.contracts.workCreditsRelayerHelper// "0x0000000000000000000000000000000000000000")"
  ' "$cfg"
}

dump_cfg "$CFG_DEV"  "DEV config ($CFG_DEV)"
dump_cfg "$CFG_LIVE" "LIVE config ($CFG_LIVE)"

echo
echo "=== [wc-plan-dump] done ==="
