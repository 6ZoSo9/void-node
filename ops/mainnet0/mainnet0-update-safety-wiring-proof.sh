#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

echo "=== mainnet0 update safety wiring proof ==="

FILES=(
  "ops/mainnet0-go-no-go-with-validator-lifecycle.sh"
  "ops/mainnet0-launch-readiness.sh"
)

echo
echo "=== [1] required files exist ==="
for f in "${FILES[@]}"; do
  test -f "$f"
  echo "[ok] $f exists"
done

echo
echo "=== [2] Makefile target exists ==="
grep -q '^mainnet0-update-safety-proof:' Makefile
grep -n '^mainnet0-update-safety-proof:' Makefile
echo "[ok] mainnet0-update-safety-proof Make target exists"

echo
echo "=== [3] wrappers call update safety gate ==="
for f in "${FILES[@]}"; do
  bash -n "$f"
  grep -q 'make mainnet0-update-safety-proof' "$f"
  grep -n 'mainnet0-update-safety-proof' "$f"
  echo "[ok] $f calls update safety gate"
done

echo
echo "=== [4] update safety script syntax ==="
bash -n ops/mainnet0/mainnet0-update-safety-proof.sh
echo "[ok] mainnet0 update safety proof syntax valid"

echo
echo "=== [5] ready/update status smoke ==="
curl -fsS http://127.0.0.1:4100/__void/ready.json
echo
curl -fsS http://127.0.0.1:4100/__void/update/notification-status.json
echo

echo
echo "[ok] mainnet0 update safety wiring proof green"
