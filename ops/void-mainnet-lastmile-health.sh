#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="${REPO_DIR:-$(pwd)}"
PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

echo "[mainnet-lastmile-health] repo=${REPO_DIR}"
echo "[mainnet-lastmile-health] prom_url=${PROM_URL}"
echo

q() {
  local label="$1"
  local expr="$2"

  local raw
  if ! raw="$(
    curl -fsS "${PROM_URL}/api/v1/query" \
      --get \
      --data-urlencode "query=${expr}" \
    | jq -r ".data.result[0].value[1] // \"null\""
  )"; then
    raw="null"
  fi

  printf "%s=%s\n" "${label}" "${raw}"
}

echo "[core gauges]"
NONEMPTY_RAW_LINE="$(q "nonempty_recent" "void_mainnet_lastmile_nonempty_recent")"
HEAD_LINE="$(q "head_number" "void_mainnet_lastmile_head_number")"
LAST_NONEMPTY_LINE="$(q "last_nonempty_number" "void_mainnet_lastmile_last_nonempty_number")"
echo "${NONEMPTY_RAW_LINE}"
echo "${HEAD_LINE}"
echo "${LAST_NONEMPTY_LINE}"
echo

echo "[recordings]"
NONEMPTY_5M_LINE="$(q "nonempty_recent_5m" "void:mainnet_lastmile:nonempty_recent_5m")"
GAP_LINE="$(q "gap_blocks" "void:mainnet_lastmile:last_nonempty_gap")"
HEALTH_5M_LINE="$(q "health_5m" "void:mainnet_lastmile:health:last_5m")"
echo "${NONEMPTY_5M_LINE}"
echo "${GAP_LINE}"
echo "${HEALTH_5M_LINE}"
echo

# Extract just the values (after equals sign) safely
NONEMPTY_RAW="${NONEMPTY_RAW_LINE#*=}"
HEAD_NUM="${HEAD_LINE#*=}"
LAST_NONEMPTY_NUM="${LAST_NONEMPTY_LINE#*=}"
NONEMPTY_5M="${NONEMPTY_5M_LINE#*=}"
GAP_VAL="${GAP_LINE#*=}"
HEALTH_5M="${HEALTH_5M_LINE#*=}"

echo "[interpretation]"

# Basic null checks
if [[ "${NONEMPTY_RAW}" == "null" || "${HEAD_NUM}" == "null" || "${LAST_NONEMPTY_NUM}" == "null" || "${NONEMPTY_5M}" == "null" || "${GAP_VAL}" == "null" ]]; then
  echo "  - one or more core last-mile metrics are missing (null)."
  echo "  - exporter and/or node_exporter textfile may be broken."
  echo "[mainnet-lastmile-health] RESULT: BAD (missing metrics)"
  exit 1
fi

# Treat values as integers
HEAD_INT="${HEAD_NUM%.*}"
LAST_NONEMPTY_INT="${LAST_NONEMPTY_NUM%.*}"
GAP_INT="${GAP_VAL%.*}"

echo "  - head_number          = ${HEAD_INT}"
echo "  - last_nonempty_number = ${LAST_NONEMPTY_INT}"
echo "  - gap_blocks           = ${GAP_INT}"
echo "  - nonempty_recent_5m   = ${NONEMPTY_5M}"
echo "  - health_5m            = ${HEALTH_5M}"

OK=1

# Require at least one non-empty block in the last 5 minutes
if [[ "${NONEMPTY_5M}" != "1" ]]; then
  echo "  - FAIL: nonempty_recent_5m != 1 (no non-empty blocks in last 5m)."
  OK=0
fi

# Require gap to be sane (<= 50 blocks)
if [[ ! "${GAP_INT}" =~ ^-?[0-9]+$ ]]; then
  echo "  - WARN: gap_blocks is not an integer (${GAP_INT}); treating as bad."
  OK=0
elif (( GAP_INT > 50 )); then
  echo "  - FAIL: gap_blocks > 50 (last non-empty block too far behind head)."
  OK=0
fi

# If the dedicated health recording exists, require it to be 1 as well
if [[ "${HEALTH_5M}" != "null" && "${HEALTH_5M}" != "1" ]]; then
  echo "  - FAIL: void:mainnet_lastmile:health:last_5m != 1."
  OK=0
fi

if (( OK == 1 )); then
  echo "[mainnet-lastmile-health] RESULT: OK (non-empty blocks present, gap sane)"
  exit 0
else
  echo "[mainnet-lastmile-health] RESULT: BAD (see reasons above)"
  exit 1
fi
