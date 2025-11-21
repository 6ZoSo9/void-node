#!/usr/bin/env bash
set -euo pipefail

REPO="${REPO:-$(pwd)}"
echo "[pillars-preflight] repo=$REPO"

run_step() {
  local name="$1"
  shift
  echo
  echo "[pillars-preflight] === step: $name ==="
  "$@"
}

run_step "safeboot health-all"      ./ops/void-safeboot-health-all.sh
run_step "devnet health-all"        ./ops/void-devnet-health-all.sh
run_step "mainnet-core health-all"  ./ops/void-mainnet-core-health-all.sh
run_step "pillars health-all"       ./ops/void-pillars-health-all.sh

echo
echo "[pillars-preflight] RESULT: OK (safeboot + devnet + mainnet-core + pillars all healthy)"
