#!/usr/bin/env bash
set -euo pipefail

ROOT="${ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"
TEXTFILE_DIR="${TEXTFILE_DIR:-/var/lib/node_exporter/textfile_collector}"
OUT_FILE="${TEXTFILE_DIR}/void_mainnet_run_pillar.prom"

log() {
  echo "[run-exporter] $*" >&2
}

tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT

pillar_ok=0
phase="error"
state_status="UNKNOWN"
hash_match="UNKNOWN"
status_numeric=-1

query_prom() {
  local expr="$1"
  curl -fsS "${PROM_URL}/api/v1/query" \
    --get --data-urlencode "query=${expr}"
}

log "PROM_URL=${PROM_URL}"

status_json=""
state_json=""

if ! status_json="$(query_prom 'void_mainnet_run_status')"; then
  log "ERROR: failed to query void_mainnet_run_status"
  phase="error_query_status"
  status_numeric=-1
  state_status="UNKNOWN"
  hash_match="UNKNOWN"
else
  status_numeric="$(jq -r '.data.result[0].value[1] // "0"' <<<"$status_json" | awk '{printf "%d\n", $1}')"
  log "status_numeric=${status_numeric}"
fi

if ! state_json="$(query_prom 'void_mainnet_run_state')"; then
  log "ERROR: failed to query void_mainnet_run_state"
  phase="error_query_state"
  state_status="UNKNOWN"
  hash_match="UNKNOWN"
else
  state_status="$(jq -r '.data.result[0].metric.status // "UNKNOWN"' <<<"$state_json")"
  hash_match="$(jq -r '.data.result[0].metric.hash_match // "UNKNOWN"' <<<"$state_json")"
  log "state_status=${state_status} hash_match=${hash_match}"
fi

pillar_ok=0
phase="unknown"

if [[ "${hash_match}" == "MISMATCH" ]]; then
  phase="hash_mismatch"
  pillar_ok=0
else
  case "${state_status}" in
    NOT_STARTED)
      if (( status_numeric == 0 )); then
        pillar_ok=1
        phase="planning_not_started"
      else
        pillar_ok=0
        phase="bad_not_started_status_nonzero"
      fi
      ;;
    IN_PROGRESS)
      pillar_ok=0
      phase="in_progress"
      ;;
    COMPLETED)
      if (( status_numeric == 1 )); then
        pillar_ok=1
        phase="completed"
      else
        pillar_ok=0
        phase="bad_completed_status_zero"
      fi
      ;;
    *)
      pillar_ok=0
      phase="unknown_state_${state_status}"
      ;;
  esac
fi

log "pillar_ok=${pillar_ok} phase=${phase}"

if [[ ! -d "${TEXTFILE_DIR}" ]]; then
  log "ERROR: TEXTFILE_DIR=${TEXTFILE_DIR} does not exist"
  exit 1
fi

cat > "${tmp}" <<EOF
# HELP void_mainnet_run_pillar_ok RUN pillar health (1 ok, 0 bad)
# TYPE void_mainnet_run_pillar_ok gauge
void_mainnet_run_pillar_ok ${pillar_ok}

# HELP void_mainnet_run_pillar_status Raw RUN status gauge from sentinel (0=NOT_STARTED,1=COMPLETED; planning-only for now)
# TYPE void_mainnet_run_pillar_status gauge
void_mainnet_run_pillar_status ${status_numeric}

# HELP void_mainnet_run_pillar_info Extra info about RUN pillar state
# TYPE void_mainnet_run_pillar_info gauge
void_mainnet_run_pillar_info{state="${state_status}",phase="${phase}",hash_match="${hash_match}"} 1
EOF

mv "${tmp}" "${OUT_FILE}"
chown node_exporter:node_exporter "${OUT_FILE}" || log "WARN: chown node_exporter failed (ignore if service runs as root)"
chmod 0644 "${OUT_FILE}" || log "WARN: chmod failed (ignore if already readable)"

log "wrote ${OUT_FILE}"
log "DONE"
