#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_NODE_DIR:-$HOME/dev/void-node}"

OUT_DIR="${OUT_DIR:-$PWD/ops/out}"
LOG_DIR="${LOG_DIR:-$OUT_DIR/logs}"
STAMP_FILE="${STAMP_FILE:-$OUT_DIR/pick2-isolated-proof.last_run_epoch}"
LATEST_LOG="${LATEST_LOG:-$OUT_DIR/pick2-isolated-proof.latest.out}"
PROOF_DIR="${PROOF_DIR:-/tmp/void-pick2-fairness-proof}"

mkdir -p "$OUT_DIR" "$LOG_DIR"

RUN_ID="$(date +%Y%m%d-%H%M%S)"
TMP_LOG="$(mktemp)"

cleanup() {
  rm -f "$TMP_LOG"
}
trap cleanup EXIT

TOKEN="${TOKEN:-${VOID_AGENT_TOKEN:-}}"
: "${TOKEN:?TOKEN or VOID_AGENT_TOKEN must be set in environment for ops/two-box-pick2-fairness-proof.sh}"

BASE="${BASE:-${PUBLIC_HTTP_BASE:-http://100.93.2.116:4100}}"

set +e
{
  echo "=== pick2 isolated proof runner ==="
  echo "run_id=$RUN_ID"
  echo "ts_utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "pwd=$PWD"
  echo "base=$BASE"
  echo

  export TOKEN RUN_ID BASE
  bash ops/two-box-pick2-fairness-proof.sh
} >"$TMP_LOG" 2>&1
rc=$?
set -e

cp -f "$TMP_LOG" "$LATEST_LOG"
cp -f "$TMP_LOG" "$LOG_DIR/pick2-isolated-proof.$RUN_ID.out"
date +%s > "$STAMP_FILE"

if [ $rc -ne 0 ]; then
  echo "[fail] runner failed; see $LATEST_LOG" >&2
  exit $rc
fi

test -f "$PROOF_DIR/picks.jsonl"
test -s "$PROOF_DIR/picks.jsonl"

echo "[ok] latest log: $LATEST_LOG"
echo "[ok] proof output: $PROOF_DIR/picks.jsonl"
