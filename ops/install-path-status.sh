#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

BASE="${BASE:-http://127.0.0.1:4100}"
ROOT="${ROOT:-$HOME/dev/void-node}"

cd "$ROOT"

pass(){ echo "PASS: $*"; }
fail(){ echo "FAIL: $*"; exit 1; }

echo "=== install-path status: head ==="
HEAD_TXT="$(curl -fsS --max-time 5 "$BASE/head.txt")"
echo "head=$HEAD_TXT"

echo
echo "=== install-path status: proposer ==="
PROP="$(curl -fsS --max-time 5 "$BASE/proposer/status")"
echo "$PROP"
echo "$PROP" | grep -q '"enabled":true' || fail "proposer not enabled"
pass "proposer enabled"

echo
echo "=== install-path status: submit-path truth ==="
TRUTH="$(curl -fsS --max-time 5 "$BASE/__void/diag/submit_path_truth.json")"
echo "$TRUTH"
echo "$TRUTH" | grep -q '"node_txQueue_size":0' || fail "node_txQueue not zero"
echo "$TRUTH" | grep -q '"global___void_tx_queue_size":0' || fail "global tx queue not zero"
echo "$TRUTH" | grep -q '"legacy_global_queue_is_noise":true' || fail "legacy queue truth missing"
pass "submit-path truth clean"

echo
echo "=== install-path status: follower ==="
./ops/void-follower-status.sh

echo
echo "PASS install-path-status"
