#!/usr/bin/env bash
set -euo pipefail


wait_active_targets_v1() {
  local url="${1:-http://127.0.0.1:9090}"
  local secs="${2:-30}"
  local want="${3:-1}"
  echo "=== wait active targets (>=${want}, up to ${secs}s) ==="
  for i in $(seq 1 "$secs"); do
    local n
    n="$(curl -fsS --max-time 2 "${url}/api/v1/targets?state=active" 2>/dev/null \
      | jq -r ".data.activeTargets | length" 2>/dev/null || echo 0)"
    printf "t=%s activeTargets=%s\n" "$i" "$n"
    if [ "${n:-0}" -ge "$want" ]; then
      echo "[ok] targets present"
      return 0
    fi
    sleep 1
  done
  echo "[WARN] active targets still <${want} after ${secs}s" >&2
  return 1
}


TS="$(date +%Y%m%d-%H%M%S)"
OUT="/tmp/void-prom-restore-from-ops-snap-v4.$TS.out.txt"
exec > >(tee -a "$OUT") 2>&1
echo "[saved] $OUT"
echo

# --- resolve real user/home when run under sudo ---
REAL_USER="${SUDO_USER:-$(id -un)}"
USER_HOME="$(getent passwd "$REAL_USER" | cut -d: -f6)"
if [[ -z "${USER_HOME:-}" || ! -d "$USER_HOME" ]]; then
  echo "[FAIL] cannot resolve USER_HOME for REAL_USER=$REAL_USER" >&2
  exit 2
fi

REPO="${REPO:-$USER_HOME/dev/void-node}"
SNAP_ROOT="${SNAP_ROOT:-$REPO/ops/prom-snap}"

echo "=== [0] context ==="
echo "EUID=$EUID REAL_USER=$REAL_USER USER_HOME=$USER_HOME"
echo "REPO=$REPO"
echo "SNAP_ROOT=$SNAP_ROOT"
echo

if [[ ! -d "$SNAP_ROOT" ]]; then
  echo "[FAIL] missing SNAP_ROOT: $SNAP_ROOT" >&2
  exit 2
fi

# --- find newest snapshot directory stamped OK ---
echo "=== [1] find latest PROM_YML_OK snapshot ==="
SNAP_DIR=""
while IFS= read -r d; do
  [[ -d "$d" ]] || continue
  [[ -f "$d/PROM_YML_OK" ]] || continue
  [[ -f "$d/prometheus.yml" ]] || continue
  SNAP_DIR="$d"
  break
done < <(ls -1dt "$SNAP_ROOT"/* 2>/dev/null || true)

if [[ -z "$SNAP_DIR" ]]; then
  echo "[FAIL] no snapshot found with PROM_YML_OK + prometheus.yml under $SNAP_ROOT" >&2
  echo "hint: run: cd \"$REPO\" && ./ops/prom-snap.sh" >&2
  exit 2
fi

echo "[ok] SNAP_DIR=$SNAP_DIR"
SRC_YML="$SNAP_DIR/prometheus.yml"

echo
echo "=== [2] validate snapshot prometheus.yml ==="
if ! promtool check config "$SRC_YML"; then
  echo "[FAIL] snapshot prometheus.yml fails promtool; refusing restore: $SRC_YML" >&2
  exit 2
fi
echo "[ok] snapshot YAML parses"

# snapshot layout support:
# - rules live in $SNAP_DIR/rules.d (dir) or $SNAP_DIR/rules.d/* (files)
# - alerts live in $SNAP_DIR/alerts.d (dir) OR legacy $SNAP_DIR/alerts
SRC_RULES_DIR=""
if [[ -d "$SNAP_DIR/rules.d" ]]; then SRC_RULES_DIR="$SNAP_DIR/rules.d"; fi

SRC_ALERTS_DIR=""
if [[ -d "$SNAP_DIR/alerts.d" ]]; then
  SRC_ALERTS_DIR="$SNAP_DIR/alerts.d"
elif [[ -d "$SNAP_DIR/alerts" ]]; then
  SRC_ALERTS_DIR="$SNAP_DIR/alerts"
fi

echo
echo "=== [3] take root backup of current live config ==="
BAK_TGZ="/root/prometheus-config-BEFORE-restore.$TS.tgz"
tar -C / -czf "$BAK_TGZ" \
  etc/prometheus/prometheus.yml \
  etc/prometheus/rules.d \
  etc/prometheus/alerts.d 2>/dev/null || true
echo "[bak] $BAK_TGZ"

echo
echo "=== [4] restore configs from snapshot ==="
install -m 0644 "$SRC_YML" /etc/prometheus/prometheus.yml
echo "[ok] restored /etc/prometheus/prometheus.yml"

if [[ -n "$SRC_RULES_DIR" ]]; then
  rsync -a --delete "$SRC_RULES_DIR"/ /etc/prometheus/rules.d/
  echo "[ok] restored /etc/prometheus/rules.d from $(basename "$SRC_RULES_DIR")"
else
  echo "[warn] snapshot had no rules.d; leaving /etc/prometheus/rules.d as-is"
fi

if [[ -n "$SRC_ALERTS_DIR" ]]; then
  mkdir -p /etc/prometheus/alerts.d
  rsync -a --delete "$SRC_ALERTS_DIR"/ /etc/prometheus/alerts.d/
  echo "[ok] restored /etc/prometheus/alerts.d from $(basename "$SRC_ALERTS_DIR")"
else
  echo "[warn] snapshot had no alerts.d/alerts; leaving /etc/prometheus/alerts.d as-is"
fi

echo
echo "=== [5] validate live config + rules ==="
promtool check config /etc/prometheus/prometheus.yml
echo "[ok] live YAML parses"

# rules checks (best-effort; promtool prints which file fails)
if ls /etc/prometheus/rules.d/*.yml >/dev/null 2>&1; then
  promtool check rules /etc/prometheus/rules.d/*.yml
fi
if ls /etc/prometheus/alerts.d/*.yml >/dev/null 2>&1; then
  promtool check rules /etc/prometheus/alerts.d/*.yml
fi
echo "[ok] rules parse"

echo
echo "=== [6] restart Prometheus + wait ready (90s) ==="
systemctl restart prometheus
# v4+: avoid false 0 targets right after restart
wait_active_targets_v1 "${PROM:-http://127.0.0.1:9090}" 30 1
PROM="http://127.0.0.1:9090"
for i in $(seq 1 90); do
  if curl -fsS --max-time 2 "$PROM/-/ready" >/dev/null; then
    echo "[ok] /-/ready"
    curl -fsS --max-time 2 "$PROM/-/healthy" >/dev/null && echo "[ok] /-/healthy" || echo "[warn] /-/healthy not OK"
    echo
echo "=== [7] active targets count ==="
AT="$(curl -fsS "${PROM:-http://127.0.0.1:9090}/api/v1/targets?state=active" | jq '.data.activeTargets | length' 2>/dev/null || echo 0)"
echo "$AT"
if [ "${AT}" -lt 1 ]; then
  echo "[FAIL] activeTargets=0 after restart (something is still broken)" >&2
  exit 9
fi
