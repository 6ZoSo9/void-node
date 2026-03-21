#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

ROOT="${ROOT:-$HOME/dev/void-node}"
MAIN="${MAIN:-http://127.0.0.1:4100}"
FOLLOW="${FOLLOW:-http://127.0.0.1:4101}"
DATA_DIR_FOLLOW="${DATA_DIR_FOLLOW:-$ROOT/data_b}"

need() { command -v "$1" >/dev/null 2>&1 || { echo "[fail] missing command: $1" >&2; exit 1; }; }
need curl
need npx

say() { printf '\n=== %s ===\n' "$*"; }
get() { curl -fsS --max-time 5 "$1"; }
post() { curl -fsS --max-time 10 -X POST "$1"; }

say "preflight"
printf 'main health:    '; get "$MAIN/health"; echo
printf 'follower health:'; get "$FOLLOW/health"; echo

MAIN_HEAD_BEFORE="$(get "$MAIN/head.txt" || echo "-999")"
FOLLOW_HEAD_BEFORE="$(get "$FOLLOW/head.txt" || echo "-999")"

printf 'main head before:     %s\n' "$MAIN_HEAD_BEFORE"
printf 'follower head before: %s\n' "$FOLLOW_HEAD_BEFORE"

TS="$(date +%Y%m%d-%H%M%S)"
MEMO="smoke-$TS"

say "submit tx"
curl -fsS --max-time 10 \
  -H 'content-type: application/json' \
  -X POST "$MAIN/tx/submit" \
  --data "{\"from\":\"devA\",\"to\":\"devB\",\"amount\":1,\"memo\":\"$MEMO\"}"
echo

say "seal one real block"
post "$MAIN/__void/metrics/proposer.commit-direct.v2fs?max=5&empty=0"
echo

MAIN_HEAD_AFTER="$(get "$MAIN/head.txt" || echo "-999")"
printf 'main head after seal: %s\n' "$MAIN_HEAD_AFTER"

if [[ "$MAIN_HEAD_AFTER" == "$MAIN_HEAD_BEFORE" ]]; then
  echo "[fail] main head did not advance"
  exit 1
fi

say "pull follower once"
(
  cd "$ROOT"
  DATA_DIR="$DATA_DIR_FOLLOW" SRC="$MAIN" npx --yes tsx scripts/follower_once.ts
)

FOLLOW_HEAD_AFTER="$(get "$FOLLOW/head.txt" || echo "-999")"
printf 'follower head after pull: %s\n' "$FOLLOW_HEAD_AFTER"

say "result"
printf 'main:     %s\n' "$MAIN_HEAD_AFTER"
printf 'follower: %s\n' "$FOLLOW_HEAD_AFTER"

if [[ "$FOLLOW_HEAD_AFTER" != "$MAIN_HEAD_AFTER" ]]; then
  echo "[fail] follower did not catch up"
  exit 1
fi

echo "[ok] smoke passed"
