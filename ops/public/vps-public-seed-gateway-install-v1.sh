#!/usr/bin/env bash
set -euo pipefail

STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="${OUT:-/tmp/void-vps-public-seed-gateway-install-v1-$STAMP}"
mkdir -p "$OUT"

LOG="$OUT/install.log"

CONFIRM_REQUIRED="INSTALL_VOID_PUBLIC_SEED_GATEWAY_V1"
CONFIRM="${VOID_VPS_INSTALL_CONFIRM:-}"
VPS_SSH="${VPS_SSH:-}"
VPS_PORT="${VPS_PORT:-22}"

SSH_OPTS=(
  -o BatchMode=yes
  -o ConnectTimeout=8
  -o StrictHostKeyChecking=accept-new
  -p "$VPS_PORT"
)

{
  echo "=== VOID VPS public seed gateway install v1 ==="
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

  echo "=== local RPC safety ==="
  ss -ltnp 2>/dev/null | grep -E '(:4100|:4700|:8545)\b' || true
  echo

  if ss -ltnp 2>/dev/null | grep -E '0\.0\.0\.0:8545|\[::\]:8545'; then
    echo "[FAIL] local 8545 appears public-bound"
    exit 1
  fi
  echo "[ok] local 8545 private-bind invariant preserved"
  echo

  echo "=== install gate ==="
  if [ "$CONFIRM" != "$CONFIRM_REQUIRED" ]; then
    echo "[REFUSE] installer is gated and made no changes"
    echo "required: VOID_VPS_INSTALL_CONFIRM=$CONFIRM_REQUIRED"
    echo "current: ${CONFIRM:-unset}"
    echo
    echo "To run later, after VPS preflight and human review:"
    echo "VPS_SSH=user@server_ip VOID_VPS_INSTALL_CONFIRM=$CONFIRM_REQUIRED bash ops/public/vps-public-seed-gateway-install-v1.sh"
    echo
    echo "out=$OUT"
    exit 0
  fi

  if [ -z "$VPS_SSH" ]; then
    echo "[FAIL] VPS_SSH is required for confirmed install"
    exit 1
  fi

  echo "[ok] explicit install confirmation present"
  echo "vps_ssh=$VPS_SSH"
  echo "vps_port=$VPS_PORT"
  echo

  echo "=== remote safety precheck ==="
  ssh "${SSH_OPTS[@]}" "$VPS_SSH" 'echo "[ok] ssh connected"; whoami; hostname; date -Is'
  echo

  if ssh "${SSH_OPTS[@]}" "$VPS_SSH" "ss -ltnp 2>/dev/null | grep -E '(:8545)\b'"; then
    echo "[FAIL] remote 8545 listener detected; refusing install"
    exit 1
  fi
  echo "[ok] no remote 8545 listener detected"
  echo

  echo "=== confirmed install placeholder ==="
  echo "This v1 script intentionally stops before mutation."
  echo "The next lane will add reviewed install steps after remote preflight is captured."
  echo "[ok] no remote mutation performed in v1"
  echo "out=$OUT"
} | tee "$LOG"
