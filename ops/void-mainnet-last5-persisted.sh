#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/dev/void-node"
BASE="http://127.0.0.1:4100"

echo "=== [last 5 blocks persisted txs] ==="
HEAD=$(curl -fsS "$BASE/blocks/latest/number2.json" | jq -r '.number')
echo "HEAD = $HEAD"

for n in $(seq $((HEAD-4)) "$HEAD"); do
  echo "--- dev/blocks/$n/txs/persisted ---"
  curl -fsS "$BASE/dev/blocks/$n/txs/persisted" | jq .
done
