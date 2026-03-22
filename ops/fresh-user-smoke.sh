#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

ROOT="${ROOT:-$HOME/dev/void-node}"

pass(){ echo "PASS: $*"; }
fail(){ echo "FAIL: $*"; exit 1; }

echo "=== fresh-user-smoke: repo ==="
cd "$ROOT"
test -d .git || fail "not in repo"
test -f ops/FRESH_HOST_RUNBOOK.md || fail "runbook missing"
test -f ops/install-devbox-ubuntu.sh || fail "install-devbox missing"
test -f ops/install-user-units.sh || fail "install-user-units missing"
test -f ops/first-run-smoke.sh || fail "first-run-smoke missing"
pass "repo + thin path files present"

echo
echo "=== fresh-user-smoke: current user basics ==="
id
systemctl --user daemon-reload >/dev/null 2>&1 || fail "systemd --user unavailable"
pass "systemd --user works"

echo
echo "=== fresh-user-smoke: installer dry reality ==="
command -v node >/dev/null 2>&1 || fail "node missing"
command -v npm  >/dev/null 2>&1 || fail "npm missing"
command -v git  >/dev/null 2>&1 || fail "git missing"
echo "node=$(node -v)"
echo "npm=$(npm -v)"
pass "toolchain present"

echo
echo "=== fresh-user-smoke: runbook command presence ==="
for f in \
  ops/install-all.sh \
  ops/install-devbox-ubuntu.sh \
  ops/install-user-units.sh \
  ops/install-path-status.sh \
  ops/demo-preflight.sh \
  ops/demo-smoke-main.sh \
  ops/demo-smoke-follower.sh \
  ops/post-install-demo.sh \
  ops/fresh-user-smoke.sh \
  ops/first-run-smoke.sh
do
  test -x "$f" || fail "missing executable $f"
done
pass "all referenced scripts executable"

echo "=== fresh-user-smoke: units present ==="
systemctl --user cat void-node.service >/dev/null 2>&1 || fail "void-node.service missing"
systemctl --user cat void-follower-once.service >/dev/null 2>&1 || fail "void-follower-once.service missing"
systemctl --user cat void-follower-once.timer >/dev/null 2>&1 || fail "void-follower-once.timer missing"
pass "units installed"

echo
echo "=== fresh-user-smoke: first-run smoke ==="
./ops/first-run-smoke.sh
pass "first-run smoke passed"

echo
echo "PASS fresh-user-smoke"
