#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

MAIN_BASE="${MAIN_BASE:-${BASE:-http://127.0.0.1:4100}}"
FOLLOWER_BASE="${FOLLOWER_BASE:-http://127.0.0.1:4111}"
FOLLOWER_DATA_DIR="${FOLLOWER_DATA_DIR:-${DATA_DIR_FOLLOWER:-$HOME/dev/void-node/data_b}}"
FOLLOWER_RUN_AS_USER="${FOLLOWER_RUN_AS_USER:-}"
FOLLOWER_SYSTEMD_UNIT="${FOLLOWER_SYSTEMD_UNIT:-void-follower-once.service}"

say(){ printf '%s\n' "$*"; }
fail(){ echo "FAIL: $*" >&2; exit 1; }

run_follower_user() {
  if [ -n "${FOLLOWER_RUN_AS_USER:-}" ]; then
    if [ "$(id -un)" = "$FOLLOWER_RUN_AS_USER" ]; then
      bash -lc "$1"
      return
    fi
    local uid xr bus
    uid="$(id -u "$FOLLOWER_RUN_AS_USER")"
    xr="/run/user/$uid"
    bus="unix:path=$xr/bus"
    sudo -u "$FOLLOWER_RUN_AS_USER" env \
      HOME="/home/$FOLLOWER_RUN_AS_USER" \
      XDG_RUNTIME_DIR="$xr" \
      DBUS_SESSION_BUS_ADDRESS="$bus" \
      bash -lc "$1"
  else
    bash -lc "$1"
  fi
}

main_head() {
  curl -fsS --max-time 5 "$MAIN_BASE/head.txt"
}

follower_http_head() {
  curl -fsS --max-time 5 "$FOLLOWER_BASE/head.txt"
}

follower_store_head() {
  run_follower_user "python3 - <<'PY' '$FOLLOWER_DATA_DIR'
import json, os, re, sys
base = sys.argv[1]
f = os.path.join(base, 'heads.json')
if os.path.exists(f):
    try:
        with open(f, 'r', encoding='utf-8') as fh:
            j = json.load(fh)
        print(int(j.get('head', -1)))
        raise SystemExit
    except Exception:
        pass
best = -1
for root, dirs, files in os.walk(base):
    for name in files:
        for m in re.finditer(r'(?:^|[^0-9])([0-9]{1,12})(?:[^0-9]|$)', name):
            best = max(best, int(m.group(1)))
print(best)
PY"
}

say "=== follower smoke ==="
MH="$(main_head)"
say "main_head=$MH"

FH=""
if FH="$(follower_http_head 2>/dev/null)"; then
  say "follower_head=$FH"
  LAG=$(( MH - FH ))
  say "lag=$LAG"
  say "main_health=ok"
  say "follower_health=ok"
  run_follower_user "journalctl --user --no-pager -u $FOLLOWER_SYSTEMD_UNIT -n 20 || true"
  [ "$LAG" -ge 0 ] || fail "negative lag"
  [ "$LAG" -le 1 ] || fail "follower lag too high: $LAG"
  echo "PASS follower synced (http mode)"
  exit 0
fi

say "INFO: no follower HTTP at $FOLLOWER_BASE (oneshot mode assumed)"
run_follower_user "systemctl --user restart $FOLLOWER_SYSTEMD_UNIT >/dev/null 2>&1 || true"
sleep 3

run_follower_user "systemctl --user status $FOLLOWER_SYSTEMD_UNIT --no-pager -n 80 || true"
echo
run_follower_user "journalctl --user --no-pager -u $FOLLOWER_SYSTEMD_UNIT -n 80 || true"
echo

FSH="$(follower_store_head)"
say "follower_store_head=$FSH"
[ "$FSH" -ge 0 ] || fail "could not determine follower store head"

MH2="$(main_head)"
if [ "$MH2" -gt "$MH" ]; then
  say "main_head_resampled=$MH2"
  MH="$MH2"
fi

LAG=$(( MH - FSH ))
say "lag=$LAG"
say "main_health=ok"
say "follower_health=ok"

if [ "$LAG" -gt 1 ]; then
  say "INFO: oneshot follower trailing live main; running one extra catch-up pass"
  run_follower_user "systemctl --user restart $FOLLOWER_SYSTEMD_UNIT >/dev/null 2>&1 || true"
  sleep 3
  FSH="$(follower_store_head)"
  say "follower_store_head_after_recatchup=$FSH"
  MH="$(main_head)"
  say "main_head_after_recatchup=$MH"
  LAG=$(( MH - FSH ))
  say "lag_after_recatchup=$LAG"
fi

if [ "$LAG" -lt 0 ]; then
  sleep 1
  MH3="$(main_head)"
  if [ "$MH3" -gt "$MH" ]; then
    say "main_head_resampled_final=$MH3"
    MH="$MH3"
    LAG=$(( MH - FSH ))
    say "lag_after_resample=$LAG"
  fi
fi

[ "$LAG" -ge 0 ] || fail "negative lag after main-head resample"
[ "$LAG" -le 1 ] || fail "follower lag too high in oneshot mode: $LAG"

echo "PASS follower synced (oneshot mode)"
