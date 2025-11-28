#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/dev/void-node"

CFG="${1:-config/void-mainnet-bootstrap-mainnet.live.json}"

echo "=== VOID mainnet LIVE JSON validator ==="
echo "[live-json] file: $CFG"
echo

if [ ! -f "$CFG" ]; then
  echo "[live-json] FATAL: file not found: $CFG" >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "[live-json] FATAL: jq not found on PATH" >&2
  exit 1
fi

CHAINID=$(jq -r '.chainId // "<missing>"' "$CFG")
if [ "$CHAINID" != "2050" ]; then
  echo "[live-json] FATAL: chainId must be 2050 (got: $CHAINID)" >&2
  exit 1
fi

NETWORK_NAME=$(jq -r '.networkName // "<missing>"' "$CFG")
echo "[live-json] chainId      = $CHAINID"
echo "[live-json] networkName  = $NETWORK_NAME"
echo

echo "[live-json] checking role addresses..."
BAD_ROLES=$(jq -r '
  {
    adminGateOwner:    .roles.adminGateOwner,
    updateGateOwner:   .roles.updateGateOwner,
    configGateOwner:   .roles.configGateOwner,
    treasuryOwner:     .roles.treasuryOwner,
    opsTreasuryOwner:  .roles.opsTreasuryOwner,
    rewardEngineOwner: .roles.rewardEngineOwner,
    validatorSetOwner: .roles.validatorSetOwner
  }
  | to_entries
  | map(select(.value != null))
  | map(select((.value | test("^0x[0-9a-fA-F]{40}$") | not)))
  | .[]
  | "\(.key)=\(.value)"
' "$CFG" 2>/dev/null || true)

if [ -n "$BAD_ROLES" ]; then
  echo "[live-json] FATAL: malformed role address(es):"
  echo "$BAD_ROLES"
  exit 1
fi

echo "[live-json] roles OK."
echo

VAL_COUNT=$(jq '.validators | length' "$CFG")
echo "[live-json] validators   = $VAL_COUNT"

echo "[live-json] checking validator rewardAddress + stakeVOID..."
BAD_VALS=$(jq -r '
  .validators
  | to_entries
  | map(
      select(
        (.value.rewardAddress | test("^0x[0-9a-fA-F]{40}$") | not)
        or
        ((.value.stakeVOID | tostring | test("^[0-9]+$") | not))
      )
      | "index=\(.key) rewardAddress=\(.value.rewardAddress // "<nil>") stakeVOID=\(.value.stakeVOID // "<nil>")"
    )
  | .[]
' "$CFG" 2>/dev/null || true)

if [ -n "$BAD_VALS" ]; then
  echo "[live-json] FATAL: malformed validator entries:"
  echo "$BAD_VALS"
  exit 1
fi

TOTAL_STAKE=$(jq -r '
  .validators
  | map(.stakeVOID | tonumber)
  | add // 0
' "$CFG")

echo "[live-json] total stakeVOID across validators = ${TOTAL_STAKE} VOID"
echo

echo "[live-json] basic validation PASSED."
echo "  - chainId == 2050"
echo "  - all roles have well-formed 0x addresses"
echo "  - all validators have well-formed rewardAddress and numeric stakeVOID"
echo
echo "Next steps:"
echo "  - Ensure totals match the mainnet tokenomics plan."
echo "  - Use this file only on tightly controlled machines."
