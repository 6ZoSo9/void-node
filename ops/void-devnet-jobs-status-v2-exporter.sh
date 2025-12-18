#!/usr/bin/env bash
set -euo pipefail


umask 022

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
STATE_FILE="${STATE_FILE:-docs/VOID-DEVNET-PROTOCOL-STATE.json}"
SPOOL_FILE="${SPOOL_FILE:-docs/VOID-DEVNET-JOB-SPOOL.txt}"
JOBQ_SOL="${JOBQ_SOL:-contracts/JobQueue.sol}"
EVENT_NAME="${EVENT_NAME:-JobPosted}"
CHAIN="${CHAIN:-devnet}"

OUT_DIR="${OUT_DIR:-/var/lib/node_exporter/textfile_collector}"
OUT_FILE="${OUT_FILE:-$OUT_DIR/void_devnet_jobs_status_v2.prom}"

need() { command -v "$1" >/dev/null 2>&1 || { echo "[ERR] missing $1"; exit 1; }; }
need jq
need awk
need sed
need date
need stat || true

# Ensure we can run cast as *this* user (Foundry is usually in ~/.foundry/bin)
if ! command -v cast >/dev/null 2>&1; then
  if [ -x "$HOME/.foundry/bin/cast" ]; then
    export PATH="$HOME/.foundry/bin:$PATH"
  fi
fi
need cast

# Extract JobQueue address
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

# Derive JobPosted signature from solidity
EVENT_BLOCK="$(awk -v ev="$EVENT_NAME" '
  $0 ~ "event[[:space:]]+" ev "[[:space:]]*\\(" {cap=1}
  cap {print}
  cap && $0 ~ /\\);/ {exit}
' "$JOBQ_SOL")"

