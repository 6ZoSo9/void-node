#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

ROOT="${ROOT:-$HOME/dev/void-node}"
cd "$ROOT"

DATA_DIR="${DATA_DIR:-$ROOT/data_b}"
SRC="${SRC:-http://127.0.0.1:4100}"

DATA_DIR="$DATA_DIR" SRC="$SRC" npx --yes tsx scripts/follower_once.ts
