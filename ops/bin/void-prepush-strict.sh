#!/usr/bin/env bash
set -euo pipefail
export PATH="/usr/bin:/bin:/usr/sbin:/sbin:/usr/local/bin"

cd "${HOME}/dev/void-node"

: "${PROM:=http://127.0.0.1:9090}"
export PROM

# Strict by default (as before)
export VOID_ENFORCE_PILLARS_ADDONS="${VOID_ENFORCE_PILLARS_ADDONS:-1}"

# Small helper: Prom scalar-safe value fetch
prom_scalar () {
  local q="$1"
  curl -fsS --max-time 3 -G "${PROM}/api/v1/query" \
    --data-urlencode "query=${q}" \
  | jq -r '
      if .data.resultType=="scalar" then (.data.result[1] // "")
      elif .data.resultType=="vector" then (.data.result[0].value[1] // "")
      else "" end
    ' 2>/dev/null || true
}

REV="$(git rev-parse --short HEAD 2>/dev/null || echo "<no-git>")"
echo "[ok] prepush-strict $(date -Is) rev=${REV}"

# Quick visibility breadcrumbs (don’t fail here; the checker enforces)
ARS_UP="$(prom_scalar 'scalar(up{job="void-agent-receipts-split"} == 1)')"
ADDONS_OK="$(prom_scalar 'void_pillars_addons_health_scalar')"
echo "agent_receipts_split_up_scalar=${ARS_UP:-<empty>}"
echo "pillars_addons_health_scalar=${ADDONS_OK:-<empty>}"

exec bash ops/bin/void-proposer-v3b-pillars-check.sh
