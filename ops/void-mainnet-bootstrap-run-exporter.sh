#!/usr/bin/env bash
set -euo pipefail

ts() {
  date -Is
}

echo "[$(ts)] === [mainnet-run exporter] VOID mainnet RUN state -> textfile (planning-only) ==="

# Resolve repo root from this script's location
ROOT="${ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
cd "$ROOT"

CONFIG_PATH="${CONFIG_PATH:-config/void-mainnet-bootstrap-mainnet.live.json}"
STATE_PATH="${STATE_PATH:-config/void-mainnet-bootstrap-mainnet.state.json}"

# Default textfile path; override with TEXTFILE_PATH=/var/lib/node_exporter/textfile_collector/void_mainnet_run_state.prom
TEXTFILE_PATH="${TEXTFILE_PATH:-/tmp/void_mainnet_run_state.prom}"

echo "[$(ts)] ROOT         = $ROOT"
echo "[$(ts)] CONFIG_PATH  = $CONFIG_PATH"
echo "[$(ts)] STATE_PATH   = $STATE_PATH"
echo "[$(ts)] TEXTFILE_PATH= $TEXTFILE_PATH"

if ! command -v jq >/dev/null 2>&1; then
  echo "[$(ts)] FATAL: jq not found; cannot parse RUN state" >&2
  exit 1
fi

if [[ ! -f "$STATE_PATH" ]]; then
  echo "[$(ts)] WARN: state file missing; emitting MISSING status"
  mkdir -p "$(dirname "$TEXTFILE_PATH")"
  cat > "$TEXTFILE_PATH" <<EOF
# HELP void_mainnet_run_state Planning-only view of VOID mainnet bootstrap RUN state
# TYPE void_mainnet_run_state gauge
void_mainnet_run_state{status="MISSING",plan_version="unknown",hash_match="UNKNOWN"} 1

# HELP void_mainnet_run_status Numeric RUN status (0=NOT_STARTED,1=IN_PROGRESS,2=COMPLETED,-1=FAILED,-2=UNKNOWN)
# TYPE void_mainnet_run_status gauge
void_mainnet_run_status -2

# HELP void_mainnet_run_chainid Config chainId associated with RUN state
# TYPE void_mainnet_run_chainid gauge
void_mainnet_run_chainid 0
EOF
  echo "[$(ts)] wrote metrics (MISSING) to $TEXTFILE_PATH"
  exit 0
fi

status_raw="$(jq -r '.status // "UNKNOWN"' "$STATE_PATH" 2>/dev/null || echo "UNKNOWN")"
chainId_raw="$(jq -r '.chainId // 0' "$STATE_PATH" 2>/dev/null || echo "0")"
planVersion="$(jq -r '.planVersion // "unknown"' "$STATE_PATH" 2>/dev/null || echo "unknown")"
state_liveHash="$(jq -r '.liveConfigHash // "0x0"' "$STATE_PATH" 2>/dev/null || echo "0x0")"

# Coerce chainId to numeric if possible
if [[ "$chainId_raw" =~ ^[0-9]+$ ]]; then
  chainId="$chainId_raw"
else
  chainId=0
fi

# Map status string -> numeric code
encode_status() {
  case "$1" in
    NOT_STARTED) echo 0 ;;
    IN_PROGRESS) echo 1 ;;
    COMPLETED)   echo 2 ;;
    FAILED)      echo -1 ;;
    *)           echo -2 ;;
  esac
}

status_code="$(encode_status "$status_raw")"

# Compute liveConfigHash from current LIVE config (best-effort)
hash_label="UNKNOWN"

if command -v cast >/dev/null 2>&1 && [[ -f "$CONFIG_PATH" ]]; then
  currentHash="$(cast keccak "$(cat "$CONFIG_PATH")")"
  echo "[$(ts)] state.liveConfigHash   = $state_liveHash"
  echo "[$(ts)] current liveConfigHash = $currentHash"

  if [[ "$currentHash" == "$state_liveHash" ]]; then
    hash_label="MATCH"
    echo "[$(ts)] OK: state.liveConfigHash matches current LIVE config"
  else
    hash_label="MISMATCH"
    echo "[$(ts)] WARN: state.liveConfigHash does NOT match current LIVE config" >&2
  fi
else
  echo "[$(ts)] NOTE: skipping liveConfigHash comparison (no cast or missing config); marking hash_match=UNKNOWN"
fi

mkdir -p "$(dirname "$TEXTFILE_PATH")"

cat > "$TEXTFILE_PATH" <<EOF
# HELP void_mainnet_run_state Planning-only view of VOID mainnet bootstrap RUN state
# TYPE void_mainnet_run_state gauge
void_mainnet_run_state{status="${status_raw}",plan_version="${planVersion}",hash_match="${hash_label}"} 1

# HELP void_mainnet_run_status Numeric RUN status (0=NOT_STARTED,1=IN_PROGRESS,2=COMPLETED,-1=FAILED,-2=UNKNOWN)
# TYPE void_mainnet_run_status gauge
void_mainnet_run_status ${status_code}

# HELP void_mainnet_run_chainid Config chainId associated with RUN state
# TYPE void_mainnet_run_chainid gauge
void_mainnet_run_chainid ${chainId}
EOF

echo "[$(ts)] wrote metrics to $TEXTFILE_PATH"
echo "[$(ts)] RESULT: OK (planning-only RUN state exported)"
