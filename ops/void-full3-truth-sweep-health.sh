#!/usr/bin/env bash
set -euo pipefail

PROM="${PROM:-http://127.0.0.1:9090}"
MAX_AGE_S="${MAX_AGE_S:-600}"

q() {
  local expr="$1"
  curl -fsS -G "$PROM/api/v1/query" --data-urlencode "query=$expr" | jq -r '.data.result[0].value[1] // empty'
}

py_lt() {
  python3 - "$1" "$2" <<'PY'
import sys
a = float(sys.argv[1])
b = float(sys.argv[2])
print(1 if a < b else 0)
PY
}

py_eq0() {
  python3 - "$1" <<'PY'
import sys
v = sys.argv[1].strip()
try:
  x = float(v)
except Exception:
  x = 999999999.0
print(1 if x == 0 else 0)
PY
}

py_eq1() {
  python3 - "$1" <<'PY'
import sys
v = sys.argv[1].strip()
try:
  x = float(v)
except Exception:
  x = 0.0
print(1 if x == 1 else 0)
PY
}

ok="$(q 'void_full3_truth_sweep_ok' || true)"
mismatch="$(q 'void_full3_truth_sweep_mismatch_blocks' || true)"
missing="$(q 'void_full3_truth_sweep_missing_persistedlen_blocks' || true)"
errs="$(q 'void_full3_truth_sweep_errors_fetch_blocks' || true)"
age_s="$(q 'time() - void_full3_truth_sweep_last_run_ts_seconds' || true)"

ok="${ok:-0}"
mismatch="${mismatch:-0}"
missing="${missing:-0}"
errs="${errs:-0}"
age_s="${age_s:-999999999}"

echo "PROM=$PROM MAX_AGE_S=$MAX_AGE_S"
echo "ok=$ok mismatch=$mismatch missing_persistedlen=$missing errors_fetch=$errs age_s=$age_s"

if [[ "$(py_eq1 "$ok")" != "1" ]]; then
  echo "[ERR] sweep ok!=1"
  exit 1
fi
if [[ "$(py_eq0 "$mismatch")" != "1" ]]; then
  echo "[ERR] mismatch_blocks!=0"
  exit 1
fi
if [[ "$(py_eq0 "$missing")" != "1" ]]; then
  echo "[ERR] missing_persistedlen_blocks!=0"
  exit 1
fi
if [[ "$(py_eq0 "$errs")" != "1" ]]; then
  echo "[ERR] errors_fetch_blocks!=0"
  exit 1
fi
if [[ "$(py_lt "$age_s" "$MAX_AGE_S")" != "1" ]]; then
  echo "[ERR] sweep stale (age_s >= MAX_AGE_S)"
  exit 1
fi

echo "[ok] full3 truth sweep gate PASS"
