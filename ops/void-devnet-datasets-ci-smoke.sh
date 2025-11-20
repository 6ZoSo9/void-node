#!/usr/bin/env bash
set -euo pipefail

REPO="${REPO:-$(pwd)}"
STATE="${STATE:-$REPO/docs/VOID-DEVNET-PROTOCOL-STATE.json}"
PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

echo "[datasets-ci] repo=$REPO"
echo "[datasets-ci] state=$STATE"
echo "[datasets-ci] prom_url=$PROM_URL"

if [ ! -f "$STATE" ]; then
  echo "[datasets-ci] ERROR: state file not found: $STATE" >&2
  exit 1
fi

DATASET_ADDR="$(jq -r '.DatasetRegistry.address // ""' "$STATE")"

echo "[datasets-ci] DatasetRegistry.address=$DATASET_ADDR"

if ! [[ "$DATASET_ADDR" =~ ^0x[0-9a-fA-F]{40}$ ]]; then
  echo "[datasets-ci] ERROR: DatasetRegistry.address is missing or invalid" >&2
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
echo "[datasets-ci] checking DatasetRegistry health gauge (void_datasets_devnet_health)..."
HEALTH="$(prom_query 'void_datasets_devnet_health{chain="devnet"}')"

if [ -z "$HEALTH" ]; then
  echo "[datasets-ci] ERROR: no series for void_datasets_devnet_health{chain=\"devnet\"}" >&2
  exit 1
fi

echo "[datasets-ci] void_datasets_devnet_health{chain=\"devnet\"} = $HEALTH"

if [ "$HEALTH" != "1" ]; then
  echo "[datasets-ci] ERROR: DatasetRegistry health is not 1" >&2
  exit 1
fi

echo
echo "[datasets-ci] checking DatasetRegistry total gauge (best-effort)..."
TOTAL="$(prom_query 'void_datasets_devnet_total{chain=\"devnet\"}' || true)"

if [ -z "$TOTAL" ]; then
  echo "[datasets-ci] NOTE: void_datasets_devnet_total not found; skipping total assertion"
else
  echo "[datasets-ci] void_datasets_devnet_total{chain=\"devnet\"} = $TOTAL"
fi

echo
echo "[datasets-ci] RESULT: OK (DatasetRegistry address sane + health=1)"
