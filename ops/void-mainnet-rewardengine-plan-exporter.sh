#!/usr/bin/env bash
set -euo pipefail

# RewardEngine mainnet plan exporter
#
# Emits:
#   void_mainnet_rewardengine_plan_health            (1 = RewardEngine entry present in live JSON, 0 = missing)
#   void_mainnet_rewardengine_plan_address_nonzero   (1 = address is non-zero 20-byte EVM, 0 = zero/invalid/missing)
#   void_mainnet_rewardengine_plan_meta{address="…"} 1   (static label with whatever address is in the plan, if present)
#
# Semantics:
#   - PLAN health is about the presence of a RewardEngine block in the plan JSON.
#   - Address non-zero is exported separately so we can tighten checks after real deployment.

REPO="${REPO:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
LIVE_JSON="${LIVE_JSON:-$REPO/config/void-mainnet-bootstrap-mainnet.live.json}"

TEXTFILE_DIR="${TEXTFILE_DIR:-/var/lib/node_exporter/textfile_collector}"
OUT="${OUT:-$TEXTFILE_DIR/void_mainnet_rewardengine_plan.prom}"

mkdir -p "$TEXTFILE_DIR"

health=0
addr=""
entry_present=0
addr_nonzero=0

if [[ -f "$LIVE_JSON" ]]; then
  # Detect RewardEngine presence in either top-level or under .contracts
  if jq -e 'has("RewardEngine") or ((.contracts // {}) | has("RewardEngine"))' "$LIVE_JSON" >/dev/null 2>&1; then
    entry_present=1
    health=1
  fi

  # Try to extract an address if it exists in a common shape
  addr="$(jq -r '(.RewardEngine.address // .contracts.RewardEngine.address // "")' "$LIVE_JSON" 2>/dev/null || echo "")"

  # Non-zero EVM address check
  if [[ -n "$addr" ]] && [[ "$addr" =~ ^0x[0-9a-fA-F]{40}$ ]] && [[ "$addr" != "0x0000000000000000000000000000000000000000" ]]; then
    addr_nonzero=1
  fi
fi

tmp="$(mktemp "${OUT}.tmp.XXXXXX")"

{
  echo '# HELP void_mainnet_rewardengine_plan_health RewardEngine mainnet plan health (1=RewardEngine entry present in live JSON, 0=missing)'
  echo '# TYPE void_mainnet_rewardengine_plan_health gauge'
  echo "void_mainnet_rewardengine_plan_health $health"

  echo '# HELP void_mainnet_rewardengine_plan_address_nonzero RewardEngine plan address non-zero flag (1=non-zero,0=zero/invalid/missing)'
  echo '# TYPE void_mainnet_rewardengine_plan_address_nonzero gauge'
  echo "void_mainnet_rewardengine_plan_address_nonzero $addr_nonzero"

  if [[ "$entry_present" -eq 1 ]]; then
    echo '# HELP void_mainnet_rewardengine_plan_meta Static metadata for RewardEngine plan'
    echo '# TYPE void_mainnet_rewardengine_plan_meta gauge'
    safe_addr="${addr//\\/\\\\}"
    safe_addr="${safe_addr//\"/\\\"}"
    echo "void_mainnet_rewardengine_plan_meta{address=\"$safe_addr\"} 1"
  fi
} > "$tmp"

mv "$tmp" "$OUT"
