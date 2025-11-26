#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

echo "[keys-preflight] repo=$(pwd)"
echo "[keys-preflight] OK (stub preflight; future checks can be added here)"
exit 0
