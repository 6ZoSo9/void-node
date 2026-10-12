#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd -P)"
NODE_BASE="${VOID_NODE_BASE:-http://127.0.0.1:4100}"
EXPECTED_PEERS="${VOID_PARTICIPANT_EXPECTED_PEER_COUNT:-1}"
OUTPUT="${VOID_PUBLIC_EARN_NODE_OBSERVER_FLOOR_OUTPUT:-}"

NODE_RUNTIME="$(command -v node || true)"
if [ -z "$NODE_RUNTIME" ] || [ ! -x "$NODE_RUNTIME" ]; then
  echo "HOLD: Node.js runtime not found" >&2
  exit 1
fi

NODE_MAJOR="$($NODE_RUNTIME -p 'process.versions.node.split(".")[0]')"
if [ "$NODE_MAJOR" != "22" ]; then
  echo "HOLD: Node.js 22 is required; found major $NODE_MAJOR" >&2
  exit 1
fi

RUN_DIR="$(mktemp -d "${TMPDIR:-/tmp}/void-public-earn-node-observer-floor-v1.XXXXXX")"
cleanup() {
  rm -rf -- "$RUN_DIR"
}
trap cleanup EXIT

RAW_REPORT="$RUN_DIR/node-observer.json"

"$NODE_RUNTIME" \
  "$ROOT/tools/void-public-earn-validator-onboarding-v1.mjs" \
  node-check \
  --node-base "$NODE_BASE" \
  --expected-peer-count "$EXPECTED_PEERS" \
  >"$RAW_REPORT"

ARGS=(
  "$ROOT/tools/void-public-earn-node-observer-floor-v1.mjs"
  --report "$RAW_REPORT"
  --expected-peer-count "$EXPECTED_PEERS"
)
if [ -n "$OUTPUT" ]; then
  ARGS+=(--output "$OUTPUT")
fi

"$NODE_RUNTIME" "${ARGS[@]}"
