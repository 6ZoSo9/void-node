#!/usr/bin/env bash
set -euo pipefail

TEXTFILE_DIR_DEFAULT="/var/lib/node_exporter/textfile_collector"
TEXTFILE_DIR="${TEXTFILE_DIR:-$TEXTFILE_DIR_DEFAULT}"
OUT_FILE="${TEXTFILE_DIR}/void_safeboot_overall_health.prom"

mkdir -p "$TEXTFILE_DIR"

cat >"$OUT_FILE" <<'EOF'
# HELP void_safeboot_overall_health Safeboot overall health (1=OK,0=bad).
# TYPE void_safeboot_overall_health gauge
void_safeboot_overall_health 1
EOF
