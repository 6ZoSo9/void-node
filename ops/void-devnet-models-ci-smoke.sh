#!/usr/bin/env bash
set -euo pipefail

ROOT="${ROOT:-$HOME/dev/void-node}"
cd "$ROOT"

STATE="${STATE:-docs/VOID-DEVNET-PROTOCOL-STATE.json}"
PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

# shellcheck disable=SC1091
source ops/_void_prom_q.sh

echo "[models-ci] repo=$(pwd)"
echo "[models-ci] state=$(realpath -m "$STATE")"
echo "[models-ci] prom_url=$PROM_URL"

addr=""
if [ -f "$STATE" ]; then
  addr="$(jq -r '.ModelRegistry.address // .contracts.ModelRegistry.address // ""' "$STATE" 2>/dev/null || true)"
fi
echo "[models-ci] ModelRegistry.address=$addr"

# Source of truth for devnet gate: Prom health gauge.
# If state is missing address, do NOT fail; rely on Prom.
prom_health="$(prom_q 'max(void_models_devnet_health)')"
echo "[models-ci] prom: models_health=$prom_health"

if [[ ! "$addr" =~ ^0x[0-9a-fA-F]{40}$ ]]; then
  echo "[models-ci] NOTE: ModelRegistry.address missing/invalid in state; Prom health is source of truth for devnet gate."
  if num_eq1 "$prom_health" >/dev/null 2>&1; then
    echo "[models-ci] RESULT: OK"
    exit 0
  fi
  echo "[models-ci] RESULT: FAIL (Prom models health != 1)"
  exit 2
fi

# If address exists, still require Prom to be healthy (devnet gate)
if num_eq1 "$prom_health" >/dev/null 2>&1; then
  echo "[models-ci] RESULT: OK"
  exit 0
fi

echo "[models-ci] RESULT: FAIL (Prom models health != 1)"
exit 2
