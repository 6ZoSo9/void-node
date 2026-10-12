#!/usr/bin/env bash
set -euo pipefail

BASE="${VOID_BASE:-http://127.0.0.1:4100}"
READY_URL="$BASE/__void/ready.json"
PAGE_URL="${VOID_PAGE:-$BASE/participant}"
TIMEOUT_SECONDS="${VOID_READY_TIMEOUT_SECONDS:-90}"
NO_OPEN="${VOID_LAUNCHER_NO_OPEN:-0}"

STATE_DIR="${XDG_STATE_HOME:-$HOME/.local/state}/void"
LOG="$STATE_DIR/launcher.log"
READY_JSON="$STATE_DIR/launcher-ready.json"

mkdir -p "$STATE_DIR"
touch "$LOG"

exec > >(tee -a "$LOG") 2>&1

ts() { date -Is; }

notice() {
  echo "[$(ts)] $*"
  if command -v notify-send >/dev/null 2>&1; then
    notify-send "VOID Network" "$*" >/dev/null 2>&1 || true
  fi
}

fail() {
  notice "[ERR] $*"
  exit 1
}

echo
echo "=== VOID launcher $(ts) ==="
echo "base=$BASE"
echo "page=$PAGE_URL"

if ! command -v systemctl >/dev/null 2>&1; then
  fail "systemctl not found; cannot start void-node.service"
fi

if ! systemctl --user list-unit-files void-node.service >/dev/null 2>&1; then
  fail "void-node.service is not installed for this user"
fi

notice "Starting VOID node..."
systemctl --user start void-node.service

notice "Waiting for VOID readiness..."
deadline=$(( $(date +%s) + TIMEOUT_SECONDS ))

while [ "$(date +%s)" -le "$deadline" ]; do
  if curl -fsS "$READY_URL" > "$READY_JSON" 2>/dev/null; then
    if READY_JSON="$READY_JSON" python3 - <<'PY' >/dev/null 2>&1
import json, os
p = os.environ["READY_JSON"]
j = json.load(open(p))
assert j.get("ready") is True, j
assert int(j.get("gap", 999999)) == 0, j
assert int(j.get("txroot_live", 0)) == 1, j
PY
    then
      cat "$READY_JSON"
      echo
      notice "[ok] VOID ready"
      if [ "$NO_OPEN" = "1" ]; then
        notice "VOID_LAUNCHER_NO_OPEN=1; not opening browser"
        exit 0
      fi

      if command -v xdg-open >/dev/null 2>&1; then
        notice "Opening participant page..."
        nohup xdg-open "$PAGE_URL" >/dev/null 2>&1 &
        exit 0
      fi

      fail "xdg-open not found; open manually: $PAGE_URL"
    fi
  fi

  sleep 1
done

echo
echo "=== void-node.service status ==="
systemctl --user --no-pager status void-node.service || true

fail "VOID node did not become ready within ${TIMEOUT_SECONDS}s"
