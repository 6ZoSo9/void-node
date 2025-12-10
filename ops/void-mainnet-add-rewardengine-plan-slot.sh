#!/usr/bin/env bash
set -euo pipefail

# Add a RewardEngine slot to config/void-mainnet-bootstrap-mainnet.live.json
# in a safe, idempotent way.
#
# Behavior:
#   - Backs up the live JSON once per run (timestamped).
#   - Ensures .contracts exists.
#   - Ensures .contracts.RewardEngine exists with at least:
#       { "address": "0x0000000000000000000000000000000000000000" }
#   - If .contracts.RewardEngine already exists, it is left as-is (no overwrite).

REPO="${REPO:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
LIVE_JSON="${LIVE_JSON:-$REPO/config/void-mainnet-bootstrap-mainnet.live.json}"

if [[ ! -f "$LIVE_JSON" ]]; then
  echo "[ERROR] live plan JSON not found: $LIVE_JSON" >&2
  exit 1
fi

STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP="${LIVE_JSON}.bak.${STAMP}"

echo "[info] live plan JSON: $LIVE_JSON"
echo "[info] backup copy   : $BACKUP"

cp "$LIVE_JSON" "$BACKUP"

TMP="${LIVE_JSON}.tmp.$$"

jq '
  .contracts = (.contracts // {}) |
  .contracts.RewardEngine = (
    .contracts.RewardEngine // {
      address: "0x0000000000000000000000000000000000000000"
    }
  )
' "$LIVE_JSON" > "$TMP"

mv "$TMP" "$LIVE_JSON"

echo "[done] RewardEngine slot ensured in .contracts.RewardEngine (address may still be 0x0)"
