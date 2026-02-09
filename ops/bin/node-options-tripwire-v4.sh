#!/usr/bin/env bash
set -euo pipefail

# node-options-tripwire-v4.sh (v4.1)
# - NEVER fails startup (always exit 0)
# - Ignores commented lines, including weird quoted comments:  "# ..." or " # ..."
# - Logs NODE_OPTIONS truth from /proc/<MainPID>/environ
# - Logs NODE_OPTIONS writers on disk (unit + drop-ins)
# - Warns if multiple REAL writers or unexpected value
# - Avoids rg/jq; caps output

UNIT="void-node.service"
HOME_DIR="${HOME}"
UNITFILE="$HOME_DIR/.config/systemd/user/$UNIT"
DROP="$HOME_DIR/.config/systemd/user/${UNIT}.d"

EXPECTED_REQUIRE="/home/zoso/dev/void-node/src/diag/preload_gate_bundle_afterapp_v3.cjs"

warn(){ echo "[WARN] $*" >&2; }
info(){ echo "[info] $*" >&2; }

echo "=== tripwire:v4 begin ==="

# A) MainPID + /proc env truth
PID="$(systemctl --user show -p MainPID --value "$UNIT" 2>/dev/null || true)"
echo "MainPID=${PID:-<empty>}"

NODEOPTS_PROC=""
if [ -n "${PID:-}" ] && [ "$PID" != "0" ] && [ -r "/proc/$PID/environ" ]; then
  NODEOPTS_PROC="$(tr '\0' '\n' < "/proc/$PID/environ" | sed -n 's/^NODE_OPTIONS=//p' | head -n 1 || true)"
  if [ -n "${NODEOPTS_PROC:-}" ]; then
    echo "NODE_OPTIONS(proc)=$NODEOPTS_PROC"

# native receipts logger flag (best-effort)
NATIVE_FLAG=""
if [ -r "/proc/$PID/environ" ]; then
  NATIVE_FLAG="$(tr '\0' '\n' < "/proc/$PID/environ" | grep -F 'DATANET_RECEIPTS_FETCH_NATIVE=' || true)"
fi
[ -n "$NATIVE_FLAG" ] && echo "$NATIVE_FLAG" || true

# if native is ON, NODE_OPTIONS should generally be empty (wrapper disabled) to avoid dup logging
if echo "$NATIVE_FLAG" | grep -q 'DATANET_RECEIPTS_FETCH_NATIVE=1'; then
  echo "[info] native fetch receipts logging is ON; ensure wrapper NODE_OPTIONS pin is OFF"
fi

  else
    warn "NODE_OPTIONS not found in /proc/$PID/environ"
  fi
else
  warn "cannot read /proc/$PID/environ (pid missing or permission)"
fi

echo
echo "=== NODE_OPTIONS writers on disk (unit + drop-ins) ==="
writers_tmp="/tmp/void-nodeopts-writers.$$.$RANDOM.txt"
: > "$writers_tmp" 2>/dev/null || true

# helper: emit only NON-commented lines that contain Environment="NODE_OPTIONS
emit_writers() {
  local f="$1"
  [ -r "$f" ] || return 0
  awk '
    {
      s=$0
      sub(/^[ \t]+/, "", s)

      # Treat these as comments:
      #   # ...
      #   "# ...
      #   " # ...
      if (s ~ /^#/) next
      if (s ~ /^"#[^"]*/) next
      if (s ~ /^"[ \t]*#[^"]*/) next

      if ($0 ~ /Environment="NODE_OPTIONS/) {
        print FILENAME ":" NR ":" $0
      }
    }
  ' "$f" 2>/dev/null || true
}

emit_writers "$UNITFILE" >> "$writers_tmp" || true

if [ -d "$DROP" ]; then
  find "$DROP" -maxdepth 1 -type f -name '*.conf' 2>/dev/null | LC_ALL=C sort \
  | while IFS= read -r f; do
      emit_writers "$f" || true
    done >> "$writers_tmp" || true
fi

nl -ba "$writers_tmp" | head -n 40 || true

writers_count="$(wc -l < "$writers_tmp" 2>/dev/null || echo 0)"
echo "writers_count=$writers_count"
if [ "${writers_count:-0}" -ne 1 ]; then
  warn "Expected exactly 1 REAL NODE_OPTIONS writer. Last-wins lexical is risky. Fix it."
fi

echo
echo "=== effective NODE_OPTIONS (systemd view) ==="
# Parse systemd Environment list without breaking on spaces:
# Environment="A=1" "NODE_OPTIONS=--require /path" "B=2"
# -> split on quotes and grab the token that starts with NODE_OPTIONS=
sys_nodeopts="$(
  systemctl --user show "$UNIT" -p Environment 2>/dev/null \
  | sed -n 's/^Environment=//p' \
  | tr '"' '\n' \
  | sed -n 's/^NODE_OPTIONS=//p' \
  | head -n 1 || true
)"
if [ -n "${sys_nodeopts:-}" ]; then
  echo "NODE_OPTIONS(systemd)=$sys_nodeopts"
else
  echo "NODE_OPTIONS(systemd)=<empty>"
fi

effective="${NODEOPTS_PROC:-}"
if [ -z "${effective:-}" ]; then
  effective="${sys_nodeopts:-}"
fi

echo
echo "=== check expected require ==="
if echo "${effective:-}" | grep -Fq "$EXPECTED_REQUIRE"; then
  info "NODE_OPTIONS matches expected v4 wrapper preload"
else
  warn "NODE_OPTIONS does NOT match expected v4 preload"
  warn "expected to include: $EXPECTED_REQUIRE"
  warn "effective: ${effective:-<empty>}"
fi

rm -f "$writers_tmp" 2>/dev/null || true
echo "=== tripwire:v4 end ==="
exit 0
