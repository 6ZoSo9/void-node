#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

BASE="${BASE:-${MAIN_BASE:-http://127.0.0.1:4100}}"
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

head_now() {
  curl -fsS --max-time 5 "$BASE/head.txt"
}

follower_http_head() {
  curl -fsS --max-time 5 "$FOLLOWER_BASE/head.txt"
}

follower_store_head() {
  run_follower_user "python3 - <<'PY' '$FOLLOWER_DATA_DIR'
import json, os, sys
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
        import re
        for m in re.finditer(r'(?:^|[^0-9])([0-9]{1,12})(?:[^0-9]|$)', name):
            best = max(best, int(m.group(1)))
print(best)
PY"
}

say "=== public-beta status: main head ==="
H="$(head_now)"
say "head=$H"
echo

say "=== public-beta status: proposer ==="
P="$(curl -fsS --max-time 5 "$BASE/proposer/status")"
echo "$P"
python3 - <<'PY' "$P"
import json, sys
j = json.loads(sys.argv[1])
if bool(j.get("enabled")):
    print("PASS: proposer enabled")
else:
    print("FAIL: proposer disabled")
    raise SystemExit(1)
PY
echo

say "=== public-beta status: submit-path truth ==="
T="$(curl -fsS --max-time 5 "$BASE/__void/diag/submit_path_truth.json")"
echo "$T"
python3 - <<'PY' "$T"
import json, sys
j = json.loads(sys.argv[1])
if not j.get("installed"):
    print("FAIL: submit-path truth missing")
    raise SystemExit(1)
if not (j.get("mempool", {}) or {}).get("has_txs_array"):
    print("FAIL: mempool truth missing txs array")
    raise SystemExit(1)
print("PASS: submit-path truth clean")
PY
echo

say "=== public-beta status: follower snapshot ==="
MH="$(head_now)"
say "main_head=$MH"

if FH="$(follower_http_head 2>/dev/null)"; then
  say "follower_head=$FH"
  LAG=$(( MH - FH ))
  say "lag=$LAG"
  say "main_health=ok"
  say "follower_health=ok"
  [ "$LAG" -ge 0 ] || fail "negative follower lag"
  [ "$LAG" -le 1 ] || fail "follower lag too high"
  echo
  run_follower_user "systemctl --user status $FOLLOWER_SYSTEMD_UNIT --no-pager -n 40 || true"
  echo
  say "PASS: follower snapshot healthy (http mode)"
else
  say "INFO: no follower HTTP at $FOLLOWER_BASE (oneshot/store mode assumed)"
  FSH="$(follower_store_head)"
  say "follower_store_head=$FSH"
  if [ "$FSH" -ge 0 ]; then
    LAG=$(( MH - FSH ))
    say "lag=$LAG"
    say "main_health=ok"
    if [ "$LAG" -le 1 ] && [ "$LAG" -ge 0 ]; then
      say "follower_health=ok"
      echo
      run_follower_user "systemctl --user status $FOLLOWER_SYSTEMD_UNIT --no-pager -n 40 || true"
      echo
      say "INFO: oneshot follower store is current"
    else
      say "follower_health=drifted"
      echo
      run_follower_user "systemctl --user status $FOLLOWER_SYSTEMD_UNIT --no-pager -n 40 || true"
      echo
      say "INFO: oneshot follower store lags main; use ./ops/demo-smoke-follower.sh for bounded proof"
    fi
  else
    say "INFO: follower store head unavailable"
    echo
    run_follower_user "systemctl --user status $FOLLOWER_SYSTEMD_UNIT --no-pager -n 40 || true"
    echo
    say "INFO: use ./ops/demo-smoke-follower.sh for bounded proof"
  fi
fi

echo
say "NOTE: follower section above is a live snapshot only."
say "NOTE: oneshot follower mode does not require follower HTTP on 4111."
say "NOTE: use ./ops/demo-smoke-follower.sh for the real bounded follower proof."
echo
say "=== next ==="
say "Live snapshot:"
say "make public-beta-status"
say "./ops/install-path-status.sh"
echo
say "Bounded proof gates:"
say "make public-beta-preflight   # wallet proof + wallet identity smoke + runner safety"
say "make wc-wallet-proof          # isolated wallet-specific WC proof only"
say "make wc-trade-proof           # bounded relayer / redeem / trade proof"
echo
say "Broader beta path:"
say "./ops/public-beta-quickstart.sh"
say "make public-beta"
echo
say "PASS install-path-status"
