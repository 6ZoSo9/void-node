#!/usr/bin/env bash
set -euo pipefail

MAX_AGE="${MAX_AGE:-180}"   # seconds
PROM="${PROM:-http://127.0.0.1:9090}"

ts="$(
  curl -fsS --get "$PROM/api/v1/query" \
    --data-urlencode 'query=max(void_pillars_last_run_ts)' \
  | jq -r '.data.result[0].value[1] // empty' 2>/dev/null || true
)"

if [[ -z "${ts:-}" ]]; then
  echo "[ERR] could not read max(void_pillars_last_run_ts) from Prom"
  exit 2
fi

now="$(date +%s)"
ts_int="${ts%.*}"
age=$(( now - ts_int ))

echo "[pillars-age] now=$now last_run_ts=$ts age_s=$age max_age=$MAX_AGE"
if (( age > MAX_AGE )); then
  echo "[FAIL] pillars exporter stale"
  exit 3
fi

echo "[OK] pillars exporter fresh"
