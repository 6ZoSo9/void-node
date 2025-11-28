#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/dev/void-node"

CFG="${1:-config/void-mainnet-bootstrap-dev.json}"

echo "=== VOID mainnet config preview (jq) ==="
echo "[preview] config path: $CFG"
echo

if [ ! -f "$CFG" ]; then
  echo "[preview] FATAL: config file not found: $CFG" >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "[preview] FATAL: jq not found on PATH" >&2
  exit 1
fi

jq -r '
  "path       : " + input_filename,
  "chainId    : " + ((.chainId // "<missing>") | tostring),
  "networkName: " + (.networkName // "<missing>"),
  "",
  "roles:",
  "  adminGateOwner    = "    + (.roles.adminGateOwner    // "<nil>"),
  "  updateGateOwner   = "    + (.roles.updateGateOwner   // "<nil>"),
  "  configGateOwner   = "    + (.roles.configGateOwner   // "<nil>"),
  "  treasuryOwner     = "    + (.roles.treasuryOwner     // "<nil>"),
  "  opsTreasuryOwner  = "    + (.roles.opsTreasuryOwner  // "<nil>"),
  "  rewardEngineOwner = "    + (.roles.rewardEngineOwner // "<nil>"),
  "  validatorSetOwner = "    + (.roles.validatorSetOwner // "<nil>"),
  "",
  "validators (" + (((.validators // []) | length) | tostring) + "):",
  (
    (.validators // [])
    | to_entries[]
    | [
        "  [" + (.key | tostring) + "]",
        "    id           = " + (.value.id           // "<empty>"),
        "    rewardAddr   = " + (.value.rewardAddress // "<nil>"),
        "    stakeVOID    = " + ((.value.stakeVOID // "<nil>") | tostring),
        "    consensusKey = " + (if (.value.consensusKey // null) == null then "<empty>" else "<bytes>" end)
      ]
    | .[]
  )
' "$CFG"

echo
echo "=== END config preview ==="
