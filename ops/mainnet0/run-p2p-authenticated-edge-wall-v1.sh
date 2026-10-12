#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd -P)"
cd "$ROOT"

if [[ "${VOID_P2P_EDGE_WALL_ENABLED:-0}" != "1" ]]; then
  echo "VOID_P2P_AUTHENTICATED_EDGE_WALL_V1_DISABLED" >&2
  exit 78
fi

TSX="$ROOT/node_modules/.bin/tsx"
if [[ ! -x "$TSX" ]]; then
  echo "HOLD: local tsx executable is missing; run npm ci in $ROOT" >&2
  exit 1
fi

exec "$TSX" src/p2p/run_authenticated_edge_wall_v1.ts
