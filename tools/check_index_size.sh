#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

TARGET="${VOID_INDEX_TS_PATH:-src/index.ts}"
BASELINE_FILE="${VOID_INDEX_TS_BASELINE_FILE:-fixtures/ops/guard-baselines/index-ts-size-v1.json}"
MAX_LINES="${VOID_INDEX_TS_MAX_LINES:-100000}"

if [ ! -f "$TARGET" ]; then
  echo "FAIL: missing $TARGET" >&2
  exit 1
fi

SIZE="$(wc -c < "$TARGET" | tr -d ' ')"
LINES="$(wc -l < "$TARGET" | tr -d ' ')"

BASELINE="${VOID_INDEX_TS_BASELINE_BYTES:-}"
if [ -z "$BASELINE" ] && [ -f "$BASELINE_FILE" ]; then
  if command -v jq >/dev/null 2>&1; then
    BASELINE="$(jq -r '.baseline_bytes // empty' "$BASELINE_FILE")"
  elif command -v python3 >/dev/null 2>&1; then
    BASELINE="$(python3 - "$BASELINE_FILE" <<'PY'
import json, sys
with open(sys.argv[1], "r", encoding="utf-8") as f:
    print(json.load(f).get("baseline_bytes", ""))
PY
)"
  fi
fi

if [ -z "$BASELINE" ]; then
  BASELINE="2097152"
fi

case "$SIZE:$BASELINE:$LINES:$MAX_LINES" in
  *[!0-9:]*|"":*)
    echo "FAIL: non-numeric index guard values size=$SIZE baseline=$BASELINE lines=$LINES max_lines=$MAX_LINES" >&2
    exit 1
    ;;
esac

if [ "$SIZE" -gt "$BASELINE" ]; then
  echo "FAIL: $TARGET size=$SIZE > baseline=$BASELINE"
  exit 1
fi

if [ "$LINES" -gt "$MAX_LINES" ]; then
  echo "FAIL: $TARGET lines=$LINES > max_lines=$MAX_LINES"
  exit 1
fi

marks=(
  '// --- SEALS_V3_BOOTSAFE_BEGIN ---'
  '// --- SEALS_V3_WATCHDOG_BEGIN ---'
  '// --- SEALS_V3_POLLER_BEGIN ---'
  '// --- SEALS_V3_HEARTBEAT_FIX_BEGIN ---'
  '// --- SEALS_V3_HEALTH_WATCHDOG_BEGIN ---'
)

for m in "${marks[@]}"; do
  c="$({ grep -nF "$m" "$TARGET" || true; } | wc -l | tr -d ' ')"
  if [ "$c" -ne 1 ]; then
    echo "FAIL: marker '$m' count=$c (expect 1)"
    exit 1
  fi
done

echo "OK: $TARGET size=$SIZE <= baseline=$BASELINE lines=$LINES <= max_lines=$MAX_LINES markers=1x each"
