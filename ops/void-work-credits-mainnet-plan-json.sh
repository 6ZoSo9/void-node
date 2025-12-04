#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-$HOME/dev/void-node}"
CFG="${CFG:-config/void-mainnet-bootstrap-mainnet.live.json}"

cd "$REPO_ROOT"

echo "=== [wc-mainnet-plan-json] VOID Work Credits mainnet JSON shaping ==="
echo "[cfg] REPO_ROOT = $REPO_ROOT"
echo "[cfg] CFG       = $CFG"
echo

if [ ! -f "$CFG" ]; then
  echo "[FATAL] config file not found: $CFG"
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "[FATAL] jq is required but not found in PATH"
  exit 1
fi

echo "[1] backing up JSON before modifications..."
BACKUP="${CFG}.bak.$(date +%Y%m%d-%H%M%S)"
cp "$CFG" "$BACKUP"
echo "[1] backup written to: $BACKUP"
echo

echo "[2] ensuring WC / LLP / relayer roles keys exist (non-destructive)..."
TMP="$(mktemp)"

jq '
  # Ensure .roles exists
  .roles = (.roles // {}) |

  # Only fill in defaults when missing/null; never overwrite non-null values
  .roles.wcGovernance  = (.roles.wcGovernance  // "0x0000000000000000000000000000000000000000") |
  .roles.wcMinterAdmin = (.roles.wcMinterAdmin // "0x0000000000000000000000000000000000000000") |
  .roles.lpTreasury    = (.roles.lpTreasury    // "0x0000000000000000000000000000000000000000") |
  .roles.relayerAdmin  = (.roles.relayerAdmin  // "0x0000000000000000000000000000000000000000") |

  # Ensure a relayers array exists; do not overwrite if already present
  .relayers = (.relayers // [
    {
      "name": "relayer-1",
      "address": "0x0000000000000000000000000000000000000000"
    }
  ])
' "$CFG" > "$TMP"

mv "$TMP" "$CFG"
echo "[2] JSON updated (idempotent transform applied)."
echo

echo "[3] dumping WC-related roles from live JSON..."
jq -r '
  {
    wcGovernance:  .roles.wcGovernance,
    wcMinterAdmin: .roles.wcMinterAdmin,
    lpTreasury:    .roles.lpTreasury,
    relayerAdmin:  .roles.relayerAdmin
  }
' "$CFG"

echo
echo "[4] dumping relayers array..."
jq -r '
  .relayers // [] |
  map({name, address})
' "$CFG"

echo
echo "=== [wc-mainnet-plan-json] done ==="
