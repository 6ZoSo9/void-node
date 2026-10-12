#!/usr/bin/env bash
set -euo pipefail
HOST="${1:-127.0.0.1:4100}"
base="http://$HOST"

echo "== hello-now =="
curl -sS "$base/p2p/hello-now" | jq . || true

echo "== peers =="
curl -sS "$base/p2p/peers" | jq . || true

echo "== metrics (head/peers) =="
curl -sS "$base/metrics" | grep -E '(void_head_number|void_peers_connected)' || true
