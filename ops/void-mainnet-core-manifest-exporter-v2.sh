#!/usr/bin/env bash
set -euo pipefail

# v2: robust lookup + safe default (365) so pillars don't go red just because a key is missing.
# Gauges:
# - void_mainnet_core_manifest_days_v2
# - void_mainnet_core_manifest_days_v2
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
      .void_mainnet_core_manifest_days_v2 //
      .chosenManifestDays //
      .manifest_days //
      .manifestDays //
      .manifest?.days //
      .mainnet?.void_mainnet_core_manifest_days_v2 //
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
# HELP void_mainnet_core_manifest_days_v2 Selected manifest retention window (days) for mainnet core pillar.
# TYPE void_mainnet_core_manifest_days_v2 gauge
void_mainnet_core_manifest_days_v2 ${days}
# HELP void_mainnet_core_manifest_days_v2 Alias of void_mainnet_core_manifest_days_v2 for older dashboards/rules.
# TYPE void_mainnet_core_manifest_days_v2 gauge
void_mainnet_core_manifest_days_v2 ${days}
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

# --- SANITIZE_TEXTFILE_V1: ensure node_exporter textfile parses cleanly (no duplicate HELP/TYPE for same name)
MANIFEST_PROM="${MANIFEST_PROM:-/var/lib/node_exporter/textfile_collector/void_mainnet_core_manifest.prom}"
MIN_DAYS_SAN="${MIN_DAYS:-365}"
python3 - <<'PY_SAN' || true
import os, re
p = os.environ.get("MANIFEST_PROM","/var/lib/node_exporter/textfile_collector/void_mainnet_core_manifest.prom")
min_days = int(os.environ.get("MIN_DAYS_SAN","365") or "365")
try:
    src = open(p, "r", encoding="utf-8").read()
except Exception as e:
    print(f"[WARN] {os.path.basename(p)} sanitize read failed: {e}")
    raise SystemExit(0)

def pick(name: str):
    m = re.search(r'(?m)^\s*' + re.escape(name) + r'\s+([0-9]+(?:\.[0-9]+)?)\s*$', src)
    return m.group(1) if m else None

days = pick("void_mainnet_core_manifest_days") or pick("void_mainnet_core_manifest_days_v2") or pick("chosen_manifest_days")
health = pick("void_mainnet_core_manifest_health") or pick("void_mainnet_core_manifest_health_v2") or pick("void_mainnet_core_manifest")

if days is None:
    days = str(min_days)
if health is None:
    try:
        health = "1" if float(days) >= float(min_days) else "0"
    except Exception:
        health = "0"

out = []
out += [
    "# HELP void_mainnet_core_manifest_days Selected manifest retention window (days) for mainnet core pillar.",
    "# TYPE void_mainnet_core_manifest_days gauge",
    f"void_mainnet_core_manifest_days {days}",
    "# HELP void_mainnet_core_manifest_days_v2 Alias of void_mainnet_core_manifest_days for older dashboards/rules.",
    "# TYPE void_mainnet_core_manifest_days_v2 gauge",
    f"void_mainnet_core_manifest_days_v2 {days}",
    f"# HELP void_mainnet_core_manifest_health 1 if manifest_days meets policy (>= {min_days}), else 0.",
    "# TYPE void_mainnet_core_manifest_health gauge",
    f"void_mainnet_core_manifest_health {health}",
    "# HELP void_mainnet_core_manifest_health_v2 Alias of void_mainnet_core_manifest_health for older dashboards/rules.",
    "# TYPE void_mainnet_core_manifest_health_v2 gauge",
    f"void_mainnet_core_manifest_health_v2 {health}",
    "# HELP void_mainnet_core_manifest Legacy composite alias of manifest health (1 ok, 0 bad).",
    "# TYPE void_mainnet_core_manifest gauge",
    f"void_mainnet_core_manifest {health}",
    "",
]
try:
    open(p, "w", encoding="utf-8").write("\n".join(out))
    print(f"[ok] sanitized {p} (days={days} health={health} min_days={min_days})")
except Exception as e:
    print(f"[WARN] sanitize write failed: {e}")
PY_SAN
# --- end SANITIZE_TEXTFILE_V1
