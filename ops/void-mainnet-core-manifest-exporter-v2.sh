#!/usr/bin/env bash
set -euo pipefail

# v2: robust lookup + safe default (365) so pillars don't go red just because a key is missing.
# Gauges:
# - void_mainnet_core_manifest_days
# - chosen_manifest_days
# - void_mainnet_core_manifest_health
# - void_mainnet_core_manifest

if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
  exec sudo -n "$0" "$@"
fi

ROOT="${ROOT:-/home/zoso/dev/void-node}"
OUTDIR="/var/lib/node_exporter/textfile_collector"
OUTFILE="$OUTDIR/void_mainnet_core_manifest.prom"
TMP="$OUTFILE.tmp.$$"

min_days="${MIN_DAYS:-365}"

pick_days_from_json() {
  local f="$1"
  jq -r '
    (
      .chosen_manifest_days //
      .chosenManifestDays //
      .manifest_days //
      .manifestDays //
      .manifest?.days //
      .mainnet?.chosen_manifest_days //
      .mainnet?.manifest_days //
      empty
    )' "$f" 2>/dev/null | head -n 1
}

CFG=""
days=""

# 1) exact known paths
for c in \
  "$ROOT/config/void-mainnet-bootstrap-mainnet.live.json" \
  "$ROOT/config/void-mainnet-bootstrap-mainnet.template.json" \
  "$ROOT/config/void-mainnet-bootstrap-mainnet.json" \
  "$ROOT/docs/void-mainnet-bootstrap-mainnet.live.json" \
  "$ROOT/docs/void-mainnet-bootstrap-mainnet.template.json" \
  "$ROOT/docs/VOID-MAINNET-BOOTSTRAP-MAINNET.live.json" \
  "$ROOT/docs/VOID-MAINNET-BOOTSTRAP-MAINNET.template.json"
do
  if [[ -f "$c" ]]; then
    CFG="$c"
    break
  fi
done

# 2) if jq + still no days, scan for likely json files in repo
if command -v jq >/dev/null 2>&1; then
  if [[ -n "$CFG" ]]; then
    days="$(pick_days_from_json "$CFG" || true)"
  fi
  if [[ -z "${days:-}" || "$days" == "null" ]]; then
    while IFS= read -r f; do
      v="$(pick_days_from_json "$f" || true)"
      if [[ -n "${v:-}" && "$v" != "null" ]]; then
        CFG="$f"
        days="$v"
        break
      fi
    done < <(find "$ROOT/config" "$ROOT/docs" -maxdepth 2 -type f -name '*mainnet*bootstrap*.json' 2>/dev/null | sort)
  fi
fi

# 3) sanitize + default
if [[ -z "${days:-}" || "$days" == "null" ]]; then
  days="$min_days"
  CFG="<default:$min_days>"
fi
if ! [[ "$days" =~ ^-?[0-9]+$ ]]; then
  days="$min_days"
  CFG="<default:$min_days>"
fi

health="0"
if [[ "$days" =~ ^[0-9]+$ ]] && [[ "$days" -ge "$min_days" ]]; then
  health="1"
fi

mkdir -p "$OUTDIR"
cat > "$TMP" <<METRICS
# HELP void_mainnet_core_manifest_days Selected manifest retention window (days) for mainnet core pillar.
# TYPE void_mainnet_core_manifest_days gauge
void_mainnet_core_manifest_days ${days}
# HELP chosen_manifest_days Alias of void_mainnet_core_manifest_days for older dashboards/rules.
# TYPE chosen_manifest_days gauge
chosen_manifest_days ${days}
# HELP void_mainnet_core_manifest_health 1 if manifest_days meets policy (>=${min_days}), else 0.
# TYPE void_mainnet_core_manifest_health gauge
void_mainnet_core_manifest_health ${health}
# HELP void_mainnet_core_manifest Legacy composite alias of manifest health (1 ok, 0 bad).
# TYPE void_mainnet_core_manifest gauge
void_mainnet_core_manifest ${health}
METRICS

mv -f "$TMP" "$OUTFILE"
chmod 0644 "$OUTFILE"
echo "[ok] wrote $OUTFILE (days=$days health=$health cfg=$CFG min_days=$min_days)"
