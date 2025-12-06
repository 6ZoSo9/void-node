#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CFG="$REPO_ROOT/config/void-workcredits-devnet.live.json"

if [ ! -f "$CFG" ]; then
  echo "[fatal] config file not found: $CFG" >&2
  exit 1
fi

# Optional env vars; if empty, we leave the existing field alone.
VOID_TOKEN_ADDR="${VOID_TOKEN_ADDR:-}"
WC_TOKEN_ADDR="${WC_TOKEN_ADDR:-}"
LP_POOL_ADDR="${LP_POOL_ADDR:-}"
TREASURY_ADDR="${TREASURY_ADDR:-}"
OPS_TREASURY_ADDR="${OPS_TREASURY_ADDR:-}"

validate_addr() {
  local name="$1"
  local val="$2"

  # Allow empty (means "leave as-is")
  if [ -z "$val" ]; then
    return 0
  fi

  if [[ ! "$val" =~ ^0x[0-9a-fA-F]{40}$ ]]; then
    echo "[fatal] $name is not a valid 0x + 40 hex address: $val" >&2
    exit 1
  fi
}

validate_addr "VOID_TOKEN_ADDR" "$VOID_TOKEN_ADDR"
validate_addr "WC_TOKEN_ADDR" "$WC_TOKEN_ADDR"
validate_addr "LP_POOL_ADDR" "$LP_POOL_ADDR"
validate_addr "TREASURY_ADDR" "$TREASURY_ADDR"
validate_addr "OPS_TREASURY_ADDR" "$OPS_TREASURY_ADDR"

TMP="$(mktemp "${CFG}.XXXXXX")"

jq \
  --arg void "$VOID_TOKEN_ADDR" \
  --arg wc "$WC_TOKEN_ADDR" \
  --arg pool "$LP_POOL_ADDR" \
  --arg treas "$TREASURY_ADDR" \
  --arg ops "$OPS_TREASURY_ADDR" \
  '
  .voidToken       = (if $void  != "" then $void  else .voidToken       end) |
  .workCreditsToken= (if $wc    != "" then $wc    else .workCreditsToken end) |
  .lpPool          = (if $pool  != "" then $pool  else .lpPool          end) |
  .treasury        = (if $treas != "" then $treas else .treasury        end) |
  .opsTreasury     = (if $ops   != "" then $ops   else .opsTreasury     end)
  ' "$CFG" > "$TMP"

mv "$TMP" "$CFG"

echo "[ok] updated $CFG"
jq '.' "$CFG"
