#!/usr/bin/env bash
set -euo pipefail

PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

echo "=== [mainnet-run-health] VOID mainnet RUN health (planning-only) ==="
echo "[cfg] PROM_URL = $PROM_URL"
echo

prom_query() {
  local query="$1"
  curl -fsS "$PROM_URL/api/v1/query" \
    --get --data-urlencode "query=$query"
}

# 1) Raw gauge: void_mainnet_run_status
echo "=== [1] raw void_mainnet_run_status ==="
RAW_STATUS_JSON="$(prom_query 'void_mainnet_run_status' 2>/dev/null || true)"

if [[ -z "$RAW_STATUS_JSON" ]]; then
  echo "[ERR] no response from Prometheus for void_mainnet_run_status"
  exit 1
fi

STATUS_RESULT_COUNT="$(printf '%s\n' "$RAW_STATUS_JSON" | jq '.data.result | length')"

if [[ "$STATUS_RESULT_COUNT" -eq 0 ]]; then
  echo "[ERR] void_mainnet_run_status is missing from Prometheus"
  echo "      (did you wire the exporter / textfile collector correctly?)"
  exit 1
fi

STATUS_NUM_STR="$(printf '%s\n' "$RAW_STATUS_JSON" | jq -r '.data.result[0].value[1]')"

printf '%s\n' "$RAW_STATUS_JSON" | jq '.data.result'
echo
echo "[info] status numeric (gauge) = $STATUS_NUM_STR"
echo

# 2) Labeled state: void_mainnet_run_state
echo "=== [2] raw void_mainnet_run_state ==="
RAW_STATE_JSON="$(prom_query 'void_mainnet_run_state' 2>/dev/null || true)"

if [[ -z "$RAW_STATE_JSON" ]]; then
  echo "[ERR] no response from Prometheus for void_mainnet_run_state"
  exit 1
fi

STATE_RESULT_COUNT="$(printf '%s\n' "$RAW_STATE_JSON" | jq '.data.result | length')"

if [[ "$STATE_RESULT_COUNT" -eq 0 ]]; then
  echo "[ERR] void_mainnet_run_state is missing from Prometheus"
  echo "      (did you run the RUN exporter / helper?)"
  exit 1
fi

printf '%s\n' "$RAW_STATE_JSON" | jq '.data.result'
echo

STATE_STATUS_LABEL="$(printf '%s\n' "$RAW_STATE_JSON" | jq -r '.data.result[0].metric.status // "UNKNOWN"')"
STATE_PLAN_VERSION="$(printf '%s\n' "$RAW_STATE_JSON" | jq -r '.data.result[0].metric.plan_version // "unknown"')"
STATE_HASH_MATCH="$(printf '%s\n' "$RAW_STATE_JSON" | jq -r '.data.result[0].metric.hash_match // "UNKNOWN"')"

echo "[info] state.status(label)    = $STATE_STATUS_LABEL"
echo "[info] state.plan_version     = $STATE_PLAN_VERSION"
echo "[info] state.hash_match       = $STATE_HASH_MATCH"
echo

# 3) Optional recording rule (planning-only): void:mainnet_run_status:last_5m
echo "=== [3] recording rule (best-effort) void:mainnet_run_status:last_5m ==="
RAW_REC_JSON="$(prom_query 'void:mainnet_run_status:last_5m' 2>/dev/null || true)"

if [[ -n "$RAW_REC_JSON" ]]; then
  REC_COUNT="$(printf '%s\n' "$RAW_REC_JSON" | jq '.data.result | length')"
  if [[ "$REC_COUNT" -gt 0 ]]; then
    printf '%s\n' "$RAW_REC_JSON" | jq '.data.result'
    REC_VAL="$(printf '%s\n' "$RAW_REC_JSON" | jq -r '.data.result[0].value[1]')"
    echo
    echo "[info] recording value (5m)  = $REC_VAL"
  else
    echo "[warn] recording rule void:mainnet_run_status:last_5m not found (not fatal yet)"
  fi
else
  echo "[warn] unable to query recording rule (not fatal)"
fi

echo

# 4) Interpretation for planning-only phase
echo "=== [4] interpretation (planning-only) ==="
echo "Expectations in this phase:"
echo "  - status numeric == 0"
echo "  - state.status(label) == \"NOT_STARTED\""
echo "  - state.hash_match != \"MISMATCH\""
echo

RC=0

if [[ "$STATUS_NUM_STR" != "0" ]]; then
  echo "[FAIL] void_mainnet_run_status != 0 (got: $STATUS_NUM_STR)"
  RC=1
fi

if [[ "$STATE_STATUS_LABEL" != "NOT_STARTED" ]]; then
  echo "[FAIL] run_state.status(label) != NOT_STARTED (got: $STATE_STATUS_LABEL)"
  RC=1
fi

if [[ "$STATE_HASH_MATCH" == "MISMATCH" ]]; then
  echo "[FAIL] run_state.hash_match == MISMATCH (config/state hash mismatch)"
  RC=1
fi

if [[ "$RC" -eq 0 ]]; then
  echo "[RESULT] OK (RUN pillar is NOT_STARTED with non-mismatching config hash; planning-only)"
else
  echo "[RESULT] BAD (RUN pillar not in expected NOT_STARTED planning state)"
fi

exit "$RC"
