#!/usr/bin/env bash
set -euo pipefail

# VOID Work Credits (WC) metrics exporter (stub).
# Off-chain scoreboard only, not the real WC token.

# Make sure files are world-readable so node_exporter (non-root) can read them.
umask 022

TEXTFILE_DIR="${TEXTFILE_DIR:-/var/lib/node_exporter/textfile_collector}"
OUT="${TEXTFILE_DIR}/void-work-credits.prom"

mkdir -p "$TEXTFILE_DIR"

tmp="$(mktemp)"

{
  echo "# HELP void_work_credits_total Total work credits by agent/pillar/category (off-chain scoreboard)."
  echo "# TYPE void_work_credits_total counter"

  # Stub values for now.
  echo "void_work_credits_total{agent=\"zoso\",pillar=\"mainnet-core\",category=\"bootstrap\"} 100"
  echo "void_work_credits_total{agent=\"ai\",pillar=\"mainnet-core\",category=\"design\"} 200"
} > "$tmp"

mv "$tmp" "$OUT"
chmod 644 "$OUT"
