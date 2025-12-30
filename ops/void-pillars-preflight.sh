#!/usr/bin/env bash
set -euo pipefail
cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)" || exit 1

# Canonical gate (current): pillars-lite health-all
exec bash ops/void-pillars-health-all.sh
