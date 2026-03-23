#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

ROOT="${ROOT:-$HOME/dev/void-node}"
cd "$ROOT"

BASE="${BASE:-${MAIN_BASE:-http://127.0.0.1:4100}}"
WC_BASE="${WC_BASE:-http://127.0.0.1:4312/workcredits/devnet}"
ACCOUNT="${ACCOUNT:-demo-user}"

FOLLOWER_BASE="${FOLLOWER_BASE:-http://127.0.0.1:4111}"
FOLLOWER_DATA_DIR="${FOLLOWER_DATA_DIR:-$HOME/dev/void-node/data_b}"
FOLLOWER_RUN_AS_USER="${FOLLOWER_RUN_AS_USER:-}"
FOLLOWER_SYSTEMD_UNIT="${FOLLOWER_SYSTEMD_UNIT:-void-follower-once.service}"

say(){ printf '%s\n' "$*"; }

say "=== demo-video proof: install path status ==="
BASE="$BASE" \
MAIN_BASE="$BASE" \
FOLLOWER_BASE="$FOLLOWER_BASE" \
FOLLOWER_DATA_DIR="$FOLLOWER_DATA_DIR" \
FOLLOWER_RUN_AS_USER="$FOLLOWER_RUN_AS_USER" \
FOLLOWER_SYSTEMD_UNIT="$FOLLOWER_SYSTEMD_UNIT" \
./ops/install-path-status.sh

echo
say "=== demo-video proof: thin path ==="
BASE="$BASE" \
MAIN_BASE="$BASE" \
WC_BASE="$WC_BASE" \
ACCOUNT="$ACCOUNT" \
FOLLOWER_BASE="$FOLLOWER_BASE" \
FOLLOWER_DATA_DIR="$FOLLOWER_DATA_DIR" \
FOLLOWER_RUN_AS_USER="$FOLLOWER_RUN_AS_USER" \
FOLLOWER_SYSTEMD_UNIT="$FOLLOWER_SYSTEMD_UNIT" \
./ops/thin-path-proof.sh

echo
say "PASS demo-video-proof"
