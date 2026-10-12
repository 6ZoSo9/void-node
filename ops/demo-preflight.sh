#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

ROOT="${ROOT:-$HOME/dev/void-node}"
BASE="${BASE:-http://127.0.0.1:4100}"
HTTP_PORT="${HTTP_PORT:-4100}"
FOLLOW_TIMER="${FOLLOW_TIMER:-void-follower-once.timer}"
FOLLOW_SERVICE="${FOLLOW_SERVICE:-void-follower-once.service}"

cd "$ROOT"

pass(){ echo "PASS: $*"; }
fail(){ echo "FAIL: $*"; exit 1; }

echo "=== preflight: repo ==="
test -d .git || fail "not in repo"
test -f package.json || fail "package.json missing"
pass "repo looks valid"

echo
echo "=== preflight: required scripts ==="
for f in \
  ops/autoprop-smoke.sh \
  ops/submit-path-truth-smoke.sh \
  ops/void-follow-once.sh \
  ops/void-follower-status.sh \
  ops/demo-bootstrap.sh \
  ops/demo-start-main.sh \
  ops/demo-smoke-main.sh \
  ops/demo-smoke-follower.sh \
  ops/demo-all.sh
do
  test -f "$f" || fail "missing $f"
done
pass "required scripts present"

echo
echo "=== preflight: build inputs ==="
test -f tsconfig.build.json || fail "tsconfig.build.json missing"
test -d src || fail "src missing"
pass "build inputs present"

echo
echo "=== preflight: user units ==="
systemctl --user cat void-node.service >/dev/null 2>&1 || fail "void-node.service missing"
systemctl --user cat "$FOLLOW_TIMER" >/dev/null 2>&1 || fail "$FOLLOW_TIMER missing"
systemctl --user cat "$FOLLOW_SERVICE" >/dev/null 2>&1 || fail "$FOLLOW_SERVICE missing"
pass "systemd user units present"

echo
echo "=== preflight: port probe ==="
if ss -ltn "( sport = :$HTTP_PORT )" | tail -n +2 | grep -q .; then
  pass "port $HTTP_PORT is listening"
else
  echo "INFO: port $HTTP_PORT not listening yet (acceptable before demo-start-main)"
fi

echo
echo "=== preflight: service state ==="
systemctl --user is-enabled void-node.service >/dev/null 2>&1 && pass "void-node.service enabled" || echo "INFO: void-node.service not enabled"
systemctl --user is-enabled "$FOLLOW_TIMER" >/dev/null 2>&1 && pass "$FOLLOW_TIMER enabled" || echo "INFO: $FOLLOW_TIMER not enabled"

echo
echo "=== preflight: HTTP probe ==="
if curl -fsS --max-time 2 "$BASE/head.txt" >/dev/null 2>&1; then
  H="$(curl -fsS --max-time 3 "$BASE/head.txt")"
  echo "head=$H"
  pass "HTTP base responding"
else
  echo "INFO: $BASE not up yet (acceptable before demo-start-main)"
fi

echo
echo "=== preflight: final ==="
echo "PASS preflight"
