#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-$HOME/dev/void-node}"
CFG="${CFG:-config/void-mainnet-bootstrap-mainnet.live.json}"
ROLES_MAP="${ROLES_MAP:-/mnt/voidkey/meta/mainnet-roles-mapping.txt}"

cd "$REPO_ROOT"

echo "=== [wc-mainnet-roles-plan] VOID Work Credits mainnet roles plan ==="
echo "[cfg] REPO_ROOT = $REPO_ROOT"
echo "[cfg] CFG       = $CFG"
echo "[cfg] ROLES_MAP = $ROLES_MAP"
echo

if ! command -v jq >/dev/null 2>&1; then
  echo "[FATAL] jq is required but not found in PATH"
  exit 1
fi

if [ ! -f "$CFG" ]; then
  echo "[FATAL] live JSON not found: $CFG"
  exit 1
fi

echo "=== [1] WC-related roles from LIVE JSON ==="
jq -r '
  {
    wcGovernance:  .roles.wcGovernance,
    wcMinterAdmin: .roles.wcMinterAdmin,
    lpTreasury:    .roles.lpTreasury,
    relayerAdmin:  .roles.relayerAdmin
  }
' "$CFG"
echo

echo "=== [2] relayers array from LIVE JSON ==="
jq -r '
  .relayers // [] |
  map({name, address})
' "$CFG"
echo

if [ ! -f "$ROLES_MAP" ]; then
  echo "=== [3] roles mapping file not found ==="
  echo "[info] $ROLES_MAP does not exist (voidkey not mounted or file not created yet)."
  echo "[info] This is OK in PLAN phase; just means WC roles are JSON-only for now."
  echo
  echo "=== [wc-mainnet-roles-plan] done (no roles mapping present) ==="
  exit 0
fi

echo "=== [3] roles presence in roles-mapping file ==="

check_role() {
  local role="$1"
  if grep -qE "^[[:space:]]*${role}[[:space:]]" "$ROLES_MAP"; then
    echo "role=${role} -> PRESENT in roles-mapping"
  else
    echo "role=${role} -> MISSING in roles-mapping (PLAN: add when keys are ready)"
  fi
}

check_role "wcGovernance"
check_role "wcMinterAdmin"
check_role "lpTreasury"
check_role "relayerAdmin"

echo
echo "=== [wc-mainnet-roles-plan] done ==="