EVENT_ONE="$(echo "$EVENT_BLOCK" | sed 's,//.*,,' | tr '\n' ' ')"
INSIDE="$(echo "$EVENT_ONE" | sed -E "s/^.*event[[:space:]]+$EVENT_NAME[[:space:]]*\\(//; s/\\)[[:space:]]*;.*$//")"
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
if [ -z "${TOPIC0:-}" ]; then
  echo "[ERR] failed to derive topic0"
  exit 1
fi

# Read jobId_topic_index from spool header if present; default 1
JOBID_TOPIC_INDEX=1
if [ -f "$SPOOL_FILE" ]; then
  idx_line="$(grep -E '^# jobId_topic_index=' "$SPOOL_FILE" 2>/dev/null | tail -n1 || true)"
  if echo "$idx_line" | grep -Eq '[0-9]+'; then
    JOBID_TOPIC_INDEX="$(echo "$idx_line" | sed -E 's/^# jobId_topic_index=([0-9]+).*/\1/' | head -n1)"
  fi
fi

LOGS="$(cast rpc eth_getLogs "{\"fromBlock\":\"0x0\",\"toBlock\":\"latest\",\"address\":\"$JOBQ\",\"topics\":[\"$TOPIC0\"]}" --rpc-url "$RPC_URL" 2>/dev/null || echo "[]")"
CHAIN_TOTAL="$(echo "$LOGS" | jq -r --argjson idx "$JOBID_TOPIC_INDEX" '
  [ .[] | (.topics // []) as $t | if ($t|length) > $idx then $t[$idx] else empty end ] | unique | length
' 2>/dev/null || echo 0)"

NOW="$(date +%s)"
SPOOL_TOTAL=0
AGE_SECONDS=0
if [ -f "$SPOOL_FILE" ]; then
  SPOOL_TOTAL="$(awk 'NF && $1 !~ /^#/' "$SPOOL_FILE" | wc -l | tr -d " ")"
  MTIME="$(stat -c %Y "$SPOOL_FILE" 2>/dev/null || echo "$NOW")"
  AGE_SECONDS="$((NOW - MTIME))"
fi

GAP=$((CHAIN_TOTAL - SPOOL_TOTAL))
HEALTH=1
if [ "$AGE_SECONDS" -gt 600 ]; then HEALTH=0; fi

tmp="$(mktemp)"
{
  echo "# HELP void_devnet_jobs_status_v2_chain_total Total jobs observed on-chain via JobPosted logs"
  echo "# TYPE void_devnet_jobs_status_v2_chain_total gauge"
  echo "void_devnet_jobs_status_v2_chain_total{chain=\"$CHAIN\"} $CHAIN_TOTAL"
  echo "# HELP void_devnet_jobs_status_v2_spool_total Total jobs listed in local spool"
  echo "# TYPE void_devnet_jobs_status_v2_spool_total gauge"
  echo "void_devnet_jobs_status_v2_spool_total{chain=\"$CHAIN\"} $SPOOL_TOTAL"
  echo "# HELP void_devnet_jobs_status_v2_gap chain_total - spool_total"
  echo "# TYPE void_devnet_jobs_status_v2_gap gauge"
  echo "void_devnet_jobs_status_v2_gap{chain=\"$CHAIN\"} $GAP"
  echo "# HELP void_devnet_jobs_status_v2_age_seconds Age of spool file in seconds"
  echo "# TYPE void_devnet_jobs_status_v2_age_seconds gauge"
  echo "void_devnet_jobs_status_v2_age_seconds{chain=\"$CHAIN\"} $AGE_SECONDS"
  echo "# HELP void_devnet_jobs_status_v2_health 1 if exporter OK and spool not too stale"
  echo "# TYPE void_devnet_jobs_status_v2_health gauge"
  echo "void_devnet_jobs_status_v2_health{chain=\"$CHAIN\"} $HEALTH"
  echo "# HELP void_devnet_jobs_status_v2_sig_info 1-labeled info gauge about derived signature/topic"
  echo "# TYPE void_devnet_jobs_status_v2_sig_info gauge"
  echo "void_devnet_jobs_status_v2_sig_info{chain=\"$CHAIN\",jobqueue=\"$JOBQ\",sig=\"$SIG\",topic0=\"$TOPIC0\",jobId_topic_index=\"$JOBID_TOPIC_INDEX\"} 1"
} > "$tmp"

# Install into node_exporter textfile dir (needs root). We only sudo this part.
if sudo -n true >/dev/null 2>&1; then
  sudo mkdir -p "$OUT_DIR"
  sudo mv -f "$tmp" "$OUT_FILE"
  sudo chmod 0644 "$OUT_FILE" || true
  echo "[exporter] wrote $OUT_FILE"
else
  echo "[WARN] sudo needs password (or no sudo). Writing to stdout instead:"
  cat "$tmp"
  rm -f "$tmp"
fi

echo "[exporter] chain_total=$CHAIN_TOTAL spool_total=$SPOOL_TOTAL gap=$GAP age_seconds=$AGE_SECONDS health=$HEALTH"
# === [permfix] ensure node_exporter can read textfile outputs ===
if [ "${VOID_TEXTFILE_PERMFIX_DISABLE:-0}" = "1" ]; then
  :
else
  if [ "$(id -u)" -eq 0 ]; then
    for f in "/var/lib/node_exporter/textfile_collector/void_workcredits_devnet_pool.prom" "/var/lib/node_exporter/textfile_collector/void-mainnet-keys.prom" "/var/lib/node_exporter/textfile_collector/void_devnet_jobs_status_v2.prom"; do [ -f "$f" ] && chmod 644 "$f" || true; done
  else
    for f in "/var/lib/node_exporter/textfile_collector/void_workcredits_devnet_pool.prom" "/var/lib/node_exporter/textfile_collector/void-mainnet-keys.prom" "/var/lib/node_exporter/textfile_collector/void_devnet_jobs_status_v2.prom"; do [ -f "$f" ] && sudo chmod 644 "$f" || true; done
  fi
fi
