#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

ROOT="${ROOT:-$HOME/dev/void-node}"

pass(){ echo "PASS: $*"; }
info(){ echo "INFO: $*"; }
fail(){ echo "FAIL: $*"; exit 1; }

cd "$ROOT"

echo "=== install-devbox: platform ==="
test -f /etc/os-release || fail "/etc/os-release missing"
. /etc/os-release
echo "ID=${ID:-unknown}"
echo "VERSION_ID=${VERSION_ID:-unknown}"

echo
echo "=== install-devbox: required commands ==="
command -v bash >/dev/null 2>&1 || fail "bash missing"
command -v git >/dev/null 2>&1 || fail "git missing"
command -v npm >/dev/null 2>&1 || fail "npm missing"
command -v node >/dev/null 2>&1 || fail "node missing"
command -v systemctl >/dev/null 2>&1 || fail "systemctl missing"
pass "required commands present"

echo
echo "=== install-devbox: versions ==="
echo "node=$(node -v)"
echo "npm=$(npm -v)"

echo
echo "=== install-devbox: dirs ==="
mkdir -p "$ROOT"
mkdir -p "$ROOT/.secrets"
mkdir -p "$ROOT/data_a"
mkdir -p "$ROOT/data_b"
mkdir -p "$ROOT/ops"
pass "dirs ensured"

echo
echo "=== install-devbox: npm install ==="
npm install
pass "npm install complete"

echo
echo "=== install-devbox: build ==="
npm run build
pass "build complete"

echo
echo "=== install-devbox: systemd user check ==="
systemctl --user daemon-reload >/dev/null 2>&1 || fail "systemd --user unavailable"
pass "systemd user mode available"

echo
echo "=== install-devbox: next ==="
echo "1) install/update user units"
echo "2) restart main node"
echo "3) run demo-preflight"
echo "4) run install-path-status (live snapshot)"
echo "5) run demo-smoke-follower (bounded follower proof)"
echo "6) run post-install-demo"
echo "7) run fresh-user-smoke"
echo
echo "PASS install-devbox"
