#!/usr/bin/env bash
set -euo pipefail
f="src/index.ts"
[ -f "$f" ] || exit 0
sz=$(stat -c%s "$f"); lines=$(wc -l < "$f")
max_bytes=$((2*1024*1024)); max_lines=100000
[ "$sz" -le "$max_bytes" ] || { echo "FAIL: $f size=$sz > $max_bytes"; exit 1; }
[ "$lines" -le "$max_lines" ] || { echo "FAIL: $f lines=$lines > $max_lines"; exit 1; }
marks=('// --- SEALS_V3_BOOTSAFE_BEGIN ---' '// --- SEALS_V3_WATCHDOG_BEGIN ---' '// --- SEALS_V3_POLLER_BEGIN ---' '// --- SEALS_V3_HEARTBEAT_FIX_BEGIN ---' '// --- SEALS_V3_HEALTH_WATCHDOG_BEGIN ---')
for m in "${marks[@]}"; do
  c=$(grep -nF "$m" "$f" | wc -l)
  [ "$c" -eq 1 ] || { echo "FAIL: marker '$m' count=$c (expect 1)"; exit 1; }
done
echo "OK: $f size=$sz lines=$lines markers=1x each"
