#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

ALIEN="${ALIEN:-zoso@100.122.79.39}"
MAIN="${MAIN:-http://100.93.2.116:4100}"
WAIT_SECS="${WAIT_SECS:-20}"

ssh "$ALIEN" 'bash -s' <<'EOS'
set -euo pipefail
set +H
set +o histexpand

MAIN="${MAIN:-http://100.93.2.116:4100}"
WAIT_SECS="${WAIT_SECS:-20}"
BASE="http://127.0.0.1:4100"

need() {
  command -v "$1" >/dev/null 2>&1 || { echo "[ERR] missing command: $1" >&2; exit 1; }
}
need curl
need python3
need systemctl

json_get() {
  local expr="$1"
  python3 -c 'import json,sys; expr=sys.argv[1]; obj=json.load(sys.stdin); ns={"obj": obj, "int": int, "float": float, "str": str, "len": len, "max": max, "min": min, "bool": bool, "abs": abs, "sum": sum, "any": any, "all": all}; print(eval(expr, {"__builtins__": {}}, ns))' "$expr"
}

echo "=== [1] restart service to prove boot autostart ==="
systemctl --user restart void-node.service
sleep 5

echo
echo "=== [2] follower status after restart ==="
S1="$(curl -fsS --max-time 5 "$BASE/follower/status?peer=$MAIN")"
P1="$(curl -fsS --max-time 5 "$BASE/__void/peer-main-status.json")"
H1="$(curl -fsS --max-time 5 "$BASE/head.txt" | tr -d "\r\n")"

printf '%s\n' "$S1"
printf '%s\n' "$P1"
printf 'head_before=%s\n' "$H1"

OK1="$(printf '%s\n' "$S1" | json_get 'bool(obj.get("ok"))')"
DRIFT1="$(printf '%s\n' "$S1" | json_get 'int(obj.get("drift", -999999))')"
GAP1="$(printf '%s\n' "$P1" | json_get 'int(obj.get("head_gap", -999999))')"

test "$OK1" = "True" || { echo "[ERR] follower status not ok after restart" >&2; exit 1; }
test "$DRIFT1" -le 3 || { echo "[ERR] initial follower drift too large: $DRIFT1" >&2; exit 1; }
test "$GAP1" -le 3 || { echo "[ERR] initial peer-main head_gap too large: $GAP1" >&2; exit 1; }

echo
echo "=== [3] wait for follower to keep tracking ==="
sleep "$WAIT_SECS"

echo
echo "=== [4] after wait ==="
S2="$(curl -fsS --max-time 5 "$BASE/follower/status?peer=$MAIN")"
P2="$(curl -fsS --max-time 5 "$BASE/__void/peer-main-status.json")"
H2="$(curl -fsS --max-time 5 "$BASE/head.txt" | tr -d "\r\n")"

printf '%s\n' "$S2"
printf '%s\n' "$P2"
printf 'head_after=%s\n' "$H2"
printf 'delta=%s\n' "$((H2-H1))"

OK2="$(printf '%s\n' "$S2" | json_get 'bool(obj.get("ok"))')"
DRIFT2="$(printf '%s\n' "$S2" | json_get 'int(obj.get("drift", -999999))')"
GAP2="$(printf '%s\n' "$P2" | json_get 'int(obj.get("head_gap", -999999))')"

test "$OK2" = "True" || { echo "[ERR] follower status not ok after wait" >&2; exit 1; }
test "$H2" -gt "$H1" || { echo "[ERR] local head did not advance" >&2; exit 1; }
test "$DRIFT2" -le 3 || { echo "[ERR] final follower drift too large: $DRIFT2" >&2; exit 1; }
test "$GAP2" -le 3 || { echo "[ERR] final peer-main head_gap too large: $GAP2" >&2; exit 1; }

echo
echo "[ok] alienware follower autostart proof passed"
echo "summary: head ${H1}->${H2}, drift ${DRIFT1}->${DRIFT2}, head_gap ${GAP1}->${GAP2}"
EOS
