#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)" || exit 1

# Canonical gate: run the pillars-lite flow (kept minimal on purpose).
exec bash ops/void-pillars-health-all.sh
