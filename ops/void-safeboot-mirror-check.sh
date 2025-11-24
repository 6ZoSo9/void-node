#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/dev/void-node"

MAIN=${MAIN:-http://127.0.0.1:4100}
SAFE=${SAFE:-http://127.0.0.1:4104}

echo "[mirror] MAIN=$MAIN SAFE=$SAFE"

echo
echo "=== [1] heads ==="
main_head="$(curl -fsS "$MAIN/head.txt" || echo "")"
safe_head="$(curl -fsS "$SAFE/head.txt" || echo "")"
echo "[main] head = ${main_head:-[ERR]}"
echo "[safe] head = ${safe_head:-[ERR]}"

if [[ -z "$main_head" || -z "$safe_head" ]]; then
  echo "[mirror] ERROR: failed to read one or both heads"
  exit 1
fi

echo
echo "=== [2] /blocks/0/header3 equality ==="
main_h0="$(curl -fsS "$MAIN/blocks/0/header3" || echo "")"
safe_h0="$(curl -fsS "$SAFE/blocks/0/header3" || echo "")"

if [[ -z "$main_h0" || -z "$safe_h0" ]]; then
  echo "[mirror] ERROR: failed to fetch /blocks/0/header3 from MAIN or SAFE"
  exit 1
fi

if [[ "$main_h0" != "$safe_h0" ]]; then
  echo "[mirror] MISMATCH: /blocks/0/header3 differs between MAIN and SAFE"
  echo "[main] $main_h0"
  echo "[safe] $safe_h0"
  echo "[RESULT] BAD (header3 JSON mismatch)"
  exit 1
fi

echo "[mirror] OK: /blocks/0/header3 JSON identical"

echo
echo "=== [3] header3.prom match & health ==="
main_prom="$(curl -fsS "$MAIN/__void/metrics/header3.prom" | sed -n 's/[[:space:]]\+$//;/^void_header3_match/p' || true)"
safe_prom="$(curl -fsS "$SAFE/__void/metrics/header3.prom" | sed -n 's/[[:space:]]\+$//;/^void_header3_match/p' || true)"

echo "[main] void_header3_match line: ${main_prom:-[NONE]}"
echo "[safe] void_header3_match line: ${safe_prom:-[NONE]}"

if [[ -z "$main_prom" || -z "$safe_prom" ]]; then
  echo "[mirror] ERROR: missing void_header3_match line on MAIN or SAFE"
  echo "[RESULT] BAD (no header3.prom match line)"
  exit 1
fi

if [[ "$main_prom" != "$safe_prom" ]]; then
  echo "[mirror] MISMATCH: header3.prom match lines differ"
  echo "[RESULT] BAD (header3.prom mismatch)"
  exit 1
fi

if [[ "$safe_prom" != *" 1" ]]; then
  echo "[mirror] ERROR: header3_match is not 1 on SAFE"
  echo "[RESULT] BAD (header3_match != 1)"
  exit 1
fi

echo "[mirror] OK: header3.prom mirror + match=1"

echo
echo "[RESULT] OK (safeboot header3 mirror to main is healthy)"
