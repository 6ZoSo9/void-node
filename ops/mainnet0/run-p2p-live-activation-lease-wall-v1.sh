#!/usr/bin/env bash
set -euo pipefail
umask 077

if [[ "${VOID_P2P_LIVE_ACTIVATION_LEASE_WALL_ENABLED:-0}" != "1" ]]; then
  echo "VOID_P2P_LIVE_ACTIVATION_LEASE_WALL_V1_DISABLED" >&2
  exit 78
fi
if [[ "${VOID_P2P_ACTIVATION_PERMIT_WALL_ENABLED:-0}" != "1" ]]; then
  echo "VOID_P2P_LIVE_ACTIVATION_LEASE_WALL_V1_ACTIVATION_GATE_DISABLED" >&2
  exit 78
fi
if [[ "${VOID_P2P_TRUST_POLICY_WALL_ENABLED:-0}" != "1" ]]; then
  echo "VOID_P2P_LIVE_ACTIVATION_LEASE_WALL_V1_TRUST_GATE_DISABLED" >&2
  exit 78
fi
if [[ "${VOID_P2P_EDGE_WALL_ENABLED:-0}" != "1" ]]; then
  echo "VOID_P2P_LIVE_ACTIVATION_LEASE_WALL_V1_EDGE_GATE_DISABLED" >&2
  exit 78
fi

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
exec "$ROOT/node_modules/.bin/tsx" \
  "$ROOT/src/p2p/run_live_activation_lease_wall_v1.ts" serve
