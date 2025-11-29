#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

echo "=== [mainnet-keys-checklist] VOID mainnet keys/devices checklist ==="
echo "[cfg] REPO_ROOT = $REPO_ROOT"
echo
echo "NOTE: This script is READ-ONLY."
echo "      It does NOT run cryptsetup, mount, or touch any block devices."
echo

EXIT=0

check_file() {
  local path="$1"
  local label="$2"
  if [[ -f "$path" ]]; then
    echo "[OK ] $label present at $path"
  else
    echo "[MISS] $label MISSING (expected at $path)"
    EXIT=1
  fi
}

echo "=== [1] Required docs present? ==="
check_file "ops/README-mainnet-keys-and-devices.md" "keys & devices layout doc"
check_file "ops/README-mainnet-plan-roles-and-keys.md" "PLAN roles+keys blueprint"

echo
echo "=== [2] Ops LUKS section status (placeholders vs filled) ==="
if grep -q 'TODO_FILL_OPS_LUKS_LABEL' ops/README-mainnet-keys-and-devices.md 2>/dev/null; then
  echo "[WARN] ops LUKS identifiers are still TODO_ placeholders."
  echo "       - When we are close to mainnet, edit ops/README-mainnet-keys-and-devices.md"
  echo "         on THIS machine only and fill:"
  echo "         * TODO_FILL_OPS_LUKS_LABEL"
  echo "         * TODO_FILL_OPS_LUKS_DEVICE"
  echo "         * TODO_FILL_OPS_LUKS_MOUNTPOINT"
else
  echo "[OK ] ops LUKS identifiers appear filled (no TODO_FILL_OPS_LUKS_ markers)."
fi

echo
echo "=== [3] Treasury / paper-only key reminder ==="
echo " - VoidTreasury / premine mnemonic MUST remain paper-only."
echo " - It must NOT be stored on the ops LUKS device or in this repo."
echo " - If we ever wire a hardware wallet for Treasury, document it in:"
echo "     ops/README-mainnet-keys-and-devices.md"

echo
echo "=== [4] Checklist summary ==="
if [[ "$EXIT" -eq 0 ]]; then
  echo "[OK ] mainnet keys/docs checklist passed (from this script's POV)."
else
  echo "[WARN] one or more items are missing; fix them before real mainnet bootstrap."
fi

exit "$EXIT"
