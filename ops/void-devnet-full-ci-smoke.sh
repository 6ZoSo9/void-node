#!/usr/bin/env bash
set -euo pipefail

REPO="${REPO:-$(pwd)}"
PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

echo "[full-ci] repo=$REPO"
echo "[full-ci] prom_url=$PROM_URL"
echo

run_step() {
  local name="$1"
  local cmd="$2"

  echo "[full-ci] === step: $name ==="
  echo "[full-ci] running: $cmd"
  echo

  # shellcheck disable=SC2086
  eval "$cmd"

  echo
  echo "[full-ci] >>> $name OK"
  echo
}

run_step "devnet jobs/receipts + coverage" "./ops/void-devnet-ci-smoke.sh"
run_step "AgentRegistry CI smoke"          "./ops/void-devnet-agent-ci-smoke.sh"
run_step "ModelRegistry CI smoke"          "./ops/void-devnet-models-ci-smoke.sh"
run_step "DatasetRegistry CI smoke"        "./ops/void-devnet-datasets-ci-smoke.sh"

echo "[full-ci] RESULT: OK (devnet jobs, coverage, AgentRegistry, ModelRegistry, DatasetRegistry all healthy)"
