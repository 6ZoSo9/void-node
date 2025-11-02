#!/usr/bin/env bash
set -euo pipefail

# Where node_exporter reads textfile metrics. Common default paths:
CANDIDATES=(
  "/var/lib/node_exporter/textfile_collector"
  "/var/lib/node_exporter"
  "/var/tmp/node-exporter"
)

OUTDIR=""
for d in "${CANDIDATES[@]}"; do
  if [ -d "$d" ] && [ -w "$d" ]; then OUTDIR="$d"; break; fi
done

# Fallback: create a sane location if none exist yet
if [ -z "$OUTDIR" ]; then
  OUTDIR="/var/lib/node_exporter/textfile_collector"
  mkdir -p "$OUTDIR"
fi

SNAP_DIR="/home/zoso/dev/void-node/ops/prom-snap"
LATEST="$(ls -1 "$SNAP_DIR" 2>/dev/null | tail -n1 || true)"
now=$(date +%s)

if [ -z "$LATEST" ]; then
  # No snapshots yet: publish a big age to trip alerts clearly
  age=$(( 86400 * 365 ))
else
  mtime=$(stat -c %Y "$SNAP_DIR/$LATEST")
  age=$(( now - mtime ))
fi

TMP="$(mktemp)"
{
  echo "# HELP void_ops_prom_snap_age_seconds Seconds since last Prom snapshot landed"
  echo "# TYPE void_ops_prom_snap_age_seconds gauge"
  echo "void_ops_prom_snap_age_seconds $age"
} > "$TMP"
mv -f "$TMP" "$OUTDIR/void_prom_snap.prom"
