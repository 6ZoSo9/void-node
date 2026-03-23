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
  python3 - "$FOLLOWER_DATA_DIR" <<'PY'
import json, os, re, sys

base = sys.argv[1]

def from_heads_json(d):
    p = os.path.join(d, "heads.json")
    try:
        with open(p, "r", encoding="utf-8") as f:
            obj = json.load(f)
        v = obj.get("head", None)
        if isinstance(v, bool):
            return None
        if isinstance(v, (int, float)) and int(v) == v:
            return int(v)
        if isinstance(v, str) and re.fullmatch(r"-?\d+", v.strip()):
            return int(v.strip())
    except Exception:
        pass
    return None

def walk_best(d):
    best = -1
    if not os.path.exists(d):
        return best
    for root, dirs, files in os.walk(d):
        for name in files:
            for m in re.finditer(r'(?<!\d)(\d{1,12})(?!\d)', name):
                try:
                    best = max(best, int(m.group(1)))
                except Exception:
                    pass
    return best

h = from_heads_json(base)
if h is not None:
    print(h, end="")
else:
    print(walk_best(base), end="")
PY
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
LAG=$(( MH - FSH ))
say "lag=$LAG"
say "main_health=ok"
say "follower_health=ok"

[ "$LAG" -ge 0 ] || fail "negative lag"
[ "$LAG" -le 1 ] || fail "follower lag too high in oneshot mode: $LAG"

echo "PASS follower synced (oneshot mode)"
