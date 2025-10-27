#!/usr/bin/env bash
set -euo pipefail
FOLLOW_HOST="${1:-127.0.0.1:4101}"
PEER_URL="${2:-http://127.0.0.1:4100}"
INTERVAL="${3:-1000}"

base="http://$FOLLOW_HOST"

echo "== dial peer on follower =="
curl -sS -X POST "$base/p2p/dial" -H 'content-type: application/json' -d "{"peer":"$PEER_URL"}" | jq . || true

echo "== start follower =="
curl -sS -X POST "$base/follower/start?peer=$PEER_URL&intervalMs=$INTERVAL" | jq . || true

echo "== status =="
curl -sS "$base/follower/status" | jq . || true
