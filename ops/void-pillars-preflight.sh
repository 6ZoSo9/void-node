#!/usr/bin/env bash
set -euo pipefail

# === DataNet MVP gate (added 2026-01-11) ===
cd "$HOME/dev/void-node" || exit 1
bash ops/bin/datanet-mvp-pillars-check.sh


cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)" || exit 1

# Canonical gate: run the pillars-lite flow (kept minimal on purpose).
exec bash ops/void-pillars-health-all.sh
