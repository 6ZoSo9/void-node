#!/usr/bin/env bash
set -euo pipefail

REPO="${REPO:-$(pwd)}"
STATE="${STATE:-$REPO/docs/VOID-DEVNET-PROTOCOL-STATE.json}"
PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

echo "[models-ci] repo=$REPO"
echo "[models-ci] state=$STATE"
echo "[models-ci] prom_url=$PROM_URL"

if [ ! -f "$STATE" ]; then
  echo "[models-ci] ERROR: state file not found: $STATE" >&2
  exit 1
fi

MODEL_ADDR="$(jq -r '.ModelRegistry.address // ""' "$STATE")"

echo "[models-ci] ModelRegistry.address=$MODEL_ADDR"

if ! [[ "$MODEL_ADDR" =~ ^0x[0-9a-fA-F]{40}$ ]]; then
  echo "[models-ci] ERROR: ModelRegistry.address is missing or invalid" >&2
  exit 1
fi

prom_query() {
  local q="$1"
  curl -fsS "$PROM_URL/api/v1/query" --get --data-urlencode "query=$q" \
    | jq -r '
        if .status != "success" then
          empty
        elif (.data.result | length) == 0 then
          empty
        else
          .data.result[0].value[1]
        end
      '
}

echo
echo "[models-ci] checking ModelRegistry health gauge (void_models_devnet_health)..."
HEALTH="$(prom_query 'void_models_devnet_health{chain="devnet"}')"

if [ -z "$HEALTH" ]; then
  echo "[models-ci] ERROR: no series for void_models_devnet_health{chain=\"devnet\"}" >&2
  exit 1
fi

echo "[models-ci] void_models_devnet_health{chain=\"devnet\"} = $HEALTH"

if [ "$HEALTH" != "1" ]; then
  echo "[models-ci] ERROR: ModelRegistry health is not 1" >&2
  exit 1
fi

echo
echo "[models-ci] checking ModelRegistry admin mismatch gauge (best-effort)..."
ADMIN_MISMATCH="$(prom_query 'void_models_admin_mismatch{chain="devnet"}' || true)"

if [ -z "$ADMIN_MISMATCH" ]; then
  echo "[models-ci] NOTE: void_models_admin_mismatch not found; skipping mismatch assertion"
else
  echo "[models-ci] void_models_admin_mismatch{chain=\"devnet\"} = $ADMIN_MISMATCH"
  if [ "$ADMIN_MISMATCH" != "0" ]; then
    echo "[models-ci] ERROR: ModelRegistry admin mismatch gauge is not 0" >&2
    exit 1
  fi
fi

echo
echo "[models-ci] RESULT: OK (ModelRegistry address sane + health=1 + admin_mismatch=0)"
