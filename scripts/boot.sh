#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd -- "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# ---- edit if your ports/paths differ ----
PROPOSER_HTTP=${PROPOSER_HTTP:-4100}
PROPOSER_P2P=${PROPOSER_P2P:-4700}
FOLLOWER_HTTP=${FOLLOWER_HTTP:-4101}
FOLLOWER_P2P=${FOLLOWER_P2P:-4702}

PROPOSER_DATA=${PROPOSER_DATA:-"${ROOT_DIR}/data"}
FOLLOWER_DATA=${FOLLOWER_DATA:-"${ROOT_DIR}/data1"}

PROPOSER_KEY=${PROPOSER_KEY:-"${ROOT_DIR}/.nodekey"}
FOLLOWER_KEY=${FOLLOWER_KEY:-"${ROOT_DIR}/.nodekey.b"}

ALLOW_EMPTY=${ALLOW_EMPTY:-0}
MAX_BLOB_MB=${MAX_BLOB_MB:-8}

wait_http() {
  local port="$1" tries="${2:-120}"
  for _ in $(seq 1 "$tries"); do
    curl -sf "http://127.0.0.1:${port}/api/health" >/dev/null && return 0
    sleep 0.5
  done
  echo "ERROR: http :${port} did not come up" >&2
  return 1
}

start_proposer() {
  echo "==> start proposer :${PROPOSER_HTTP} (p2p :${PROPOSER_P2P})"
  ( cd "$ROOT_DIR"
    npm run build >/dev/null 2>&1 || true
    VOID_DATA_DIR="$PROPOSER_DATA" \
    VOID_HTTP_PORT="$PROPOSER_HTTP" \
    VOID_P2P_PORT="$PROPOSER_P2P" \
    VOID_NODE_KEY_A="$PROPOSER_KEY" \
    ALLOW_EMPTY_BLOCKS="$ALLOW_EMPTY" \
    MAX_BLOB_MB="$MAX_BLOB_MB" \
    node dist/index.js \
  ) > /tmp/proposer.log 2>&1 &
  echo $! > /tmp/proposer.pid
  wait_http "$PROPOSER_HTTP"
}

start_follower() {
  echo "==> start follower :${FOLLOWER_HTTP} (p2p :${FOLLOWER_P2P})"
  ( cd "$ROOT_DIR"
    npm run build >/dev/null 2>&1 || true
    VOID_DATA_DIR="$FOLLOWER_DATA" \
    VOID_HTTP_PORT="$FOLLOWER_HTTP" \
    VOID_P2P_PORT="$FOLLOWER_P2P" \
    VOID_NODE_KEY_A="$FOLLOWER_KEY" \
    node dist/index.js \
  ) > /tmp/follower.log 2>&1 &
  echo $! > /tmp/follower.pid
  wait_http "$FOLLOWER_HTTP"
}

peers_handshake() {
  echo "==> peer handshake"
#   curl -sf "http://127.0.0.1:${PROPOSER_HTTP}/p2p/hello-now" >/dev/null || true
#   curl -sf "http://127.0.0.1:${FOLLOWER_HTTP}/p2p/hello-now" >/dev/null || true
}

kidx_build_all() {
  echo "==> build KIDX on follower"
  curl -sS -X POST "http://127.0.0.1:${FOLLOWER_HTTP}/index/kidx/build" | jq .
}

start_follow_sync() {
  echo "==> follower start (continuous)"
  curl -sS -X POST \
    "http://127.0.0.1:${FOLLOWER_HTTP}/follower/start?peer=http://127.0.0.1:${PROPOSER_HTTP}&intervalMs=1000" \
    | jq .
}

sanity() {
  echo "==> /api/health"
  curl -sS "http://127.0.0.1:${PROPOSER_HTTP}/api/health" | jq .
  curl -sS "http://127.0.0.1:${FOLLOWER_HTTP}/api/health" | jq .
  echo "==> /index/stats"
  curl -sS "http://127.0.0.1:${FOLLOWER_HTTP}/index/stats" | jq .
  echo "==> /metrics (peers/head)"
#   curl -sS "http://127.0.0.1:${PROPOSER_HTTP}/metrics" | grep -E 'peers_|head_number' || true
#   curl -sS "http://127.0.0.1:${FOLLOWER_HTTP}/metrics" | grep -E 'peers_|head_number' || true
}

case "${1:-up}" in
  up)
    start_proposer
    start_follower
    peers_handshake
    kidx_build_all
    start_follow_sync
    sanity
    ;;
  proposer) start_proposer ;;
  follower) start_follower ;;
  kidx)      kidx_build_all ;;
  once)      curl -sS -X POST "http://127.0.0.1:${FOLLOWER_HTTP}/follower/once?peer=http://127.0.0.1:${PROPOSER_HTTP}" | jq . ;;
#   seal)      curl -sS -X POST "http://127.0.0.1:${PROPOSER_HTTP}/blocks/once?allowEmpty=1" | jq . ;;
  tx)
    ( cd "$ROOT_DIR"
      npx tsx src/tx/make_tx.ts "{\"note\":\"boot-$(date +%s)\"}" | tee /tmp/tx.json
    )
    curl -sS -X POST "http://127.0.0.1:${PROPOSER_HTTP}/tx" \
      -H 'content-type: application/json' --data @/tmp/tx.json | jq .
    ;;
  lookup)
    HASH="$(jq -r .hash /tmp/tx.json | tr '[:upper:]' '[:lower:]')"
    curl -sS "http://127.0.0.1:${FOLLOWER_HTTP}/tx/lookup?hash=${HASH}" | jq .
    curl -sS "http://127.0.0.1:${FOLLOWER_HTTP}/tx/status?hash=${HASH}" | jq .
    ;;
  rcpt)      curl -sS "http://127.0.0.1:${FOLLOWER_HTTP}/receipts/stats" | jq . ;;
  stop)
    kill $(cat /tmp/proposer.pid 2>/dev/null) 2>/dev/null || true
    kill $(cat /tmp/follower.pid 2>/dev/null) 2>/dev/null || true
    ;;
  *) echo "usage: $0 {up|proposer|follower|kidx|once|seal|tx|lookup|rcpt|stop}"; exit 2 ;;
esac
