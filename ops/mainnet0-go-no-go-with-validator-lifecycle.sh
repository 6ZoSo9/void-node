#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"

RUN_EXISTING="${RUN_MAINNET0_EXISTING_GONO:-0}"

echo "=== Mainnet-0 go/no-go with validator lifecycle ==="
echo "run_existing=$RUN_EXISTING"

if [ "$RUN_EXISTING" = "1" ]; then
  if grep -q '^mainnet0-go-no-go-with-runtime:' Makefile; then
    echo "=== [existing] make mainnet0-go-no-go-with-runtime ==="
    make mainnet0-go-no-go-with-runtime
  elif grep -q '^mainnet0-go-no-go-bundle:' Makefile; then
    echo "=== [existing] make mainnet0-go-no-go-bundle ==="
    make mainnet0-go-no-go-bundle
  else
    echo "[ERR] no existing Mainnet-0 go/no-go target found"
    exit 1
  fi
else
  echo "[skip] existing Mainnet-0 go/no-go bundle not run; set RUN_MAINNET0_EXISTING_GONO=1 to include it"
fi

echo
echo "=== [validator lifecycle] make mainnet0-validator-lifecycle-preflight ==="
make mainnet0-validator-lifecycle-preflight

echo
echo "[ok] Mainnet-0 go/no-go validator lifecycle wrapper green"
