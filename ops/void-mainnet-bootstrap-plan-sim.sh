#!/usr/bin/env bash
set -euo pipefail

# Lightweight structural sanity for the real mainnet PLAN config.
# No RPC, no forge, just JSON invariants.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

CONFIG_PATH="${CONFIG_PATH:-$REPO_ROOT/config/void-mainnet-bootstrap-mainnet.live.json}"

echo "=== [plan-sim] VOID mainnet PLAN invariants ==="
echo "[plan-sim] REPO_ROOT   = $REPO_ROOT"
echo "[plan-sim] CONFIG_PATH = $CONFIG_PATH"
echo

if [[ ! -f "$CONFIG_PATH" ]]; then
  echo "[plan-sim] ERROR: config file not found: $CONFIG_PATH" >&2
  echo "[plan-sim] RESULT: NOT READY (no_config)"
  exit 1
fi

# 1) chainId must be 2050 (string or number)
if ! jq -e '(.chainId | tostring) == "2050"' "$CONFIG_PATH" >/dev/null 2>&1; then
  echo "[plan-sim] ERROR: chainId is not 2050 in config" >&2
  echo "[plan-sim] RESULT: NOT READY (bad_chainId)"
  exit 1
fi
echo "[plan-sim] OK: chainId == 2050"

# 2) core roles must be real, non-zero, non-placeholder 0x addresses
ROLES_OK=0
if jq -e '
  [
    .roles.deployer,
    .roles.treasuryAdmin,
    .roles.opsTreasury,
    .roles.updateGateAdmin,
    .roles.configGateAdmin,
    .roles.rewardAdmin
  ] 
  | all(
      type=="string"
      and test("^0x[0-9a-fA-F]{40}$")
      and . != "0x0000000000000000000000000000000000000000"
      and (contains("<")|not)
      and (contains(">")|not)
    )
' "$CONFIG_PATH" >/dev/null 2>&1; then
  ROLES_OK=1
fi

if [[ "$ROLES_OK" -ne 1 ]]; then
  echo "[plan-sim] ERROR: one or more core roles are missing, zero, or placeholders" >&2
  echo "[plan-sim]   expected good 0x addresses for:"
  echo "[plan-sim]     roles.deployer"
  echo "[plan-sim]     roles.treasuryAdmin"
  echo "[plan-sim]     roles.opsTreasury"
  echo "[plan-sim]     roles.updateGateAdmin"
  echo "[plan-sim]     roles.configGateAdmin"
  echo "[plan-sim]     roles.rewardAdmin"
  echo "[plan-sim] RESULT: NOT READY (bad_roles)"
  exit 1
fi
echo "[plan-sim] OK: core roles look like real mainnet addresses"

echo
echo "[plan-sim] RESULT: OK (PLAN config structurally ready)"
exit 0
