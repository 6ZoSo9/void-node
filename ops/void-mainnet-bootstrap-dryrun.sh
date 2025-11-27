#!/usr/bin/env bash
set -euo pipefail

ROOT="${HOME}/dev/void-node"
cd "${ROOT}"

echo "[bootstrap-dryrun] repo=${ROOT}"

if ! command -v forge >/dev/null 2>&1; then
  echo "[bootstrap-dryrun] ERROR: forge not found in PATH"
  exit 1
fi

echo "[bootstrap-dryrun] running forge compile for mainnet bootstrap script..."
# Keep it simple: compile the whole repo so the script + contracts are type-checked.
if ! forge compile; then
  echo "[bootstrap-dryrun] ERROR: forge compile failed"
  exit 1
fi

echo "[bootstrap-dryrun] OK (forge compile succeeded)"
