#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

BASE="${BASE:-${MAIN_BASE:-http://127.0.0.1:4100}}"
FOLLOWER_BASE="${FOLLOWER_BASE:-http://127.0.0.1:4101}"

pass() { echo "PASS: $1"; }
fail() { echo "FAIL: $1"; exit 1; }

echo "=== first-run: restart units ==="
systemctl --user restart void-node.service
systemctl --user restart void-follower-once.timer || true

echo
echo "=== first-run: settle main ==="
sleep 6
HEAD="$(curl -fsS --max-time 5 "${BASE}/head.txt" || true)"
[ -n "${HEAD:-}" ] || fail "main not responding"
echo "head=$HEAD"
pass "main responding"

echo
echo "=== first-run: preflight ==="
echo "=== preflight: repo ==="
[ -f package.json ] && [ -d src ] || fail "repo looks invalid"
pass "repo looks valid"
echo
echo "=== preflight: required scripts ==="
for f in \
  ops/demo-preflight.sh \
  ops/demo-smoke-main.sh \
  ops/demo-smoke-follower.sh \
  ops/install-path-status.sh
do
  [ -x "$f" ] || fail "required script missing: $f"
done
pass "required scripts present"
echo
echo "=== preflight: build inputs ==="
[ -f tsconfig.json ] || fail "tsconfig.json missing"
pass "build inputs present"
echo
echo "=== preflight: user units ==="
systemctl --user cat void-node.service >/dev/null 2>&1 || fail "void-node.service missing"
systemctl --user cat void-follower-once.timer >/dev/null 2>&1 || fail "void-follower-once.timer missing"
pass "systemd user units present"
echo
echo "=== preflight: port probe ==="
PORT="$(printf '%s\n' "$BASE" | sed -E 's#^http://[^:]+:([0-9]+).*$#\1#')"
ss -ltn "( sport = :$PORT )" | rg -q ":$PORT\b" || fail "port $PORT is not listening"
pass "port $PORT is listening"
echo
echo "=== preflight: service state ==="
systemctl --user is-enabled void-node.service >/dev/null 2>&1 || fail "void-node.service not enabled"
systemctl --user is-enabled void-follower-once.timer >/dev/null 2>&1 || fail "void-follower-once.timer not enabled"
pass "void-node.service enabled"
pass "void-follower-once.timer enabled"
echo
echo "=== preflight: HTTP probe ==="
curl -fsS --max-time 5 "${BASE}/head.txt" | sed 's/^/head=/'
pass "HTTP base responding"
echo
echo "=== preflight: final ==="
echo "PASS preflight"

echo
./ops/demo-smoke-main.sh

echo
echo "=== first-run: submit-path truth ==="
echo "=== submit path truth json ==="
curl -fsS --max-time 5 "${BASE}/__void/diag/submit_path_truth.json"
echo
echo
echo "=== submit path truth prom ==="
curl -fsS --max-time 5 "${BASE}/__void/metrics/submit_path_truth.prom" || true
echo
echo
echo "=== proposer status ==="
curl -fsS --max-time 5 "${BASE}/proposer/status"
echo
echo
echo "=== mempool truth ==="
curl -fsS --max-time 5 "${BASE}/mempool" || true
echo
echo

echo "=== first-run: follower smoke (http or oneshot) ==="
FOLLOWER_RUN_AS_USER="${FOLLOWER_RUN_AS_USER:-}" WC_BASE="${WC_BASE:-}" ./ops/demo-smoke-follower.sh

echo
echo "=== first-run: final truth ==="
curl -fsS --max-time 5 "${BASE}/proposer/status"
echo
curl -fsS --max-time 5 "${BASE}/__void/diag/submit_path_truth.json"
echo
echo "PASS first-run-smoke"
