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
echo "Preferred public beta path:"
echo "./ops/public-beta-quickstart.sh"
echo "Equivalent:"
echo "make public-beta"
echo
echo "Manual step-by-step:"
echo "./ops/install-user-units.sh"
echo "./ops/first-run-smoke.sh"
echo
echo "Bounded proof gates:"
echo "make public-beta-preflight   # wallet proof + wallet identity smoke + runner safety"
echo "make wc-wallet-proof          # isolated wallet-specific WC proof only"
echo "make wc-trade-proof           # bounded relayer / redeem / trade proof"
echo "make datanet-mvp-proof        # bounded live manifest/chunk/receipt/WC proof"
echo "make beta-proof               # preflight + relayer trade proof + datanet mvp proof"
echo "make alienware-bootstrap      # sync + restart + verify node/helper/relayer role"
echo "make alienware-update         # update + restart + verify alienware role health"
echo "make precision-update         # update + restart + verify precision primary node"
echo "make alienware-remote-update  # run alienware updater remotely from precision"
echo "cat ops/SECOND_MACHINE_ONBOARDING.md  # proven second-machine bring-up runbook"
echo
echo "Live status:"
echo "make public-beta-status"
echo "./ops/install-path-status.sh"
echo
echo "Compatibility / optional:"
echo "./ops/demo-video-proof.sh"
echo "./ops/fresh-user-smoke.sh"
echo "./ops/clean-user-session-proof.sh"
echo
echo "PASS install-devbox"
