#!/usr/bin/env bash
set -euo pipefail

# Machine-friendly WorkCredits devnet market JSON.
# This is the canonical format Obelisk Trading View will consume.
#
# Internally uses ops/workcredits/void-workcredits-devnet-snapshot.sh
# and extracts the JSON object from its output.

SNAP_RAW="$(ops/workcredits/void-workcredits-devnet-snapshot.sh)"

SNAP_JSON="$(
  printf '%s\n' "$SNAP_RAW" \
  | awk '
      /^[[:space:]]*{\s*$/ { in_json=1 }
      in_json { print }
      /^[[:space:]]*}\s*$/ && in_json { exit }
    '
)"

if [[ -z "$SNAP_JSON" ]]; then
  echo "error: failed to extract JSON from snapshot output" >&2
  exit 1
fi

printf '%s\n' "$SNAP_JSON"
