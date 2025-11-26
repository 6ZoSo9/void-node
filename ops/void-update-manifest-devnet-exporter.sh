#!/usr/bin/env bash
set -euo pipefail

# VOID devnet update-manifest exporter
# - Reads docs/VOID-DEVNET-UPDATE-MANIFEST.json
# - Emits gauges:
#     void_update_manifest_devnet_configured
#     void_update_manifest_devnet_days_left
#     void_update_manifest_devnet_health
#
# NOTE: This is designed to be run as root (sudo -E) because it writes into
#       /var/lib/node_exporter/textfile_collector.

# Resolve repo root (.. from ops/)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="${REPO:-$(cd "${SCRIPT_DIR}/.." && pwd)}"

MANIFEST="${REPO}/docs/VOID-DEVNET-UPDATE-MANIFEST.json"
PROM_DIR="/var/lib/node_exporter/textfile_collector"
OUT_FILE="${PROM_DIR}/void_update_manifest_devnet.prom"

chain="devnet"
chainId="2050"

configured=0
days_left=-1
health=0

if [[ -f "${MANIFEST}" ]]; then
  configured=1

  # Try to read .expiresAt from manifest (ISO8601 UTC, e.g. 2025-12-20T00:00:00Z)
  expires_at=""
  if command -v jq >/dev/null 2>&1; then
    expires_at="$(jq -r '.expiresAt // empty' "${MANIFEST}" 2>/dev/null || echo "")"
  fi

  if [[ -n "${expires_at}" ]]; then
    # Convert to epoch seconds
    if expires_epoch=$(date -ud "${expires_at}" +%s 2>/dev/null); then
      now_epoch=$(date -u +%s)
      diff=$(( expires_epoch - now_epoch ))

      # Compute integer day difference (can be negative)
      days_left=$(( diff / 86400 ))

      if (( diff >= 0 )); then
        health=1
      else
        health=0
      fi
    else
      # Bad date format -> unknown/unsafe
      days_left=-1
      health=0
    fi
  else
    # No expiresAt -> unknown/unsafe
    days_left=-1
    health=0
  fi
else
  configured=0
  days_left=-1
  health=0
fi

# Ensure output dir exists
mkdir -p "${PROM_DIR}"

# Safe write via mktemp+mv
tmp_file="$(mktemp "${PROM_DIR}/void_update_manifest_devnet.prom.tmp.XXXXXX")"

{
  echo "# HELP void_update_manifest_devnet_configured 1 if devnet update manifest file exists, else 0"
  echo "# TYPE void_update_manifest_devnet_configured gauge"
  echo "void_update_manifest_devnet_configured{chain=\"${chain}\",chainId=\"${chainId}\"} ${configured}"
  echo
  echo "# HELP void_update_manifest_devnet_days_left Days until manifest expiry on VOID devnet (integer; -1=unknown)"
  echo "# TYPE void_update_manifest_devnet_days_left gauge"
  echo "void_update_manifest_devnet_days_left{chain=\"${chain}\",chainId=\"${chainId}\"} ${days_left}"
  echo
  echo "# HELP void_update_manifest_devnet_health 1 if manifest present and not expired, else 0"
  echo "# TYPE void_update_manifest_devnet_health gauge"
  echo "void_update_manifest_devnet_health{chain=\"${chain}\",chainId=\"${chainId}\"} ${health}"
} > "${tmp_file}"

mv "${tmp_file}" "${OUT_FILE}"

echo "[ok] wrote ${OUT_FILE}"
echo "     configured=${configured} days_left=${days_left} health=${health}"
echo "     manifest=${MANIFEST}"

# void-update-manifest-devnet:fix-perms-v1
# Ensure textfile is always world-readable for node_exporter
if [ -n "${out_file:-}" ] && [ -f "$out_file" ]; then
  chmod 644 "$out_file" 2>/dev/null || true
fi

# --- perms guard: ensure textfile is world-readable for node_exporter ---
if [ -n "${OUT_FILE:-}" ] && [ -f "$OUT_FILE" ]; then
  chmod 0644 "$OUT_FILE" || true
fi
# --- end perms guard ---
