#!/usr/bin/env bash
set -euo pipefail

echo "[void-contracts] starting build..."

if ! command -v forge >/dev/null 2>&1; then
  echo "[ERR] forge (Foundry) not installed." >&2
  echo "[HINT] Install Foundry: https://book.getfoundry.sh/getting-started/installation" >&2
  exit 1
fi

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "[void-contracts] running: forge build"
forge build

echo "[void-contracts] build complete. Artifacts in ./out/"
