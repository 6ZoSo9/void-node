#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

ROOT="${ROOT:-$HOME/dev/void-node}"

cd "$ROOT"

pass(){ echo "PASS: $*"; }
fail(){ echo "FAIL: $*"; exit 1; }

echo "=== first-run: restart units ==="
systemctl --user daemon-reload
systemctl --user restart void-node.service
systemctl --user restart void-follower-once.timer

echo
echo "=== first-run: settle main ==="
ok=0
for _ in $(seq 1 30); do
  if curl -fsS --max-time 2 http://127.0.0.1:4100/head.txt >/dev/null 2>&1; then
    ok=1
    break
  fi
  sleep 1
done
[ "$ok" = "1" ] || fail "main node did not come up on :4100"
echo "head=$(curl -fsS --max-time 3 http://127.0.0.1:4100/head.txt)"
pass "main responding"

echo
echo "=== first-run: preflight ==="
./ops/demo-preflight.sh

echo
echo "=== first-run: main smoke ==="
./ops/demo-smoke-main.sh

echo
echo "=== first-run: submit-path truth ==="
./ops/submit-path-truth-smoke.sh

echo
echo "=== first-run: follower smoke ==="
./ops/demo-smoke-follower.sh

echo
echo "=== first-run: final truth ==="
curl -fsS --max-time 5 http://127.0.0.1:4100/proposer/status ; echo
curl -fsS --max-time 5 http://127.0.0.1:4100/__void/diag/submit_path_truth.json ; echo

echo
echo "PASS first-run-smoke"
