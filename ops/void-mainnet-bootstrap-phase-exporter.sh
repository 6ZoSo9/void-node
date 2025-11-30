#!/usr/bin/env bash
set -euo pipefail

# PLAN-aware bootstrap phase exporter
#
# Codes:
#   0 = PRE  (PLAN not ready / missing)
#   1 = A    (PLAN ready: plan_health == 1)
#   2 = B    (reserved for later)
#   3 = C    (reserved for later)

METRICS_DIR="${METRICS_DIR:-/var/lib/node_exporter/textfile_collector}"
METRICS_FILE="${METRICS_FILE:-${METRICS_DIR}/void_mainnet_bootstrap_phase.prom}"
PLAN_FILE="${PLAN_FILE:-${METRICS_DIR}/void_mainnet_bootstrap_plan.prom}"

mkdir -p "$METRICS_DIR"

phase="PRE"
code=0
reason="plan_file_missing"

if [[ -r "$PLAN_FILE" ]]; then
  # Last occurrence of the plan health metric in the textfile truth
  raw_line="$(grep -E '^[[:space:]]*void_mainnet_bootstrap_plan_health[[:space:]]' "$PLAN_FILE" | tail -n1 || true)"
  if [[ -n "$raw_line" ]]; then
    val="$(awk '{print $NF}' <<<"$raw_line" || echo "")"
    if [[ "$val" == "1" ]]; then
      phase="A"
      code=1
      reason="plan_ready"
    else
      reason="plan_not_ready"
    fi
  else
    reason="plan_metric_missing"
  fi
fi

tmp_file="$(mktemp "${METRICS_DIR}/.void_mainnet_bootstrap_phase.prom.tmp.XXXXXX")"

cat >"$tmp_file" <<EOM
# HELP void_mainnet_bootstrap_phase_code Bootstrap phase code (0=PRE,1=A,2=B,3=C)
# TYPE void_mainnet_bootstrap_phase_code gauge
void_mainnet_bootstrap_phase_code{phase="${phase}",reason="${reason}"} ${code}
EOM

mv "$tmp_file" "$METRICS_FILE"

echo "[phase-exporter] wrote ${METRICS_FILE} with phase=${phase} code=${code} reason=${reason}"
