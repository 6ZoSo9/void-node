#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
STATE_FILE="${STATE_FILE:-docs/VOID-DEVNET-PROTOCOL-STATE.json}"
SPOOL_FILE="${SPOOL_FILE:-docs/VOID-DEVNET-JOB-SPOOL.txt}"
JOBQ_SOL="${JOBQ_SOL:-contracts/JobQueue.sol}"
EVENT_NAME="${EVENT_NAME:-JobPosted}"

need() { command -v "$1" >/dev/null 2>&1 || { echo "[ERR] missing $1"; exit 1; }; }
need jq
need cast
need awk
need sed

echo "[spool-refresh] repo=$ROOT"
echo "[spool-refresh] rpc_url=$RPC_URL"
echo "[spool-refresh] state_file=$STATE_FILE"
echo "[spool-refresh] spool_file=$SPOOL_FILE"
echo "[spool-refresh] jobq_sol=$JOBQ_SOL"
echo "[spool-refresh] event_name=$EVENT_NAME"

JOBQ="$(jq -r '
  (
    .JobQueue
    | if type=="string" then .
      elif type=="object" then (.address // empty)
      else empty end
  ) // (.contracts.JobQueue.address // empty) // (.addresses.JobQueue // empty)
' "$STATE_FILE" 2>/dev/null | head -n1)"

if [ -z "${JOBQ:-}" ] || [ "$JOBQ" = "null" ]; then
  JOBQ="$(jq -r '
    (.. | objects | .JobQueue? // empty)
    | if type=="string" then .
      elif type=="object" then (.address // empty)
      else empty end
  ' "$STATE_FILE" 2>/dev/null | head -n1)"
fi

if ! [[ "${JOBQ:-}" =~ ^0x[0-9a-fA-F]{40}$ ]]; then
  echo "[ERR] could not extract a valid JobQueue address from $STATE_FILE"
  echo "[ERR] extracted JOBQ='$JOBQ'"
  exit 1
fi
echo "[spool-refresh] JobQueue=$JOBQ"

BN="$(cast block-number --rpc-url "$RPC_URL" 2>/dev/null || echo 0)"
echo "[spool-refresh] latest_block=$BN"

ANY_LOGS="$(cast rpc eth_getLogs "{\"fromBlock\":\"0x0\",\"toBlock\":\"latest\",\"address\":\"$JOBQ\"}" --rpc-url "$RPC_URL" 2>/dev/null | jq -r 'length' 2>/dev/null || echo 0)"
echo "[spool-refresh] any_logs_at_address=$ANY_LOGS"

if [ ! -f "$JOBQ_SOL" ]; then
  echo "[ERR] missing solidity file: $JOBQ_SOL"
  exit 1
fi

# FIX: do NOT use awk variable name "in"
EVENT_BLOCK="$(awk -v ev="$EVENT_NAME" '
  $0 ~ "event[[:space:]]+" ev "[[:space:]]*\\(" {cap=1}
  cap {print}
  cap && $0 ~ /\\);/ {exit}
' "$JOBQ_SOL")"

if [ -z "${EVENT_BLOCK:-}" ]; then
  echo "[ERR] could not find event $EVENT_NAME in $JOBQ_SOL"
  exit 1
fi

EVENT_ONE="$(echo "$EVENT_BLOCK" | sed 's,//.*,,' | tr '\n' ' ')"
INSIDE="$(echo "$EVENT_ONE" | sed -E "s/^.*event[[:space:]]+$EVENT_NAME[[:space:]]*\\(//; s/\\)[[:space:]]*;.*$//")"

# Build signature types list
TYPES="$(echo "$INSIDE" | awk -v RS=',' '
{
  gsub(/indexed/,"");
  gsub(/\b(memory|calldata|storage)\b/,"");
  gsub(/^[ \t]+|[ \t]+$/,"");
  split($0,a,/[ \t]+/);
  if (a[1] != "") {
    printf "%s%s", (out++ ? "," : ""), a[1];
  }
}')"

SIG="$EVENT_NAME($TYPES)"
TOPIC0="$(cast keccak "$SIG" 2>/dev/null || true)"

echo "[spool-refresh] derived_sig=$SIG"
echo "[spool-refresh] topic0=$TOPIC0"

if [ -z "${TOPIC0:-}" ]; then
  echo "[ERR] failed to keccak derived signature"
  exit 1
fi

# Determine which topic holds jobId by parsing indexed param order + names
# emits lines: type|indexed(0/1)|name
META="$(echo "$INSIDE" | awk -v RS=',' '
{
  line=$0
  gsub(/\/\/.*/,"",line)
  gsub(/\b(memory|calldata|storage)\b/,"",line)
  gsub(/^[ \t]+|[ \t]+$/,"",line)
  if (line=="") next
  idx = (line ~ /(^|[ \t])indexed([ \t]|$)/) ? 1 : 0
  gsub(/indexed/,"",line)
  gsub(/^[ \t]+|[ \t]+$/,"",line)
  n=split(line,a,/[ \t]+/)
  typ=a[1]
  name=(n>=2)?a[n]:""
  printf "%s|%d|%s\n", typ, idx, name
}')"

# Find jobId among indexed params; default to first indexed param
JOBID_TOPIC_INDEX=1
indexed_pos=0
found=0
while IFS='|' read -r typ idx name; do
  if [ "$idx" = "1" ]; then
    # jobId name match: jobId, _jobId, jobID, etc.
    if echo "$name" | grep -Eqi '(^|_)jobid$'; then
      JOBID_TOPIC_INDEX=$((1 + indexed_pos))
      found=1
      break
    fi
    indexed_pos=$((indexed_pos + 1))
  fi
done <<< "$META"

if [ "$found" = "0" ]; then
  # if we didn't find a param literally named jobId, still assume first indexed is the id
  JOBID_TOPIC_INDEX=1
fi

echo "[spool-refresh] jobId_topic_index=$JOBID_TOPIC_INDEX (topics[$JOBID_TOPIC_INDEX])"

LOGS="$(cast rpc eth_getLogs "{\"fromBlock\":\"0x0\",\"toBlock\":\"latest\",\"address\":\"$JOBQ\",\"topics\":[\"$TOPIC0\"]}" --rpc-url "$RPC_URL" 2>/dev/null || echo "[]")"
CNT="$(echo "$LOGS" | jq -r 'length' 2>/dev/null || echo 0)"
echo "[spool-refresh] matching_logs=$CNT"

tmp="$(mktemp)"
{
  echo "# VOID devnet job spool (one jobId per line)"
  echo "# regenerated: $(date --iso-8601=seconds)"
  echo "# JobQueue=$JOBQ"
  echo "# derived_sig=$SIG"
  echo "# topic0=$TOPIC0"
  echo "# any_logs_at_address=$ANY_LOGS"
  echo "# matching_logs=$CNT"
  echo "# jobId_topic_index=$JOBID_TOPIC_INDEX"
} > "$tmp"

if [ "$CNT" -gt 0 ]; then
  echo "$LOGS" | jq -r --argjson idx "$JOBID_TOPIC_INDEX" '
    .[] | (.topics // []) as $t |
    if ($t|length) > $idx then $t[$idx] else empty end
  ' | awk 'NF' | sort -u >> "$tmp"

  jobids="$(awk 'NF && $1 !~ /^#/' "$tmp" | wc -l | tr -d " ")"
  mv -f "$tmp" "$SPOOL_FILE"
  echo "[spool-refresh] wrote $SPOOL_FILE jobIds=$jobids"
  exit 0
fi

# If no matches, write empty spool ONLY if there are no logs at the address
if [ "${ANY_LOGS:-0}" -eq 0 ]; then
  mv -f "$tmp" "$SPOOL_FILE"
  echo "[spool-refresh] wrote EMPTY spool (no logs at address; likely fresh chain)"
  exit 0
fi

echo "[ERR] address has logs ($ANY_LOGS) but none match derived $EVENT_NAME topic0."
echo "[ERR] (This is an ABI/source mismatch, or the contract at that address isn't the JobQueue you think it is.)"
rm -f "$tmp"
exit 1
