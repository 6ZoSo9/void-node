#!/usr/bin/env bash
set -euo pipefail
cd "$(git rev-parse --show-toplevel)" || exit 1

# Use tracked hooks directory
git config core.hooksPath ops/hooks

# Ensure hooks are executable
chmod +x ops/hooks/pre-push

echo "[ok] installed tracked hooks via: git config core.hooksPath ops/hooks"
echo "[ok] active hooksPath: $(git config --get core.hooksPath || true)"
