#!/usr/bin/env bash
set -euo pipefail
for p in 5173 5174; do
  fuser -k "${p}/tcp" 2>/dev/null || true
done
pkill -f "vite" 2>/dev/null || true
echo "[ok] killed vite + freed 5173/5174"
