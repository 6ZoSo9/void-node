#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-$HOME/dev/void-node}"
cd "$REPO_ROOT"

echo "=== [work-credits-dev] VOID Work Credits dev wiring simulation ==="
echo "[info] REPO_ROOT = $REPO_ROOT"
echo

forge script script/VoidWorkCreditsDev.s.sol:VoidWorkCreditsDev -vv
