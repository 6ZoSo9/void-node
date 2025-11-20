#!/usr/bin/env bash
set -euo pipefail

REPO="${REPO:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"
OUT_DIR="${OUT_DIR:-/var/lib/node_exporter/textfile_collector}"
OUT_FILE="$OUT_DIR/void_mainnet_core.prom"

mkdir -p "$OUT_DIR"

if [[ ! -w "$OUT_DIR" ]]; then
  echo "[mainnet-core] FATAL: OUT_DIR=$OUT_DIR not writable (run via sudo or fix perms)" >&2
  exit 1
fi

prom_scalar_or_zero() {
  local q="$1"
  local val="NaN"

  # Best-effort GET; treat any error/missing result as 0
  if out=$(curl -fsS "$PROM_URL/api/v1/query?query=$q" 2>/dev/null || true); then
    val=$(printf '%s\n' "$out" | jq -r '.data.result[0].value[1]' 2>/dev/null || echo "NaN")
  fi

  if [[ -z "$val" || "$val" == "NaN" || "$val" == "null" ]]; then
    echo "0"
  else
    echo "$val"
  fi
}

# 1) Node core overall (safeboot stack)
safeboot_overall="$(prom_scalar_or_zero 'void:safeboot:overall')"

# 2) Devnet overall (5m-smoothed)
devnet_overall_5m="$(prom_scalar_or_zero 'void:devnet_overall:max_5m')"

# 3) Update manifest gate from textfile exporter
mf="$OUT_DIR/void_update_manifest_devnet.prom"

manifest_configured="0"
manifest_days_left="0"
manifest_health="0"

if [[ -r "$mf" ]]; then
  v=$(awk '/^void_update_manifest_devnet_configured/ {print $2; exit}' "$mf" 2>/dev/null || true)
  [[ -n "${v:-}" ]] && manifest_configured="$v"

  v=$(awk '/^void_update_manifest_devnet_days_left/ {print $2; exit}' "$mf" 2>/dev/null || true)
  [[ -n "${v:-}" ]] && manifest_days_left="$v"

  v=$(awk '/^void_update_manifest_devnet_health/ {print $2; exit}' "$mf" 2>/dev/null || true)
  [[ -n "${v:-}" ]] && manifest_health="$v"
fi

manifest_ok="0"
# Treat: configured==1, health==1, days_left>0 as good
if [[ "$manifest_configured" == "1" && "$manifest_health" == "1" ]]; then
  dl_int="${manifest_days_left%%.*}"
  if [[ -n "$dl_int" ]]; then
    if (( dl_int > 0 )); then
      manifest_ok="1"
    fi
  fi
fi

core_health="1"
for v in "$safeboot_overall" "$devnet_overall_5m" "$manifest_ok"; do
  if [[ "$v" != "1" ]]; then
    core_health="0"
  fi
done

tmp_file="$(mktemp "$OUT_DIR/.void_mainnet_core.prom.$$XXXX")"

{
  echo "# HELP void_mainnet_core_health Overall VOID mainnet-core readiness (0..1)"
  echo "# TYPE void_mainnet_core_health gauge"
  echo "void_mainnet_core_health $core_health"

  echo "# HELP void_mainnet_core_safeboot_overall safeboot overall gauge (0..1)"
  echo "# TYPE void_mainnet_core_safeboot_overall gauge"
  echo "void_mainnet_core_safeboot_overall $safeboot_overall"

  echo "# HELP void_mainnet_core_devnet_overall devnet overall health (0..1, 5m smoothed)"
  echo "# TYPE void_mainnet_core_devnet_overall gauge"
  echo "void_mainnet_core_devnet_overall $devnet_overall_5m"

  echo "# HELP void_mainnet_core_manifest_health update manifest gate (0..1; 1 means configured, healthy, non-expired)"
  echo "# TYPE void_mainnet_core_manifest_health gauge"
  echo "void_mainnet_core_manifest_health $manifest_ok"

  echo "# HELP void_mainnet_core_manifest_days_left days left on devnet update manifest (0=bad/unknown)"
  echo "# TYPE void_mainnet_core_manifest_days_left gauge"
  echo "void_mainnet_core_manifest_days_left $manifest_days_left"
} >"$tmp_file"

mv "$tmp_file" "$OUT_FILE"

echo "[mainnet-core] safeboot_overall=$safeboot_overall devnet_overall_5m=$devnet_overall_5m manifest_ok=$manifest_ok manifest_days_left=$manifest_days_left" >&2
echo "[mainnet-core] wrote $OUT_FILE with void_mainnet_core_health=$core_health" >&2
