#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

fail(){ echo "FAIL: $*" >&2; exit 1; }
need_file(){ [ -f "$1" ] || fail "missing file: $1"; }
need_absent(){ [ ! -e "$1" ] || fail "retired path present: $1"; }
need_exec(){ [ -x "$1" ] || fail "not executable: $1"; }

echo "=== beta-proof guards: files ==="
for f in \
  Makefile \
  PUBLIC_BETA.md \
  README.md \
  ops/public-beta-quickstart.sh \
  ops/public-beta-preflight.sh \
  ops/wc-wallet-isolated-proof.sh \
  ops/install-path-status.sh \
  ops/install-user-units.sh \
  ops/install-devbox-ubuntu.sh \
  ops/first-run-smoke.sh \
  ops/BETA_BASELINE_2026-03-23.md \
  ops/SELF_HOSTED_BETA_CI_PLAN.md
do
  need_file "$f"
done

echo "=== beta-proof guards: executables ==="
for f in \
  ops/public-beta-quickstart.sh \
  ops/public-beta-preflight.sh \
  ops/wc-wallet-isolated-proof.sh \
  ops/install-path-status.sh \
  ops/install-user-units.sh \
  ops/install-devbox-ubuntu.sh \
  ops/first-run-smoke.sh
do
  need_exec "$f"
done

echo "=== beta-proof guards: make targets ==="
grep -q '^\.PHONY: wc-wallet-proof$' Makefile || fail "missing .PHONY wc-wallet-proof"
grep -q '^wc-wallet-proof:$' Makefile || fail "missing wc-wallet-proof target"
grep -q '^\.PHONY: public-beta-preflight$' Makefile || fail "missing .PHONY public-beta-preflight"
grep -q '^public-beta-preflight:$' Makefile || fail "missing public-beta-preflight target"
grep -q '^\.PHONY: public-beta-status$' Makefile || fail "missing .PHONY public-beta-status"
grep -q '^public-beta-status:$' Makefile || fail "missing public-beta-status target"
grep -q '^\.PHONY: public-beta$' Makefile || fail "missing .PHONY public-beta"
grep -q '^public-beta:$' Makefile || fail "missing public-beta target"

echo "=== beta-proof guards: shell syntax ==="
bash -n \
  ops/public-beta-quickstart.sh \
  ops/public-beta-preflight.sh \
  ops/wc-wallet-isolated-proof.sh \
  ops/install-path-status.sh \
  ops/install-user-units.sh \
  ops/install-devbox-ubuntu.sh \
  ops/first-run-smoke.sh

echo "=== beta-proof guards: expected command wiring ==="
grep -q 'make public-beta-preflight' ops/public-beta-quickstart.sh || fail "quickstart missing preflight"
grep -q './ops/demo-video-proof.sh' ops/public-beta-quickstart.sh || fail "quickstart missing demo-video-proof"
grep -q 'make wc-wallet-proof' ops/public-beta-preflight.sh || fail "preflight missing wc-wallet-proof"
grep -q 'datanet/v1/publish' ops/wc-wallet-isolated-proof.sh || fail "wallet proof missing publish step"
grep -q 'datanet/v1/fetch' ops/wc-wallet-isolated-proof.sh || fail "wallet proof missing fetch step"
grep -q 'datanet/v1/receipt' ops/wc-wallet-isolated-proof.sh || fail "wallet proof missing receipt step"

echo "=== beta-proof guards: docs mention green path ==="
grep -q 'make public-beta-status' PUBLIC_BETA.md || fail "PUBLIC_BETA missing public-beta-status"
grep -q 'make public-beta-preflight' PUBLIC_BETA.md || fail "PUBLIC_BETA missing public-beta-preflight"
grep -q 'make wc-wallet-proof' PUBLIC_BETA.md || fail "PUBLIC_BETA missing wc-wallet-proof"
grep -q './ops/public-beta-quickstart.sh' PUBLIC_BETA.md || fail "PUBLIC_BETA missing quickstart"
grep -q 'make public-beta-status' README.md || fail "README missing public-beta-status"
grep -q 'make public-beta-preflight' README.md || fail "README missing public-beta-preflight"
grep -q 'make wc-wallet-proof' README.md || fail "README missing wc-wallet-proof"

echo "=== beta-proof guards: baseline doc ==="
grep -q 'VOID Node Beta Baseline' ops/BETA_BASELINE_2026-03-23.md || fail "baseline doc missing title"
grep -q 'make public-beta-status' ops/BETA_BASELINE_2026-03-23.md || fail "baseline doc missing status command"
grep -q 'make public-beta-preflight' ops/BETA_BASELINE_2026-03-23.md || fail "baseline doc missing preflight command"
grep -q 'make wc-wallet-proof' ops/BETA_BASELINE_2026-03-23.md || fail "baseline doc missing wallet proof command"

echo "=== beta-proof guards: retired self-hosted workflow ==="
need_absent .github/workflows/self-hosted-beta-proof.yml
grep -q 'VOID_SELF_HOSTED_BETA_CI_RETIRED_V1' ops/SELF_HOSTED_BETA_CI_PLAN.md || fail "self-hosted beta retirement record missing marker"
grep -q '^Status: retired$' ops/SELF_HOSTED_BETA_CI_PLAN.md || fail "self-hosted beta retirement record missing status"
grep -q 'SELF_HOSTED_BETA_CI_PLAN.md' README.md || fail "README missing retired self-hosted beta CI record"

echo "PASS beta-proof-guards"
