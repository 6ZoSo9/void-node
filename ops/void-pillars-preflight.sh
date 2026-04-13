#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO"


# === DataNet MVP gate (added 2026-01-11) ===
cd "$HOME/dev/void-node" || exit 1
bash "$REPO/ops/bin/datanet-mvp-pillars-check.sh"


cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)" || exit 1

# Canonical gate: run the pillars-lite flow (kept minimal on purpose).
exec bash "$REPO/ops/void-pillars-health-all.sh"
