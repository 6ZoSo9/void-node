#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
CFG_DEFAULT="$REPO_ROOT/config/void-workcredits-devnet.template.json"
CFG="${1:-$CFG_DEFAULT}"

if [[ ! -f "$CFG" ]]; then
  echo "[workcredits-devnet-config] config file not found: $CFG" >&2
  exit 1
fi

echo "=== [workcredits-devnet-config] VOID WorkCredits devnet config dump ==="
echo "[cfg] REPO_ROOT = $REPO_ROOT"
echo "[cfg] CONFIG    = $CFG"
echo

jq '{
  chainId,
  network,
  rpcUrl,
  voidToken,
  workCreditsToken,
  lpPool,
  treasury,
  opsTreasury,
  notes
}' "$CFG"
