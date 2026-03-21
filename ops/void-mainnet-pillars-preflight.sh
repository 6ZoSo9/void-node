#!/usr/bin/env bash
set -euo pipefail
cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)" || exit 1

# Back-compat alias: old name -> current preflight gate
exec bash ops/void-pillars-preflight.sh
