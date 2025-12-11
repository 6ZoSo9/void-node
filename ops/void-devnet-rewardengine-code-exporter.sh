#!/usr/bin/env bash
set -euo pipefail

# Devnet RewardEngine code health exporter
#
# Reads docs/VOID-DEVNET-PROTOCOL-STATE.json to find .RewardEngine.address,
# then uses `cast code` against the devnet RPC to determine if code exists.
#
# Exports Prometheus metrics:
#
#   void_devnet_rewardengine_code_nonzero   1/0
#   void_devnet_rewardengine_code_health    1/0
#   void_devnet_rewardengine_code_meta{address="…",rpc_url="…"} 1
#
# Semantics:
#   - code_nonzero = 1 if cast code returns non-empty (non-0x) bytecode.
#   - code_health  = 1 iff:
#         RewardEngine is present in state JSON
#         AND address_nonzero (plan)
#         AND on-chain code_nonzero
#
# NOTE: This is *diagnostic* only for now; no gating.

REPO="${REPO:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
STATE_JSON="${STATE_JSON:-$REPO/docs/VOID-DEVNET-PROTOCOL-STATE.json}"

TEXTFILE_DIR="${TEXTFILE_DIR:-/var/lib/node_exporter/textfile_collector}"
OUT="${OUT:-$TEXTFILE_DIR/void_devnet_rewardengine_code.prom}"

DEVNET_RPC="${DEVNET_RPC:-http://127.0.0.1:8545}"

mkdir -p "$TEXTFILE_DIR"

present=0
addr=""
addr_nonzero_plan=0
code_nonzero=0
health=0

if [[ -f "$STATE_JSON" ]]; then
  # Is there a RewardEngine block at all?
  if jq -e 'has("RewardEngine")' "$STATE_JSON" >/dev/null 2>&1; then
    present=1
  fi

  addr="$(jq -r '.RewardEngine.address // ""' "$STATE_JSON" 2>/dev/null || echo "")"

  if [[ -n "$addr" ]] && [[ "$addr" =~ ^0x[0-9a-fA-F]{40}$ ]] && [[ "$addr" != "0x0000000000000000000000000000000000000000" ]]; then
    addr_nonzero_plan=1
  fi
fi

# Only bother hitting the chain if we have a non-zero-ish address in the plan
if [[ "$present" -eq 1 && "$addr_nonzero_plan" -eq 1 ]]; then
  # Try cast code; if cast is missing or fails, treat as no code.
  CODE_HEX="$(cast code --rpc-url "$DEVNET_RPC" "$addr" 2>/dev/null || echo "0x")"

  # Normalize: must start with 0x, any extra bytes count as "nonzero"
  if [[ "$CODE_HEX" =~ ^0x[0-9a-fA-F]+$ ]] && [[ "$CODE_HEX" != "0x" ]]; then
    code_nonzero=1
  fi
fi

# Code health = 1 only if:
#  - present in state JSON
#  - address non-zero in plan
#  - on-chain code exists
if [[ "$present" -eq 1 && "$addr_nonzero_plan" -eq 1 && "$code_nonzero" -eq 1 ]]; then
  health=1
fi

tmp="$(mktemp "${OUT}.tmp.XXXXXX")"

{
  echo '# HELP void_devnet_rewardengine_code_nonzero Is RewardEngine code non-zero on devnet (1=yes,0=no)'
  echo '# TYPE void_devnet_rewardengine_code_nonzero gauge'
  echo "void_devnet_rewardengine_code_nonzero $code_nonzero"

  echo '# HELP void_devnet_rewardengine_code_health Devnet RewardEngine code-level health (1=present+nonzero plan+nonempty code, 0 otherwise)'
  echo '# TYPE void_devnet_rewardengine_code_health gauge'
  echo "void_devnet_rewardengine_code_health $health"

  # Meta line for dashboards
  echo '# HELP void_devnet_rewardengine_code_meta Static metadata for devnet RewardEngine code check'
  echo '# TYPE void_devnet_rewardengine_code_meta gauge'
  safe_addr="${addr//\\/\\\\}"
  safe_addr="${safe_addr//\"/\\\"}"
  safe_rpc="${DEVNET_RPC//\\/\\\\}"
  safe_rpc="${safe_rpc//\"/\\\"}"
  echo "void_devnet_rewardengine_code_meta{address=\"$safe_addr\",rpc_url=\"$safe_rpc\"} 1"
} > "$tmp"

mv "$tmp" "$OUT"
