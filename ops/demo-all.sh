#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

ROOT="${ROOT:-$HOME/dev/void-node}"
cd "$ROOT"

echo "NOTE: ops/demo-all.sh is now a legacy compatibility wrapper."
echo "NOTE: canonical proof path is ./ops/thin-path-proof.sh"
echo

exec ./ops/thin-path-proof.sh
