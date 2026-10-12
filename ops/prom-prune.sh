#!/usr/bin/env bash
set -euo pipefail
KEEP="${1:-10}"
cd "$(dirname "$0")/prom-snap" 2>/dev/null || exit 0
mapfile -t DIRS < <(ls -1d 20* 2>/dev/null | sort)
COUNT=${#DIRS[@]}
if (( COUNT > KEEP )); then
  DEL=$((COUNT-KEEP))
  printf 'Pruning %d old snapshots…\n' "$DEL"
  printf '%s\0' "${DIRS[@]:0:DEL}" | xargs -0 rm -rf --
fi
