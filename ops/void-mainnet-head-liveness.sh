#!/usr/bin/env bash
set -euo pipefail

echo "[head-liveness] repo=$(pwd)"

MAIN_URL="${MAIN_URL:-http://127.0.0.1:4100}"

get_head() {
  curl -fsS "${MAIN_URL}/blocks/latest/number2.json" \
    | jq -r '.number'
}

echo "[head-liveness] MAIN_URL=${MAIN_URL}"

HEAD_1="$(get_head)"
echo "[head-liveness] head_1=${HEAD_1}"

SLEEP_SECS="${SLEEP_SECS:-10}"
echo "[head-liveness] sleeping ${SLEEP_SECS}s..."
sleep "${SLEEP_SECS}"

HEAD_2="$(get_head)"
echo "[head-liveness] head_2=${HEAD_2}"

# bash-safe integer diff
if [[ "${HEAD_2}" =~ ^[0-9]+$ && "${HEAD_1}" =~ ^[0-9]+$ ]]; then
  DIFF=$((HEAD_2 - HEAD_1))
else
  echo "[head-liveness] ERROR: non-numeric head values: head_1=${HEAD_1}, head_2=${HEAD_2}"
  exit 1
fi

echo "[head-liveness] diff=${DIFF}"

if (( DIFF > 0 )); then
  echo "[head-liveness] RESULT: OK (head advanced by ${DIFF} blocks)"
  exit 0
else
  echo "[head-liveness] RESULT: BAD (head did not advance)"
  exit 1
fi
