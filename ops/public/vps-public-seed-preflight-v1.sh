#!/usr/bin/env bash
set -euo pipefail

STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="${OUT:-/tmp/void-vps-public-seed-preflight-v1-$STAMP}"
mkdir -p "$OUT"

LOG="$OUT/preflight.log"
VPS_SSH="${VPS_SSH:-}"
VPS_HOST="${VPS_HOST:-}"
VPS_PORT="${VPS_PORT:-22}"

SSH_OPTS=(
  -o BatchMode=yes
  -o ConnectTimeout=8
  -o StrictHostKeyChecking=accept-new
  -p "$VPS_PORT"
)

{
  echo "=== VOID VPS public seed preflight v1 ==="
  date -Is
  echo

  echo "=== local repo truth ==="
  git status --short
  git branch --show-current
  git rev-parse --short HEAD
  git describe --tags --always --dirty
  echo

  echo "=== local runtime readiness ==="
  curl -fsS --max-time 8 http://127.0.0.1:4100/__void/ready.json && echo
  echo

  echo "=== local listener safety ==="
  ss -ltnp 2>/dev/null | grep -E '(:4100|:4700|:8545)\b' || true
  echo

  if ss -ltnp 2>/dev/null | grep -E '0\.0\.0\.0:8545|\[::\]:8545'; then
    echo "[FAIL] local 8545 appears public-bound"
    exit 1
  fi
  echo "[ok] local 8545 private-bind invariant preserved"
  echo

  if [ -z "$VPS_SSH" ]; then
    echo "=== remote preflight skipped ==="
    echo "VPS_SSH is not set."
    echo "Local-only preflight passed."
    echo
    echo "To run remote preflight later:"
    echo "VPS_SSH=user@server_ip bash ops/public/vps-public-seed-preflight-v1.sh"
    echo
    echo "out=$OUT"
    exit 0
  fi

  echo "=== remote target ==="
  echo "vps_ssh=$VPS_SSH"
  echo "vps_host=${VPS_HOST:-unset}"
  echo "vps_port=$VPS_PORT"
  echo

  echo "=== remote ssh connectivity ==="
  ssh "${SSH_OPTS[@]}" "$VPS_SSH" 'echo "[ok] ssh connected"; whoami; hostname; date -Is'
  echo

  echo "=== remote OS ==="
  ssh "${SSH_OPTS[@]}" "$VPS_SSH" 'uname -a; echo; test -f /etc/os-release && cat /etc/os-release || true'
  echo

  echo "=== remote resources ==="
  ssh "${SSH_OPTS[@]}" "$VPS_SSH" 'echo "--- memory ---"; free -h || true; echo "--- disk ---"; df -h / || true; echo "--- cpu ---"; nproc || true'
  echo

  echo "=== remote public IP discovery ==="
  ssh "${SSH_OPTS[@]}" "$VPS_SSH" 'echo "ipv4=$(curl -4 -fsS --max-time 8 https://api.ipify.org 2>/dev/null || true)"; echo "ipv6=$(curl -6 -fsS --max-time 8 https://api64.ipify.org 2>/dev/null || true)"'
  echo

  echo "=== remote listening ports ==="
  ssh "${SSH_OPTS[@]}" "$VPS_SSH" 'ss -ltnp 2>/dev/null || ss -ltn 2>/dev/null || true'
  echo

  echo "=== remote RPC exposure check ==="
  if ssh "${SSH_OPTS[@]}" "$VPS_SSH" "ss -ltnp 2>/dev/null | grep -E '(:8545)\b'"; then
    echo "[FAIL] remote 8545 listener detected; do not use as public gateway until understood"
    exit 1
  else
    echo "[ok] no remote 8545 listener detected"
  fi
  echo

  echo "=== remote public gateway port occupancy ==="
  ssh "${SSH_OPTS[@]}" "$VPS_SSH" "ss -ltnp 2>/dev/null | grep -E '(:80|:443|:4100)\b' || true"
  echo

  echo "[ok] remote preflight completed without mutation"
  echo "out=$OUT"
} | tee "$LOG"
