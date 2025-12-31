
DN_OVERALL_WITH_TIMER="$(curl -fsS -G "$PROM/api/v1/query" --data-urlencode 'query=void_datanet_overall_health_with_timer' | jq -r '.data.result[0].value[1] // empty' 2>/dev/null || true)"
#!/usr/bin/env bash
set -euo pipefail

run_quiet_tail() {
  local label="$1"; shift
  local out="/tmp/void-pillars.${label}.$(date +%Y%m%d-%H%M%S).log"
  if ! "$@" >"$out" 2>&1; then
    echo "[ERR] $label failed. last 120 lines: $out"
    tail -n 120 "$out" || true
    return 1
  fi
  return 0
}
cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)" || exit 1

# Canonical gate (current): pillars-lite health-all
exec bash ops/void-pillars-health-all.sh
