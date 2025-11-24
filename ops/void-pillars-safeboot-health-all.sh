#!/usr/bin/env bash
set -euo pipefail

# Run from repo root
cd "$(dirname "$0")/.."

echo "=== [pillars+safe] step 1: mainnet pillars health ==="
./ops/void-mainnet-health-all.sh

echo
echo "=== [pillars+safe] step 2: safeboot health ==="
./ops/void-safeboot-health.sh

echo
echo "[RESULT] OK (mainnet pillars + safeboot all healthy)"
