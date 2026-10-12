#!/usr/bin/env bash
set -euo pipefail

SRC="${1:-/tmp/void-live-import-demo-001-src}"
DETECT_OUT="/tmp/void-local-data-drop-route-data-dir-detect.out"

echo "=== VOID Public Node Local Data Drop Live Import Target Plan v1 ==="
echo "marker=VOID_PUBLIC_NODE_LOCAL_DATA_DROP_LIVE_IMPORT_TARGET_PLAN_V1"
echo "head=$(git rev-parse --short HEAD)"
echo "no_build=true"
echo "no_import=true"
echo "no_mutation=true"

test -d "$SRC"

bash ops/mainnet0/public-node-local-data-drop-route-data-dir-detect.sh > "$DETECT_OUT"

ROUTE_DATA_DIR="$(sed -n 's/^route_data_dir=//p' "$DETECT_OUT" | tail -n 1)"
if [ -z "$ROUTE_DATA_DIR" ]; then
  echo "error=no_route_data_dir_detected"
  exit 1
fi

SOURCE_COUNT="$(find "$SRC" -maxdepth 1 -type f | wc -l | tr -d ' ')"
CURRENT_COUNT="$(curl -fsS --max-time 5 "${VOID_PUBLIC_NODE_BASE:-http://127.0.0.1:4100}/public-node/local-data-drop/weighted.json" \
  | python3 -c 'import json,sys; print(json.load(sys.stdin).get("object_count"))')"

echo "source_dir=$SRC"
echo "source_file_count=$SOURCE_COUNT"
echo "route_data_dir=$ROUTE_DATA_DIR"
echo "current_live_object_count=$CURRENT_COUNT"
echo "planned_import_command=DATA_DIR=\"$ROUTE_DATA_DIR\" bash ops/mainnet0/public-node-local-data-drop-import-dir.sh \"$SRC\""
echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_LIVE_IMPORT_TARGET_PLAN_V1_READY"
