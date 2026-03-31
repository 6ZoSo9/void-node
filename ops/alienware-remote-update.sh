#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

ALIEN_HOST="${ALIEN_HOST:-zoso@100.122.79.39}"
REMOTE_REPO="${REMOTE_REPO:-\$HOME/dev/void-node}"
REMOTE_SCRIPT="${REMOTE_SCRIPT:-ops/alienware-update-node-helper-relayer.sh}"

need() { command -v "$1" >/dev/null 2>&1 || { echo "[fail] missing $1" >&2; exit 1; }; }
need bash
need ssh

echo "=== [0] remote target ==="
echo "host=$ALIEN_HOST"
echo "repo=$REMOTE_REPO"
echo "script=$REMOTE_SCRIPT"
echo

ssh -t "$ALIEN_HOST" "bash -lc '
set -euo pipefail
set +H
set +o histexpand

cd \"$REMOTE_REPO\"
git fetch origin
git reset --hard origin/main
bash \"$REMOTE_SCRIPT\"
'"
