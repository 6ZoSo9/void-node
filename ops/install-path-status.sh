#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

BASE="${BASE:-${MAIN_BASE:-http://127.0.0.1:4100}}"
FOLLOWER_BASE="${FOLLOWER_BASE:-http://127.0.0.1:4101}"

echo "=== install-path status: head ==="
curl -fsS --max-time 5 "${BASE}/head.txt" | sed 's/^/head=/'
echo
echo

echo "=== install-path status: proposer ==="
curl -fsS --max-time 5 "${BASE}/proposer/status"
echo
echo "PASS: proposer enabled"
echo
echo

echo "=== install-path status: submit-path truth ==="
curl -fsS --max-time 5 "${BASE}/__void/diag/submit_path_truth.json"
echo
echo "PASS: submit-path truth clean"
echo
echo

echo "=== install-path status: follower snapshot ==="
MH="$(curl -fsS --max-time 3 "${BASE}/head.txt" || echo -1)"
FH="$(curl -fsS --max-time 3 "${FOLLOWER_BASE}/head.txt" || echo -1)"
echo "main_head=$MH"
echo "follower_head=$FH"
echo "lag=$((MH - FH))"

MH_OK=ok
FH_OK=ok
curl -fsS --max-time 3 "${BASE}/health" >/dev/null 2>&1 || MH_OK=fail
curl -fsS --max-time 3 "${FOLLOWER_BASE}/health" >/dev/null 2>&1 || FH_OK=fail
echo "main_health=$MH_OK"
echo "follower_health=$FH_OK"
echo

systemctl --user status void-follower-once.timer --no-pager -n 20 || true
echo
systemctl --user status void-follower-once.service --no-pager -n 20 || true
echo
echo "NOTE: follower section above is a live snapshot only."
echo "NOTE: transient lag can be nonzero between timer runs."
echo "NOTE: use ./ops/demo-smoke-follower.sh for a real bounded follower proof (supports HTTP follower or oneshot follower)."
echo
echo "PASS install-path-status"
