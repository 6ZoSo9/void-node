#!/usr/bin/env bash
set -euo pipefail

MAIN="${MAIN:-http://127.0.0.1:4100}"
SAFE="${SAFE:-http://127.0.0.1:4104}"
TEXTFILE="${TEXTFILE:-/var/lib/node_exporter/textfile_collector/void_safeboot_lastmile.prom}"

fetch_head() {
  local url="$1"
  local value
  if ! value=$(curl -fsS "$url" 2>/dev/null | tr -d '\r'); then
    echo ""
    return
  fi
  if [[ "$value" =~ ^[0-9]+$ ]]; then
    echo "$value"
  else
    echo ""
  fi
}

fetch_txroot_health() {
  local base="$1"
  local out
  if ! out=$(curl -fsS "$base/health/txroot3?format=prom" 2>/dev/null); then
    echo ""
    return
  fi
  local value
  value=$(printf '%s\n' "$out" | awk '/^void_txroot_health[[:space:]]/ {print $2; exit}')
  if [[ "$value" =~ ^[0-9]+(\.[0-9]+)?$ ]]; then
    echo "$value"
  else
    echo ""
  fi
}

main_head=$(fetch_head "$MAIN/head.txt")
safe_head=$(fetch_head "$SAFE/head.txt")

main_head_num=0
safe_head_num=0
if [[ -n "$main_head" ]]; then
  main_head_num="$main_head"
fi
if [[ -n "$safe_head" ]]; then
  safe_head_num="$safe_head"
fi

head_gap=-1
heads_ok=0

if [[ -n "$main_head" && -n "$safe_head" ]]; then
  head_gap=$(( main_head_num - safe_head_num ))
  if (( head_gap < 0 )); then
    head_gap=0
  fi
  heads_ok=1
fi

main_txroot_health=$(fetch_txroot_health "$MAIN")
safe_txroot_health=$(fetch_txroot_health "$SAFE")

txroot_ok=0
if [[ "$main_txroot_health" == "1" ]]; then
  txroot_ok=1
fi

lastmile_ok=0
if (( heads_ok == 1 )) && (( head_gap <= 50 )) && (( txroot_ok == 1 )); then
  lastmile_ok=1
fi

tmpfile=$(mktemp)
cat >"$tmpfile" <<EOF
# HELP void_safeboot_head_main Main node head number (from /head.txt)
# TYPE void_safeboot_head_main gauge
void_safeboot_head_main ${main_head:-0}

# HELP void_safeboot_head_safe Safeboot node head number (from /head.txt)
# TYPE void_safeboot_head_safe gauge
void_safeboot_head_safe ${safe_head:-0}

# HELP void_safeboot_head_gap Difference main_head - safe_head (>=0, -1 if unknown)
# TYPE void_safeboot_head_gap gauge
void_safeboot_head_gap $head_gap

# HELP void_safeboot_heads_ok 1 if both heads could be read and parsed
# TYPE void_safeboot_heads_ok gauge
void_safeboot_heads_ok $heads_ok

# HELP void_safeboot_main_txroot_health Main node txroot health (void_txroot_health)
# TYPE void_safeboot_main_txroot_health gauge
void_safeboot_main_txroot_health ${main_txroot_health:-0}

# HELP void_safeboot_safe_txroot_health Safeboot node txroot health if available, otherwise 0
# TYPE void_safeboot_safe_txroot_health gauge
void_safeboot_safe_txroot_health ${safe_txroot_health:-0}

# HELP void_safeboot_lastmile_ok Composite safeboot last-mile health (1 good, 0 bad)
# TYPE void_safeboot_lastmile_ok gauge
void_safeboot_lastmile_ok $lastmile_ok
EOF

sudo install -o root -g root -m 0644 "$tmpfile" "$TEXTFILE"
rm -f "$tmpfile"

echo "[void-safeboot-lastmile] wrote metrics to $TEXTFILE"
