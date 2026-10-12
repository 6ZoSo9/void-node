#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd -P)"
cd "$ROOT"

if [[ "${VOID_P2P_ACTIVATION_PERMIT_WALL_ENABLED:-0}" != "1" ]]; then
  echo "VOID_P2P_NODE_BOUND_ACTIVATION_PERMIT_WALL_V1_DISABLED" >&2
  exit 78
fi
if [[ "${VOID_P2P_TRUST_POLICY_WALL_ENABLED:-0}" != "1" ]]; then
  echo "VOID_P2P_NODE_BOUND_ACTIVATION_PERMIT_WALL_V1_TRUST_GATE_DISABLED" >&2
  exit 78
fi
if [[ "${VOID_P2P_EDGE_WALL_ENABLED:-0}" != "1" ]]; then
  echo "VOID_P2P_NODE_BOUND_ACTIVATION_PERMIT_WALL_V1_EDGE_GATE_DISABLED" >&2
  exit 78
fi

TSX="$ROOT/node_modules/.bin/tsx"
if [[ ! -x "$TSX" ]]; then
  echo "HOLD: local tsx executable is missing; run npm ci in $ROOT" >&2
  exit 1
fi

exec "$TSX" src/p2p/run_node_bound_activation_permit_wall_v1.ts serve
