#!/usr/bin/env bash
set -euo pipefail

TS="$(date +%Y%m%d-%H%M%S)"
OUT="${OUT:-/tmp/void-prom-restore-from-ops-snap-v3.$TS.out.txt}"
exec > >(tee -a "$OUT") 2>&1
echo "[saved] $OUT"
echo

if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
  echo "[ERR] run as root: sudo bash $0" >&2
  exit 2
fi

REAL_USER="${SUDO_USER:-zoso}"
USER_HOME="$(getent passwd "$REAL_USER" | cut -d: -f6 || true)"
[[ -n "${USER_HOME:-}" && -d "$USER_HOME" ]] || USER_HOME="/home/$REAL_USER"

REPO_DEFAULT="$USER_HOME/dev/void-node"
REPO="${REPO:-$REPO_DEFAULT}"
SNAP_ROOT="$REPO/ops/prom-snap"

echo "=== [0] context ==="
echo "EUID=$(id -u) REAL_USER=$REAL_USER USER_HOME=$USER_HOME"
echo "REPO=$REPO"
echo "SNAP_ROOT=$SNAP_ROOT"
echo

echo "=== [1] choose latest OK snapshot dir (PROM_YML_OK) ==="
if [[ ! -d "$SNAP_ROOT" ]]; then
  echo "[FAIL] missing $SNAP_ROOT" >&2
  exit 3
fi

SNAP_DIR=""
while IFS= read -r d; do
  [[ -d "$d" ]] || continue
  if [[ -f "$d/PROM_YML_OK" ]]; then
    SNAP_DIR="$d"
    break
  fi
done < <(ls -1dt "$SNAP_ROOT"/* 2>/dev/null || true)

if [[ -z "${SNAP_DIR:-}" ]]; then
  echo "[FAIL] no PROM_YML_OK snapshots found under $SNAP_ROOT" >&2
  echo "[hint] run: $REPO/ops/prom-snap.sh (as zoso) to create a good one" >&2
  exit 4
fi

echo "[ok] SNAP_DIR=$SNAP_DIR"
echo

CAND1="$SNAP_DIR/prometheus.yml"
CAND2="$SNAP_DIR/etc/prometheus/prometheus.yml"
if [[ -f "$CAND1" ]]; then
  SRC_YML="$CAND1"
elif [[ -f "$CAND2" ]]; then
  SRC_YML="$CAND2"
else
  echo "[FAIL] snapshot has no prometheus.yml at expected paths" >&2
  echo "tried: $CAND1 and $CAND2" >&2
  exit 5
fi

echo "=== [2] validate chosen snapshot YAML (belt+suspenders) ==="
echo "SRC_YML=$SRC_YML"
promtool check config "$SRC_YML"
echo "[ok] snapshot YAML parses"
echo

echo "=== [3] backup live /etc/prometheus ==="
BAK="/root/prometheus-config-LIVE.BAK.$TS.tgz"
tar -C /etc -czf "$BAK" prometheus
echo "[bak] $BAK"
echo

echo "=== [4] restore prometheus.yml + rules/alerts if present ==="
install -m 0644 "$SRC_YML" /etc/prometheus/prometheus.yml
echo "[ok] installed /etc/prometheus/prometheus.yml"

# restore rules/alerts if snapshot contains them (optional)
if [[ -d "$SNAP_DIR/rules.d" ]]; then
  rsync -a --delete "$SNAP_DIR/rules.d/" /etc/prometheus/rules.d/
  echo "[ok] restored rules.d"
fi
if [[ -d "$SNAP_DIR/alerts.d" ]]; then
  rsync -a --delete "$SNAP_DIR/alerts.d/" /etc/prometheus/alerts.d/
  echo "[ok] restored alerts.d"
fi
if [[ -d "$SNAP_DIR/etc/prometheus/rules.d" ]]; then
  rsync -a --delete "$SNAP_DIR/etc/prometheus/rules.d/" /etc/prometheus/rules.d/
  echo "[ok] restored etc/prometheus/rules.d"
fi
if [[ -d "$SNAP_DIR/etc/prometheus/alerts.d" ]]; then
  rsync -a --delete "$SNAP_DIR/etc/prometheus/alerts.d/" /etc/prometheus/alerts.d/
  echo "[ok] restored etc/prometheus/alerts.d"
fi

echo
echo "=== [5] promtool check live ==="
promtool check config /etc/prometheus/prometheus.yml
echo "[ok] live YAML parses"
echo

echo "=== [6] restart Prometheus + wait ready (60s) ==="
systemctl restart prometheus
PROM="http://127.0.0.1:9090"
for i in $(seq 1 60); do
  if curl -fsS --max-time 2 "$PROM/-/ready" >/dev/null; then
    echo "[ok] /-/ready"
    curl -fsS --max-time 2 "$PROM/-/healthy" >/dev/null && echo "[ok] /-/healthy" || true
    exit 0
  fi
  sleep 1
done

echo "[ERR] not ready after 60s" >&2
systemctl status prometheus --no-pager -l || true
journalctl -u prometheus --since "10 min ago" --no-pager | tail -n 160 || true
exit 7
