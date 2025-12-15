#!/usr/bin/env bash
set -euo pipefail

TEXT="/var/lib/node_exporter/textfile_collector"
PROM="${PROM:-http://127.0.0.1:9090}"
NODEX="${NODEX:-http://127.0.0.1:9100}"
OUT="${OUT:-$TEXT/void_pillars.prom}"

prom_q() {
  local expr="$1"
  curl -fsS --get "$PROM/api/v1/query" --data-urlencode "query=$expr" \
    | jq -r '.data.result[0].value[1] // empty' 2>/dev/null || true
}

prom_first() {
  # usage: prom_first 'expr1' 'expr2' ...
  local v=""
  for e in "$@"; do
    v="$(prom_q "$e")"
    if [[ -n "${v:-}" ]]; then
      echo "$v"
      return 0
    fi
  done
  return 1
}

node_metric() {
  local name="$1"
  curl -fsS "$NODEX/metrics" 2>/dev/null \
    | awk -v n="$name" '$1==n {print $2; exit}' || true
}

node_first() {
  local v=""
  for n in "$@"; do
    v="$(node_metric "$n")"
    if [[ -n "${v:-}" ]]; then
      echo "$v"
      return 0
    fi
  done
  return 1
}

is_one() {
  local v="${1:-}"
  [[ "$v" == "1" || "$v" == "1.0" || "$v" == "1.000000" ]]
}

tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT

# Prefer Prom recording rules when available; fall back to node_exporter gauges.
devnet_ok="$(prom_first \
  'max(void:devnet_overall_v2:health:last_5m)' \
  'max(void_devnet_overall_health)' \
  'max(void:devnet_overall:health:last_5m)' \
  2>/dev/null || true)"
[[ -z "${devnet_ok:-}" ]] && devnet_ok="$(node_first 'void_devnet_overall_health' 'void_devnet_overall' 2>/dev/null || true)"

safeboot_ok="$(prom_first \
  'max(safeboot_overall)' \
  'max(void_safeboot_overall)' \
  'max(void:safeboot_overall:health:last_5m)' \
  2>/dev/null || true)"
[[ -z "${safeboot_ok:-}" ]] && safeboot_ok="$(node_first 'safeboot_overall' 'void_safeboot_overall' 2>/dev/null || true)"

mainnet_ok="$(prom_first \
  'max(void:mainnet_pillars_with_validators:health:last_5m)' \
  'max(void:mainnet_pillars:health_with_keys:last_5m)' \
  'max(void:mainnet_pillars:health:last_5m)' \
  'max(void_mainnet_pillars_health)' \
  2>/dev/null || true)"
[[ -z "${mainnet_ok:-}" ]] && mainnet_ok="$(node_first 'void_mainnet_pillars_health' 'void_mainnet_core_health' 2>/dev/null || true)"

s_ok=0; d_ok=0; m_ok=0
is_one "$safeboot_ok" && s_ok=1
is_one "$devnet_ok"   && d_ok=1
is_one "$mainnet_ok"  && m_ok=1

health=0
[[ $s_ok -eq 1 && $d_ok -eq 1 && $m_ok -eq 1 ]] && health=1

now="$(date +%s)"

cat > "$tmp" <<EOF
# HELP void_pillars_safeboot_ok Safeboot pillar OK (1=yes,0=no)
# TYPE void_pillars_safeboot_ok gauge
void_pillars_safeboot_ok $s_ok

# HELP void_pillars_devnet_ok Devnet pillar OK (1=yes,0=no)
# TYPE void_pillars_devnet_ok gauge
void_pillars_devnet_ok $d_ok

# HELP void_pillars_mainnet_ok Mainnet pillars OK (1=yes,0=no)
# TYPE void_pillars_mainnet_ok gauge
void_pillars_mainnet_ok $m_ok

# HELP void_pillars_health Global VOID pillars health (1=ok,0=bad)
# TYPE void_pillars_health gauge
void_pillars_health $health

# HELP void_pillars_last_run_ts Unix timestamp of last global pillars exporter run
# TYPE void_pillars_last_run_ts gauge
void_pillars_last_run_ts $now
EOF

# Atomic install
sudo install -m 0644 "$tmp" "$OUT"

echo "[ok] wrote $OUT (health=$health safeboot_ok=$s_ok devnet_ok=$d_ok mainnet_ok=$m_ok)"
