#!/usr/bin/env bash
set -euo pipefail

# Simple sanity hammer for the DEV Anvil rehearsal of the mainnet bootstrap plan.
# Assumes:
#   - Anvil (or other RPC) is running at RPC_URL
#   - DEV bootstrap plan script already deployed the contracts at the addresses below.

REPO_ROOT="${REPO_ROOT:-$HOME/dev/void-node}"
cd "$REPO_ROOT"

RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"

# Default DEV addresses from the rehearsal; can be overridden via env if needed.
TOKEN="${TOKEN:-0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6}"
VOID_TREASURY="${VOID_TREASURY:-0x610178dA211FEF7D417bC0e6FeD39F05609AD788}"
OPS_TREASURY="${OPS_TREASURY:-0x8A791620dd6260079BF849Dc5567aDC3F2FdC318}"
ADMINGATE="${ADMINGATE:-0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0}"
# NOTE: CONFIGGATE / VALIDATORSET / REWARDENGINE can be added once we lock their DEV addresses.

log() {
  echo "[$(date -Is)] $*"
}

fatal() {
  echo "FATAL: $*" >&2
  exit 1
}

strip_quotes() {
  # strip a single pair of leading/trailing double quotes if present
  local v="$1"
  v="${v#\"}"
  v="${v%\"}"
  printf '%s' "$v"
}

require_eq() {
  local label="$1"
  local expect="$2"
  local actual="$3"
  if [[ "$expect" != "$actual" ]]; then
    fatal "$label mismatch: expected '$expect' got '$actual'"
  fi
  log "OK: $label = $actual"
}

require_nonzero_uint() {
  local label="$1"
  local value="$2"
  if [[ "$value" == "0" ]]; then
    fatal "$label is zero (expected > 0)"
  fi
  log "OK: $label = $value (> 0)"
}

require_nonempty_code() {
  local label="$1"
  local addr="$2"
  local code
  code="$(cast code "$addr" --rpc-url "$RPC_URL")"
  if [[ -z "$code" || "$code" == "0x" ]]; then
    fatal "$label at $addr has no code"
  fi
  log "OK: $label at $addr has non-empty code (len=${#code})"
}

log "=== [dev-plan sanity] starting ==="
log "RPC_URL = $RPC_URL"

# 0) ChainId sanity: dev anvil for VOID mainnet plan should be 2050.
chain_id="$(cast chain-id --rpc-url "$RPC_URL")"
require_eq "chainId" "2050" "$chain_id"

# 1) Code presence checks.
require_nonempty_code "VoidToken" "$TOKEN"
require_nonempty_code "VoidTreasury" "$VOID_TREASURY"
require_nonempty_code "OpsTreasury" "$OPS_TREASURY"
require_nonempty_code "AdminGate" "$ADMINGATE"

# 2) Token shape checks (ERC-20 basics).
log "--- [token introspection] ---"
token_name_raw="$(cast call "$TOKEN" "name()(string)" --rpc-url "$RPC_URL")"
token_symbol_raw="$(cast call "$TOKEN" "symbol()(string)" --rpc-url "$RPC_URL")"
token_decimals_raw="$(cast call "$TOKEN" "decimals()(uint8)" --rpc-url "$RPC_URL")"

token_name="$(strip_quotes "$token_name_raw")"
token_symbol="$(strip_quotes "$token_symbol_raw")"
token_decimals="$(strip_quotes "$token_decimals_raw")"

log "Token name    : $token_name"
log "Token symbol  : $token_symbol"
log "Token decimals: $token_decimals"

require_eq "Token symbol" "VOID" "$token_symbol"
require_eq "Token decimals" "18" "$token_decimals"

# 3) Treasury balances.
log "--- [treasury balances] ---"
treasury_bal="$(cast call "$TOKEN" "balanceOf(address)(uint256)" "$VOID_TREASURY" --rpc-url "$RPC_URL")"
ops_bal="$(cast call "$TOKEN" "balanceOf(address)(uint256)" "$OPS_TREASURY" --rpc-url "$RPC_URL")"

# Treasury must be funded in DEV plan.
require_nonzero_uint "VoidTreasury VOID balance" "$treasury_bal"

# OpsTreasury: soft check by default; hard check if REQUIRE_OPS_NONZERO=1.
if [[ "${REQUIRE_OPS_NONZERO:-0}" == "1" ]]; then
  require_nonzero_uint "OpsTreasury VOID balance" "$ops_bal"
else
  if [[ "$ops_bal" == "0" ]]; then
    log "WARN: OpsTreasury VOID balance is zero (DEV plan did not fund ops; allowed in DEV)."
  else
    log "OK: OpsTreasury VOID balance = $ops_bal (> 0)"
  fi
fi

log "=== [dev-plan sanity] ALL CHECKS PASSED ==="
