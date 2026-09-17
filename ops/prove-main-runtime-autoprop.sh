#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

void_prom_unescape() {
  python3 -c 'import sys; sys.stdout.write(sys.stdin.read().replace("\\n", "\n"))'
}

BASE="${BASE:-http://127.0.0.1:4100}"
WAIT_SECS="${WAIT_SECS:-20}"
MODE="${MODE:-idle}"
REAL_WORK_STIMULUS="${REAL_WORK_STIMULUS:-}"

need() {
  command -v "$1" >/dev/null 2>&1 || { echo "[ERR] missing command: $1" >&2; exit 1; }
}
need curl
need python3

case "$MODE" in
  idle|work) ;;
  *)
    echo "[ERR] MODE must be idle or work, got: $MODE" >&2
    exit 1
    ;;
esac

if [ "$MODE" = "work" ]; then
  test -n "$REAL_WORK_STIMULUS" || {
    echo "[ERR] MODE=work requires REAL_WORK_STIMULUS=/absolute/path/to/reviewed-executable" >&2
    exit 1
  }
  case "$REAL_WORK_STIMULUS" in
    /*) ;;
    *)
      echo "[ERR] REAL_WORK_STIMULUS must be an absolute path" >&2
      exit 1
      ;;
  esac
  test -f "$REAL_WORK_STIMULUS" || {
    echo "[ERR] REAL_WORK_STIMULUS is not a regular file: $REAL_WORK_STIMULUS" >&2
    exit 1
  }
  test -x "$REAL_WORK_STIMULUS" || {
    echo "[ERR] REAL_WORK_STIMULUS is not executable: $REAL_WORK_STIMULUS" >&2
    exit 1
  }
fi

json_get() {
  local expr="$1"
  python3 -c 'import json,sys; expr=sys.argv[1]; obj=json.load(sys.stdin); ns={"obj": obj, "int": int, "float": float, "str": str, "len": len, "max": max, "min": min, "bool": bool, "abs": abs, "sum": sum, "any": any, "all": all}; print(eval(expr, {"__builtins__": {}}, ns))' "$expr"
}

echo "=== [1] before mode=$MODE ==="
H1="$(curl -fsS --max-time 5 "$BASE/head.txt" | tr -d '\r\n')"
A1="$(curl -fsS --max-time 5 "$BASE/__void/metrics/commit-direct-autoprop.v1/status.json")"
V1="$(curl -fsS --max-time 5 "$BASE/__void/metrics/proposer.commit-direct.v2fs/status.json")"
R1="$(curl -fsS --max-time 5 "$BASE/__void/ready.json")"

printf 'head_before=%s\n' "$H1"
printf '%s\n' "$A1"
printf '%s\n' "$V1"
printf '%s\n' "$R1"

A1_OK="$(printf '%s' "$A1" | json_get 'int(obj["state"]["ok"])')"
A1_NOOP="$(printf '%s' "$A1" | json_get 'int(obj["state"]["noop"])')"
V1_OK="$(printf '%s' "$V1" | json_get 'int(obj["state"]["ok"])')"
R1_READY="$(printf '%s' "$R1" | json_get 'bool(obj["ready"])')"

test "$R1_READY" = "True" || {
  echo "[ERR] ready was not true before observation" >&2
  exit 1
}

if [ "$MODE" = "work" ]; then
  echo
  echo "=== [2] execute explicitly supplied reviewed real-work stimulus ==="
  "$REAL_WORK_STIMULUS"
else
  echo
  echo "=== [2] idle observation; no work is injected ==="
fi

echo
echo "=== [3] wait ${WAIT_SECS}s ==="
sleep "$WAIT_SECS"

echo
echo "=== [4] after ==="
H2="$(curl -fsS --max-time 5 "$BASE/head.txt" | tr -d '\r\n')"
A2="$(curl -fsS --max-time 5 "$BASE/__void/metrics/commit-direct-autoprop.v1/status.json")"
V2="$(curl -fsS --max-time 5 "$BASE/__void/metrics/proposer.commit-direct.v2fs/status.json")"
R2="$(curl -fsS --max-time 5 "$BASE/__void/ready.json")"
S2="$(curl -fsS --max-time 5 "$BASE/metrics/void/seals")"
S2="$(printf '%s' "$S2" | void_prom_unescape)"

printf 'head_after=%s\n' "$H2"
printf 'delta=%s\n' "$((H2-H1))"
printf '%s\n' "$A2"
printf '%s\n' "$V2"
printf '%s\n' "$R2"
printf '%s\n' "$S2" | sed -n '1,20p'

A2_OK="$(printf '%s' "$A2" | json_get 'int(obj["state"]["ok"])')"
A2_NOOP="$(printf '%s' "$A2" | json_get 'int(obj["state"]["noop"])')"
V2_OK="$(printf '%s' "$V2" | json_get 'int(obj["state"]["ok"])')"
R2_READY="$(printf '%s' "$R2" | json_get 'bool(obj["ready"])')"
R2_HEAD="$(printf '%s' "$R2" | json_get 'int(obj["head"])')"
R2_LASTMILE="$(printf '%s' "$R2" | json_get 'int(obj["lastmile_seen"])')"
R2_GAP="$(printf '%s' "$R2" | json_get 'int(obj["gap"])')"
R2_TXROOT="$(printf '%s' "$R2" | json_get 'int(obj["txroot_live"])')"
SEAL_LAST="$(printf '%s\n' "$S2" | awk '/^void_seal_last_number /{print $2}')"

test "$R2_READY" = "True" || { echo "[ERR] ready is not true after observation"; exit 1; }
test "$R2_HEAD" -eq "$H2" || { echo "[ERR] ready.head does not match head.txt"; exit 1; }
test "$R2_LASTMILE" -eq "$H2" || { echo "[ERR] ready.lastmile_seen does not match head.txt"; exit 1; }
test "$R2_GAP" -eq 0 || { echo "[ERR] ready gap is not zero"; exit 1; }
test "$R2_TXROOT" -eq 1 || { echo "[ERR] txroot_live is not 1"; exit 1; }

if [ "$MODE" = "idle" ]; then
  test "$H2" -eq "$H1" || {
    echo "[ERR] idle head changed; the observation was not idle/no-ready-work" >&2
    exit 1
  }
  test "$A2_OK" -ge "$A1_OK" || { echo "[ERR] autoprop ok counter regressed"; exit 1; }
  test "$A2_NOOP" -ge "$A1_NOOP" || { echo "[ERR] autoprop noop counter regressed"; exit 1; }
  test "$V2_OK" -ge "$V1_OK" || { echo "[ERR] v2fs ok counter regressed"; exit 1; }
else
  test "$H2" -gt "$H1" || { echo "[ERR] reviewed real work did not advance head"; exit 1; }
  test "$A2_OK" -gt "$A1_OK" || { echo "[ERR] autoprop ok did not increase for reviewed real work"; exit 1; }
  test "$V2_OK" -gt "$V1_OK" || { echo "[ERR] v2fs ok did not increase for reviewed real work"; exit 1; }
fi

test -n "$SEAL_LAST" || { echo "[ERR] seal_last_number metric missing"; exit 1; }
SEAL_DELTA="$(( SEAL_LAST - H2 ))"
ABS_SEAL_DELTA="$SEAL_DELTA"
if [ "$ABS_SEAL_DELTA" -lt 0 ]; then
  ABS_SEAL_DELTA="$(( -ABS_SEAL_DELTA ))"
fi
if [ "$ABS_SEAL_DELTA" -gt 2 ]; then
  echo "[ERR] seal/head drift too large: seal_last_number=${SEAL_LAST} head_after=${H2} abs_delta=${ABS_SEAL_DELTA}" >&2
  exit 1
fi

echo
echo "[ok] main runtime autoprop proof passed mode=$MODE"
echo "summary: head ${H1}->${H2}, autoprop_ok ${A1_OK}->${A2_OK}, v2fs_ok ${V1_OK}->${V2_OK}, noop ${A1_NOOP}->${A2_NOOP}"
if [ "$MODE" = "idle" ]; then
  echo "contract: idle/no-ready-work => stable head"
else
  echo "contract: explicitly reviewed real work => head advances"
fi
