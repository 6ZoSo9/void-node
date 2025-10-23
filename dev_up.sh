#!/usr/bin/env bash
set -euo pipefail

# kill leftovers
pkill -f "tsx scripts/debug_http.ts"    || true
pkill -f "tsx scripts/follower_once.ts" || true
pkill -f "tsx scripts/dev_proposer.ts"  || true

mkdir -p logs

echo "[up] starting proposer -> data_a"
nohup env DATA_DIR=data_a INTERVAL_MS=500 \
  npx tsx scripts/dev_proposer.ts > logs/proposer_a.log 2>&1 &

echo "[up] serving data_a on :4300"
nohup env DATA_DIR=data_a HTTP_PORT=4300 \
  npx tsx scripts/debug_http.ts > logs/debug_a.log 2>&1 &

echo "[up] serving data_b on :4301"
nohup env DATA_DIR=data_b HTTP_PORT=4301 \
  npx tsx scripts/debug_http.ts > logs/debug_b.log 2>&1 &

# tiny readiness helper (waits up to ~5s for each port)
wait_http() {
  local port="$1"
  for i in {1..50}; do
    curl -sf "http://127.0.0.1:${port}/api/health" >/dev/null && return 0
    sleep 0.1
  done
  return 1
}

echo "[up] waiting for :4300 and :4301 to come up…"
wait_http 4300 || { echo "[up] ERROR: :4300 not up"; exit 1; }
wait_http 4301 || { echo "[up] ERROR: :4301 not up"; exit 1; }
echo "[up] both servers are up."

echo "[up] follower loop: data_b <= data_a"
nohup bash -c '
  while true; do
    SRC=http://127.0.0.1:4300 DATA_DIR=data_b npx tsx scripts/follower_once.ts
    sleep 2
  done
' > logs/follower_b.log 2>&1 &

echo "[up] done. tails:"
echo "  tail -f logs/proposer_a.log"
echo "  tail -f logs/debug_a.log"
echo "  tail -f logs/debug_b.log"
echo "  tail -f logs/follower_b.log"
