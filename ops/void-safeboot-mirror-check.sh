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
  echo "[RESULT] BAD (cannot read heads)"
  exit 1
fi

echo
echo "=== [2] /blocks/0/header3 equality ==="
main_h0="$(curl -fsS "$MAIN/blocks/0/header3" || echo "")"
safe_h0="$(curl -fsS "$SAFE/blocks/0/header3" || echo "")"

if [[ -z "$main_h0" || -z "$safe_h0" ]]; then
  echo "[mirror] ERROR: failed to fetch /blocks/0/header3 from MAIN or SAFE"
  echo "[RESULT] BAD (header3 fetch failure)"
  exit 1
fi

if [[ "$main_h0" != "$safe_h0" ]]; then
  echo "[mirror] MISMATCH: /blocks/0/header3 differs between MAIN and SAFE"
  echo "[main] $main_h0"
  echo "[safe] $safe_h0"
  echo
  echo "[RESULT] BAD (header3 JSON mismatch)"
  exit 1
fi

echo "[mirror] OK: /blocks/0/header3 JSON identical"
json_ok=1

echo
echo "=== [3] header3.prom inspection (no hard fail on safeboot) ==="
main_prom="$(curl -fsS "$MAIN/__void/metrics/header3.prom" \
  | sed -n 's/[[:space:]]\+$//;/^void_header3_match/p' | head -n1 || true)"
safe_prom="$(curl -fsS "$SAFE/__void/metrics/header3.prom" \
  | sed -n 's/[[:space:]]\+$//;/^void_header3_match/p' | head -n1 || true)"

echo "[main] void_header3_match line: ${main_prom:-[NONE]}"
echo "[safe] void_header3_match line: ${safe_prom:-[NONE]}"

metric_status="UNKNOWN"

if [[ -z "$safe_prom" ]]; then
  echo "[mirror] WARN: safeboot header3.prom missing (likely not exported under safeboot)"
  metric_status="WARN-missing"
elif [[ "$safe_prom" == *" 1" ]]; then
  echo "[mirror] OK: safeboot header3_match == 1"
  metric_status="OK"
elif [[ "$safe_prom" == 'void_header3_match{number="-1"} 0' ]]; then
  echo "[mirror] WARN: safeboot header3_match sentinel (-1,0) -> relying on MAIN txroot3/header3 exporters"
  metric_status="WARN-sentinel"
else
  echo "[mirror] WARN: safeboot header3_match != 1 (line: $safe_prom)"
  metric_status="WARN-other"
fi

echo
echo "=== [4] summary ==="
echo "[mirror] json_ok=$json_ok metric_status=$metric_status"

echo
echo "[RESULT] OK (header3 JSON mirrored; safeboot header3.prom status=$metric_status)"
exit 0
