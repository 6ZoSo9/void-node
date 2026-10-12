#!/usr/bin/env bash
set -euo pipefail

PATTERN="${VOID_PUBLIC_NODE_PROCESS_PATTERN:-tsx src/index.ts|src/index.ts}"
PID="${VOID_PUBLIC_NODE_PID:-$(pgrep -f "$PATTERN" | tail -n 1 || true)}"

echo "=== VOID Public Node Local Data Drop Route DATA_DIR Detect v1 ==="
echo "marker=VOID_PUBLIC_NODE_LOCAL_DATA_DROP_ROUTE_DATA_DIR_DETECT_V1"
echo "head=$(git rev-parse --short HEAD)"
echo "no_build=true"
echo "no_import=true"
echo "no_mutation=true"

if [ -z "${PID:-}" ]; then
  echo "error=no_public_node_process_found"
  exit 1
fi

CWD="$(readlink "/proc/$PID/cwd" 2>/dev/null || true)"
DATA_DIR="$(tr '\0' '\n' < "/proc/$PID/environ" 2>/dev/null | sed -n 's/^DATA_DIR=//p' | tail -n 1)"
VOID_DATA_DIR="$(tr '\0' '\n' < "/proc/$PID/environ" 2>/dev/null | sed -n 's/^VOID_DATA_DIR=//p' | tail -n 1)"

if [ -z "$DATA_DIR" ] && [ -n "$VOID_DATA_DIR" ]; then
  DATA_DIR="$VOID_DATA_DIR"
fi

if [ -z "$DATA_DIR" ]; then
  echo "error=no_DATA_DIR_or_VOID_DATA_DIR_found"
  echo "pid=$PID"
  echo "cwd=$CWD"
  exit 1
fi

echo "pid=$PID"
echo "cwd=$CWD"
echo "route_data_dir=$DATA_DIR"
echo "route_objects_dir=$DATA_DIR/public-node/local-data-drop/objects"
echo "route_receipts_dir=$DATA_DIR/public-node/local-data-drop/receipts"

test -d "$DATA_DIR/public-node/local-data-drop/objects"
test -d "$DATA_DIR/public-node/local-data-drop/receipts"

echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_ROUTE_DATA_DIR_DETECT_V1_READY"
