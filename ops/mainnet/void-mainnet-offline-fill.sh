#!/usr/bin/env bash
set -euo pipefail

MAP_SRC="${1:-}"
LIVE_OUT="${2:-config/void-mainnet-bootstrap-mainnet.live.json}"

if [[ -z "$MAP_SRC" ]]; then
  echo "usage: $0 /absolute/path/to/filled-roles-mapping.txt [live-json-out]"
  exit 1
fi

[[ -f "$MAP_SRC" ]] || { echo "[FAIL] missing mapping: $MAP_SRC"; exit 1; }

echo "=== [1] generate live json from offline mapping ==="
ops/mainnet/void-mainnet-live-from-roles.sh "$MAP_SRC" "$LIVE_OUT"

echo
echo "=== [2] strict placeholder lint ==="
ops/mainnet/void-mainnet-config-lint.sh "$LIVE_OUT"

echo
echo "=== [3] mainnet preflight ==="
ops/mainnet/void-mainnet-preflight.sh "$MAP_SRC" "$LIVE_OUT"

echo
echo "[ok] offline fill flow passed"
echo "[ok] live json: $LIVE_OUT"
