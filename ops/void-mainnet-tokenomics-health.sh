#!/usr/bin/env bash
set -euo pipefail

PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

log() {
  echo "[mainnet-tokenomics] $*"
}

# Query helper: returns scalar value or "null"
q() {
  local expr="$1"
  curl -fsS "$PROM_URL/api/v1/query" \
    --get \
    --data-urlencode "query=$expr" \
  | jq -r '.data.result[0].value[1] // "null"' \
  || echo "null"
}

log "prom_url=$PROM_URL"

tok_rec=$(q 'void:mainnet_tokenomics:health:last_5m')
tok_raw=$(q 'void_mainnet_tokenomics_health')

log "gauges:"
log "  void_mainnet_tokenomics_health              = $tok_raw"
log "  void:mainnet_tokenomics:health:last_5m      = $tok_rec"

status=0

if [[ "$tok_rec" != "1" ]]; then
  log "FAIL: void:mainnet_tokenomics:health:last_5m != 1"
  status=1
fi

# Raw gauge is best-effort; warn if present and bad, but don't fail the gate on it yet.
if [[ "$tok_raw" != "1" && "$tok_raw" != "null" ]]; then
  log "WARN: void_mainnet_tokenomics_health != 1 (value=$tok_raw)"
fi

if [[ $status -eq 0 ]]; then
  log "RESULT: OK (mainnet tokenomics pillar healthy)"
else
  log "RESULT: BAD (mainnet tokenomics pillar failed)"
fi

exit "$status"
