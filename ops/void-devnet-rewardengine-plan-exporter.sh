#!/usr/bin/env bash
set -euo pipefail

# Devnet RewardEngine presence exporter
#
# Reads docs/VOID-DEVNET-PROTOCOL-STATE.json and emits:
#
#   void_devnet_rewardengine_present            1/0
#   void_devnet_rewardengine_address_nonzero    1/0
#   void_devnet_rewardengine_meta{address="…"}  1   (if present)
#
# Semantics:
#   - present = 1 iff state.RewardEngine exists in the devnet state JSON.
#   - address_nonzero = 1 iff .RewardEngine.address is a non-zero EVM address.
#   - meta is just a static label for dashboards.
#
# Right now RewardEngine is NOT in devnet state and that's expected.
# This exporter will therefore emit present=0, address_nonzero=0 until you deploy it.

REPO="${REPO:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
STATE_JSON="${STATE_JSON:-$REPO/docs/VOID-DEVNET-PROTOCOL-STATE.json}"

TEXTFILE_DIR="${TEXTFILE_DIR:-/var/lib/node_exporter/textfile_collector}"
OUT="${OUT:-$TEXTFILE_DIR/void_devnet_rewardengine_plan.prom}"

mkdir -p "$TEXTFILE_DIR"

present=0
addr=""
addr_nonzero=0

if [[ -f "$STATE_JSON" ]]; then
  # RewardEngine presence: top-level key in devnet state
  if jq -e 'has("RewardEngine")' "$STATE_JSON" >/dev/null 2>&1; then
    present=1
  fi

  # Try to extract an address if RewardEngine exists
  addr="$(jq -r '.RewardEngine.address // ""' "$STATE_JSON" 2>/dev/null || echo "")"

  if [[ -n "$addr" ]] && [[ "$addr" =~ ^0x[0-9a-fA-F]{40}$ ]] && [[ "$addr" != "0x0000000000000000000000000000000000000000" ]]; then
    addr_nonzero=1
  fi
fi

tmp="$(mktemp "${OUT}.tmp.XXXXXX")"

{
  echo '# HELP void_devnet_rewardengine_present Is RewardEngine present in devnet state JSON (1=yes,0=no)'
  echo '# TYPE void_devnet_rewardengine_present gauge'
  echo "void_devnet_rewardengine_present $present"

  echo '# HELP void_devnet_rewardengine_address_nonzero RewardEngine devnet address non-zero flag (1=non-zero,0=zero/invalid/missing)'
  echo '# TYPE void_devnet_rewardengine_address_nonzero gauge'
  echo "void_devnet_rewardengine_address_nonzero $addr_nonzero"

  if [[ "$present" -eq 1 ]]; then
    echo '# HELP void_devnet_rewardengine_meta Static metadata for devnet RewardEngine'
    echo '# TYPE void_devnet_rewardengine_meta gauge'
    safe_addr="${addr//\\/\\\\}"
    safe_addr="${safe_addr//\"/\\\"}"
    echo "void_devnet_rewardengine_meta{address=\"$safe_addr\"} 1"
  fi
} > "$tmp"

mv "$tmp" "$OUT"
