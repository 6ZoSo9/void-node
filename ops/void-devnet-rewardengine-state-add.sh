#!/usr/bin/env bash
set -euo pipefail

# Add RewardEngine entry to docs/VOID-DEVNET-PROTOCOL-STATE.json in a safe, idempotent way.
#
# Usage:
#   REPO=~/dev/void-node \
#   REWARDENGINE_ADDR=0x1234... \
#   ops/void-devnet-rewardengine-state-add.sh
#
# Behavior:
#   - Requires REWARDENGINE_ADDR to be set to a valid 0x-address.
#   - Backs up the state JSON to *.bak.<timestamp>.
#   - Ensures .RewardEngine exists with at least { "address": "<addr>" }.
#   - If .RewardEngine already exists, it will REPLACE .RewardEngine.address with the new value
#     but leave other fields untouched.

REPO="${REPO:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
STATE_JSON="${STATE_JSON:-$REPO/docs/VOID-DEVNET-PROTOCOL-STATE.json}"

if [[ -z "${REWARDENGINE_ADDR:-}" ]]; then
  echo "[ERROR] REWARDENGINE_ADDR env var is required (0x… address)" >&2
  exit 1
fi

ADDR="$REWARDENGINE_ADDR"

if [[ ! "$ADDR" =~ ^0x[0-9a-fA-F]{40}$ ]]; then
  echo "[ERROR] REWARDENGINE_ADDR does not look like a valid EVM address: $ADDR" >&2
  exit 1
fi

if [[ ! -f "$STATE_JSON" ]]; then
  echo "[ERROR] devnet state JSON not found: $STATE_JSON" >&2
  exit 1
fi

STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP="${STATE_JSON}.bak.${STAMP}"

echo "[info] devnet state JSON: $STATE_JSON"
echo "[info] backup copy       : $BACKUP"
echo "[info] RewardEngine addr : $ADDR"

cp "$STATE_JSON" "$BACKUP"

TMP="${STATE_JSON}.tmp.$$"

jq --arg addr "$ADDR" '
  .RewardEngine = (
    .RewardEngine // {}
  ) |
  .RewardEngine.address = $addr
' "$STATE_JSON" > "$TMP"

mv "$TMP" "$STATE_JSON"

echo "[done] RewardEngine.address set in devnet state JSON"
