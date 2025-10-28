#!/usr/bin/env bash
set -euo pipefail
pkill -f "tsx scripts/dev_proposer.ts"  || true
pkill -f "tsx scripts/debug_http.ts"    || true
pkill -f "tsx scripts/follower_once.ts" || true
echo "[down] stopped proposer/debug/follower sidecars."
