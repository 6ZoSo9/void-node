#!/usr/bin/env bash
set -euo pipefail

ROOT="${ROOT:-$HOME/dev/void-node}"
cd "$ROOT"

STATE="${STATE:-docs/VOID-DEVNET-PROTOCOL-STATE.json}"
PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

# shellcheck disable=SC1091
source ops/_void_prom_q.sh

echo "[datasets-ci] repo=$(pwd)"
echo "[datasets-ci] state=$(realpath -m "$STATE")"
echo "[datasets-ci] prom_url=$PROM_URL"

addr=""
if [ -f "$STATE" ]; then
  addr="$(jq -r '.DatasetRegistry.address // .contracts.DatasetRegistry.address // ""' "$STATE" 2>/dev/null || true)"
fi
echo "[datasets-ci] DatasetRegistry.address=$addr"

prom_health="$(prom_q 'max(void_datasets_devnet_health)')"
echo "[datasets-ci] prom: datasets_health=$prom_health"

if [[ ! "$addr" =~ ^0x[0-9a-fA-F]{40}$ ]]; then
  echo "[datasets-ci] NOTE: DatasetRegistry.address missing/invalid in state; Prom health is source of truth for devnet gate."
  if num_eq1 "$prom_health" >/dev/null 2>&1; then
    echo "[datasets-ci] RESULT: OK"
    exit 0
  fi
  echo "[datasets-ci] RESULT: FAIL (Prom datasets health != 1)"
  exit 2
fi

if num_eq1 "$prom_health" >/dev/null 2>&1; then
  echo "[datasets-ci] RESULT: OK"
  exit 0
fi

echo "[datasets-ci] RESULT: FAIL (Prom datasets health != 1)"
exit 2
