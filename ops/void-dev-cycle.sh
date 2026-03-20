#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

ROOT="${ROOT:-$HOME/dev/void-node}"
cd "$ROOT"

MAIN="${MAIN:-http://127.0.0.1:4100}"
AMOUNT="${AMOUNT:-1}"
FROM="${FROM:-devA}"
TO="${TO:-devB}"
MEMO="${MEMO:-cycle-$(date +%Y%m%d-%H%M%S)}"

curl -fsS --max-time 10 \
  -H 'content-type: application/json' \
  -X POST "$MAIN/tx/submit" \
  --data "{\"from\":\"$FROM\",\"to\":\"$TO\",\"amount\":$AMOUNT,\"memo\":\"$MEMO\"}"
echo

"$ROOT/ops/void-main-commit.sh"
"$ROOT/ops/void-follow-once.sh"
"$ROOT/ops/void-follower-status.sh"
