#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-/home/zoso/dev/void-node}"
OUT_DIR="${OUT_DIR:-/var/lib/node_exporter/textfile_collector}"
MAIN_URL="${MAIN_URL:-http://127.0.0.1:4100}"
WINDOW="${WINDOW:-50}"
PROM="${PROM:-void_lastmile_nonempty.prom}"

tmp="$OUT_DIR/.${PROM}.tmp.$$"
out="$OUT_DIR/${PROM}"

# --- helpers ---
json_get() {
  python3 - "$1" <<PY
import json,sys
p=sys.argv[1]
obj=json.load(sys.stdin)
cur=obj
for part in p.split("."):
    if part=="":
        continue
    if isinstance(cur, dict) and part in cur:
        cur=cur[part]
    else:
        print("")
        sys.exit(0)
print(cur if cur is not None else "")
PY
}

get_latest() {
  # preferred: /blocks/latest/number2.json -> {number: N} (or similar)
  if v="$(curl -fsS --connect-timeout 1 --max-time 3 "$MAIN_URL/blocks/latest/number2.json" 2>/dev/null | json_get number)"; then
    if [[ "$v" =~ ^[0-9]+$ ]]; then echo "$v"; return 0; fi
  fi
  # fallback: /head.txt -> plain N
  if v="$(curl -fsS --connect-timeout 1 --max-time 3 "$MAIN_URL/head.txt" 2>/dev/null | tr -dc "0-9")"; then
    if [[ "$v" =~ ^[0-9]+$ ]]; then echo "$v"; return 0; fi
  fi
  echo ""
  return 1
}

get_txcount() {
  local n="$1"
  # header3: { number, txCount, txRoot }
  local j
  j="$(curl -fsS --connect-timeout 1 --max-time 3 "$MAIN_URL/blocks/$n/header3" 2>/dev/null || true)"
  if [[ -n "$j" ]]; then
    local t
    t="$(printf "%s" "$j" | json_get txCount | tr -dc "0-9")"
    if [[ "$t" =~ ^[0-9]+$ ]]; then echo "$t"; return 0; fi
  fi
  echo ""
  return 1
}

mkdir -p "$OUT_DIR"

latest="$(get_latest || true)"
if [[ -z "${latest}" ]]; then
  {
    echo "# HELP void_lastmile_exporter_ok 1 if exporter succeeded"
    echo "# TYPE void_lastmile_exporter_ok gauge"
    echo "void_lastmile_exporter_ok 0"
    echo "# HELP void_lastmile_last_error 1 if latest block could not be fetched"
    echo "# TYPE void_lastmile_last_error gauge"
    echo "void_lastmile_last_error 1"
  } >"$tmp"
  mv -f "$tmp" "$out"
  exit 0
fi

# window bounds
if ! [[ "$WINDOW" =~ ^[0-9]+$ ]]; then WINDOW=50; fi
if (( WINDOW < 1 )); then WINDOW=1; fi

start=$(( latest - WINDOW + 1 ))
if (( start < 0 )); then start=0; fi

seen=0
nonempty=0
errors=0

for ((n=start; n<=latest; n++)); do
  t="$(get_txcount "$n" || true)"
  if [[ -z "${t}" ]]; then
    errors=$((errors+1))
    continue
  fi
  seen=$((seen+1))
  if (( t > 0 )); then nonempty=$((nonempty+1)); fi
done

ratio="0"
if (( seen > 0 )); then
  ratio="$(python3 - <<PY
seen=$seen
nonempty=$nonempty
print(nonempty/seen)
PY
)"
fi

{
  echo "# HELP void_lastmile_exporter_ok 1 if exporter succeeded"
  echo "# TYPE void_lastmile_exporter_ok gauge"
  echo "void_lastmile_exporter_ok 1"
  echo "# HELP void_lastmile_last_block Latest block number observed"
  echo "# TYPE void_lastmile_last_block gauge"
  echo "void_lastmile_last_block $latest"
  echo "# HELP void_lastmile_window_requested Requested sample window"
  echo "# TYPE void_lastmile_window_requested gauge"
  echo "void_lastmile_window_requested $WINDOW"
  echo "# HELP void_lastmile_window_seen Blocks successfully sampled"
  echo "# TYPE void_lastmile_window_seen gauge"
  echo "void_lastmile_window_seen $seen"
  echo "# HELP void_lastmile_window_errors Blocks that failed to sample"
  echo "# TYPE void_lastmile_window_errors gauge"
  echo "void_lastmile_window_errors $errors"
  echo "# HELP void_lastmile_nonempty_total Non-empty blocks in sampled window"
  echo "# TYPE void_lastmile_nonempty_total gauge"
  echo "void_lastmile_nonempty_total $nonempty"
  echo "# HELP void_lastmile_nonempty_ratio Non-empty ratio over sampled window (nonempty/seen)"
  echo "# TYPE void_lastmile_nonempty_ratio gauge"
  echo "void_lastmile_nonempty_ratio $ratio"
} >"$tmp"

mv -f "$tmp" "$out"
