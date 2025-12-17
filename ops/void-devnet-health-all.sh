#!/usr/bin/env bash
set -euo pipefail

REPO=${REPO:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}
PROM_URL=${PROM_URL:-http://127.0.0.1:9090}

cd "$REPO"

log() {
  echo "[health-all] $*"
}

prom_query() {
  local q="$1"
  curl -fsS "$PROM_URL/api/v1/query" \
    --get --data-urlencode "query=$q" \
    | jq -r '.data.result[0].value[1] // empty'
}

log "repo=$REPO"
log "prom_url=$PROM_URL"

# --------------------------------------------------------------------
# STEP 1: Full devnet CI smoke (jobs/receipts + Agent/Model/Dataset)
# --------------------------------------------------------------------
log "step 1: devnet FULL CI smoke..."
./ops/void-devnet-full-ci-smoke.sh
log "step 1: FULL CI smoke OK"

# --------------------------------------------------------------------
# STEP 2: Update manifest sanity (devnet)
#   Source of truth = exporter script (sudo)
#   - configured == 1
#   - health == 1
#   - days_left > 0
#   Prom gauges are best-effort only.
# --------------------------------------------------------------------
log "step 2: update-manifest sanity (devnet)..."

EXPORTER="./ops/void-update-manifest-devnet-exporter.sh"
if [[ ! -x "$EXPORTER" ]]; then
  log "ERROR: exporter not found or not executable: $EXPORTER"
  exit 1
fi

log "running update-manifest exporter via sudo..."
EXPORT_OUT="$(sudo -E "$EXPORTER")" || {
  log "ERROR: exporter failed"
  echo "$EXPORT_OUT"
  exit 1
}

# prefix exporter output for clarity
echo "$EXPORT_OUT" | sed 's/^/[update-exporter] /'

# Expect a line like:
# [ok] wrote ... configured=1 days_left=29 health=1 manifest=/path/...
cfg_line="$(printf '%s\n' "$EXPORT_OUT" | grep 'configured=' || true)"

if [[ -z "$cfg_line" ]]; then
  log "ERROR: could not find configured/days_left/health line in exporter output."
  exit 1
fi

configured="$(sed -n 's/.*configured=\([0-9.]\+\).*/\1/p' <<<"$cfg_line")"
days_left="$(sed -n 's/.*days_left=\([0-9.-]\+\).*/\1/p' <<<"$cfg_line")"
update_health="$(sed -n 's/.*health=\([0-9.]\+\).*/\1/p' <<<"$cfg_line")"
manifest_path="$(sed -n 's/.*manifest=\([^ ]\+\).*/\1/p' <<<"$cfg_line" || true)"

log "update-manifest exporter parsed:"
log "  configured   = ${configured:-<empty>}"
log "  days_left    = ${days_left:-<empty>}"
log "  health       = ${update_health:-<empty>}"
log "  manifest     = ${manifest_path:-<unknown>}"

# Basic presence checks
if [[ -z "${configured:-}" || -z "${days_left:-}" || -z "${update_health:-}" ]]; then
  log "ERROR: exporter did not provide configured/days_left/health."
  exit 1
fi

# Configured must be exactly 1
if [[ "$configured" != "1" ]]; then
  log "ERROR: update-manifest configured != 1 (got: $configured)"
  exit 1
fi

# Health must be exactly 1
if [[ "$update_health" != "1" ]]; then
  log "ERROR: update-manifest health != 1 (got: $update_health)"
  exit 1
fi

# days_left must be > 0 (0 or negative is bad)
if [[ "$days_left" == "" ]]; then
  log "ERROR: update-manifest days_left is empty."
  exit 1
fi

if [[ "$days_left" == -* ]]; then
  log "ERROR: update-manifest days_left is negative (got: $days_left)"
  exit 1
fi

case "$days_left" in
  0|0.0|0.00)
    log "ERROR: update-manifest days_left == $days_left (must be > 0)."
    exit 1
    ;;
esac

log "step 2: update-manifest exporter sanity OK (configured=1, health=1, days_left=$days_left)"

# Best-effort Prometheus snapshot for visibility only
cfg_q='void_update_manifest_devnet_configured'
days_q='void_update_manifest_devnet_days_left'
health_q='void_update_manifest_devnet_health'

cfg_prom="$(prom_query "$cfg_q" || true)"
days_prom="$(prom_query "$days_q" || true)"
health_prom="$(prom_query "$health_q" || true)"

log "update-manifest Prometheus snapshot (best-effort):"
log "  $cfg_q   = ${cfg_prom:-<none>}"
log "  $days_q  = ${days_prom:-<none>}"
log "  $health_q = ${health_prom:-<none>}"
log "  (missing Prom gauges are NOT fatal; exporter is the source of truth)"

# --------------------------------------------------------------------
# STEP 3: Overall devnet health gauge sanity
#   - void:devnet_overall_with_jobs_v2:health:last_5m == 1
#   - void:devnet_overall:max_5m == 1
# --------------------------------------------------------------------
log "step 3: Prometheus overall devnet health sanity..."

overall_q='void:devnet_overall_with_jobs_v2:health:last_5m'
max5_q='void:devnet_overall:max_5m'

overall="$(prom_query "$overall_q" || true)"
max5m="$(prom_query "$max5_q" || true)"

log "overall gauges:"
log "  $overall_q          = ${overall:-<empty>}"
log "  $max5_q = ${max5m:-<empty>}"

if [[ -z "${overall:-}" || -z "${max5m:-}" ]]; then
  log "ERROR: overall health gauges missing (void:devnet_overall_with_jobs_v2:health:last_5m / void:devnet_overall:max_5m)."
  exit 1
fi

if [[ "$overall" != "1" ]]; then
  log "ERROR: void:devnet_overall_with_jobs_v2:health:last_5m != 1 (got: $overall)"
  exit 1
fi

if [[ "$max5m" != "1" ]]; then
  log "ERROR: void:devnet_overall:max_5m != 1 (got: $max5m)"
  exit 1
fi

log "step 3: overall devnet health gauges OK"

log "RESULT: OK (FULL CI smoke + update-manifest exporter healthy + devnet overall health==1)"

echo
echo "[health-all] step 4: devnet agent health-all (AgentRegistry + ReceiptRegistry)..."
ops/void-devnet-agent-health-all.sh

echo
echo "=== [gate] devnet receipts e2e (must be ok=1) ==="
./ops/void-devnet-receipts-e2e-gate.sh

