#!/usr/bin/env bash
set -euo pipefail

# VOID mainnet bootstrap config LINT (offline, no RPC)
#
# Purpose:
#   - Sanity-check a *mainnet* bootstrap JSON before we ever point anything at
#     a live RPC or hardware wallet.
#   - This script does NOT send transactions and does NOT talk to an RPC.
#
# Checks:
#   - chainId == 2050 (VOID mainnet) or FAIL.
#   - roles.* addresses are:
#       * valid 0x-prefixed hex
#       * non-zero
#       * NOT in the known Anvil dev set.
#   - validators[*].rewardAddress also NOT in the Anvil dev set.
#
# Usage:
#   ./ops/void-mainnet-bootstrap-mainnet-lint.sh \
#     --config config/void-mainnet-bootstrap-mainnet.template.json
#
# You can also run it against the dev config to see it FAIL on purpose:
#   ./ops/void-mainnet-bootstrap-mainnet-lint.sh \
#     --config config/void-mainnet-bootstrap-dev.json

CONFIG=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --config)
      CONFIG="$2"
      shift 2
      ;;
    -h|--help)
      echo "Usage: $0 --config <config.json>"
      echo
      echo "Offline LINT for VOID mainnet bootstrap config."
      exit 0
      ;;
    *)
      echo "[ERROR] Unknown arg: $1" >&2
      exit 1
      ;;
  esac
done

# Default to mainnet template if present.
if [[ -z "${CONFIG:-}" ]]; then
  if [[ -f config/void-mainnet-bootstrap-mainnet.template.json ]]; then
    CONFIG="config/void-mainnet-bootstrap-mainnet.template.json"
  else
    echo "[ERROR] --config is required and default template not found." >&2
    exit 1
  fi
fi

if [[ ! -f "$CONFIG" ]]; then
  echo "[ERROR] config file not found: $CONFIG" >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "[ERROR] jq not found on PATH." >&2
  exit 1
fi

echo "=== VOID mainnet bootstrap MAINNET-LINT ==="
echo "[info] CONFIG = $CONFIG"
echo

# Known Anvil dev addresses (lowercase)
DEV_ADDRS_LC=$(cat <<'EOF'
0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266
0x70997970c51812dc3a010c7d01b50e0d17dc79c8
0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc
EOF
)

DEV_ADDRS_LC=$(echo "$DEV_ADDRS_LC" \
  | tr 'A-F' 'a-f' \
  | tr -s '[:space:]' '\n' \
  | grep -E '^0x[0-9a-f]{40}$' || true)

is_dev_addr() {
  local addr_lc="$1"
  if echo "$DEV_ADDRS_LC" | grep -qi "^${addr_lc}$"; then
    return 0
  fi
  return 1
}

# Basic fields
CHAIN_ID_CFG=$(jq -r '.chainId // "null"' "$CONFIG")
NETWORK_NAME=$(jq -r '.networkName // .network // "null"' "$CONFIG" 2>/dev/null || echo "null")

echo "=== [STEP 1] Basic config fields ==="
echo "config.chainId   = $CHAIN_ID_CFG"
echo "config.network   = $NETWORK_NAME"
echo

if [[ "$CHAIN_ID_CFG" != "2050" ]]; then
  echo "[FATAL] config.chainId must be 2050 for VOID mainnet; got: $CHAIN_ID_CFG" >&2
  exit 2
fi
echo "[OK] chainId == 2050 (VOID mainnet)."
echo

# Roles list to inspect
ROLES=(
  "adminGateOwner"
  "updateGateOwner"
  "configGateOwner"
  "treasuryOwner"
  "opsTreasuryOwner"
  "rewardEngineOwner"
  "validatorSetOwner"
)

echo "=== [STEP 2] Roles address summary ==="

FAIL=0

for role in "${ROLES[@]}"; do
  addr=$(jq -r --arg r "$role" '.roles[$r] // "null"' "$CONFIG")
  if [[ "$addr" == "null" ]]; then
    echo "[FATAL] roles.$role is null/missing in config." >&2
    FAIL=1
    continue
  fi

  # Basic format checks
  if ! [[ "$addr" =~ ^0x[0-9a-fA-F]{40}$ ]]; then
    echo "[FATAL] roles.$role has invalid address format: $addr" >&2
    FAIL=1
  fi

  if [[ "$addr" == "0x0000000000000000000000000000000000000000" ]]; then
    echo "[FATAL] roles.$role is zero-address: $addr" >&2
    FAIL=1
  fi

  addr_lc=$(echo "$addr" | tr 'A-F' 'a-f')

  if is_dev_addr "$addr_lc"; then
    echo "[FATAL] roles.$role ($addr) matches a KNOWN ANVIL DEV ADDRESS. This is NOT allowed for mainnet." >&2
    FAIL=1
  else
    echo "roles.$role = $addr"
  fi
done

echo
echo "=== [STEP 3] Validators sanity ==="
VAL_COUNT=$(jq -r '.validators | length' "$CONFIG" 2>/dev/null || echo "0")
echo "validators.length = $VAL_COUNT"

if [[ "$VAL_COUNT" -eq 0 ]]; then
  echo "[WARN] No validators defined. This might be intentional for a template, but is invalid for real mainnet." >&2
fi

idx=0
while [[ "$idx" -lt "$VAL_COUNT" ]]; do
  v_json=$(jq -r --argjson i "$idx" '.validators[$i]' "$CONFIG")
  id=$(echo "$v_json" | jq -r '.id // ("validator-" + ($i|tostring))' 2>/dev/null || echo "validator-$idx")
  reward=$(echo "$v_json" | jq -r '.rewardAddress // "null"' 2>/dev/null || echo "null")
  stake=$(echo "$v_json" | jq -r '.stakeVOID // "null"' 2>/dev/null || echo "null")

  echo "--- validator[$idx] ---"
  echo "id        = $id"
  echo "reward    = $reward"
  echo "stakeVOID = $stake"

  if [[ "$reward" == "null" ]]; then
    echo "[FATAL] validator[$idx].rewardAddress is null/missing." >&2
    FAIL=1
  else
    if ! [[ "$reward" =~ ^0x[0-9a-fA-F]{40}$ ]]; then
      echo "[FATAL] validator[$idx].rewardAddress has invalid address format: $reward" >&2
      FAIL=1
    fi
    reward_lc=$(echo "$reward" | tr 'A-F' 'a-f')
    if is_dev_addr "$reward_lc"; then
      echo "[FATAL] validator[$idx].rewardAddress ($reward) matches a KNOWN ANVIL DEV ADDRESS. Not allowed for mainnet." >&2
      FAIL=1
    fi
  fi

  idx=$((idx + 1))
done

echo

if [[ "$FAIL" -ne 0 ]]; then
  echo "=== RESULT: MAINNET CONFIG LINT FAILED (see errors above) ===" >&2
  exit 3
fi

echo "=== RESULT: MAINNET CONFIG LINT PASSED ==="
echo "Config looks structurally sane for a NON-dev, NON-anvil mainnet bootstrap."
