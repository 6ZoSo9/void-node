#!/usr/bin/env bash
set -euo pipefail

STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="${OUT:-/tmp/void-vps-public-seed-remote-proof-v1-$STAMP}"
mkdir -p "$OUT"

LOG="$OUT/remote-proof.log"
BASE="${VOID_PUBLIC_BASE:-}"

status_of() {
  local url="$1"
  curl -k -L -sS -o /dev/null -w "%{http_code}" --max-time 12 "$url" 2>/dev/null || echo "000"
}

fetch_if_ok() {
  local url="$1"
  local file="$2"
  curl -k -L -fsS --max-time 12 "$url" -o "$file" 2>/dev/null || true
}

{
  echo "=== VOID VPS public seed remote proof v1 ==="
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

  if [ -z "$BASE" ]; then
    echo "=== remote proof skipped ==="
    echo "VOID_PUBLIC_BASE is not set."
    echo "Local-only placeholder proof passed."
    echo
    echo "To run later:"
    echo "VOID_PUBLIC_BASE=https://seed.example.org bash ops/public/vps-public-seed-remote-proof-v1.sh"
    echo
    echo "out=$OUT"
    exit 0
  fi

  BASE="${BASE%/}"
  echo "=== public base ==="
  echo "base=$BASE"
  echo

  echo "=== expected public route status codes ==="
  PUBLIC_ROUTES=(
    "/"
    "/participant"
    "/participant?account=tester"
    "/__void/ready.json"
    "/__void/public-bootstrap.json"
    "/datanet/materialized-status"
  )

  PUBLIC_OK=0
  for route in "${PUBLIC_ROUTES[@]}"; do
    code="$(status_of "$BASE$route")"
    echo "$code $route"
    if [ "$code" != "000" ] && [ "$code" -ge 200 ] && [ "$code" -lt 500 ]; then
      PUBLIC_OK=$((PUBLIC_OK + 1))
    fi
  done
  echo "public_routes_reachable_count=$PUBLIC_OK"
  echo

  echo "=== fetch public JSON if available ==="
  fetch_if_ok "$BASE/__void/ready.json" "$OUT/ready.json"
  fetch_if_ok "$BASE/__void/public-bootstrap.json" "$OUT/public-bootstrap.json"
  fetch_if_ok "$BASE/datanet/materialized-status" "$OUT/materialized-status.json"

  for f in "$OUT/ready.json" "$OUT/public-bootstrap.json" "$OUT/materialized-status.json"; do
    if [ -s "$f" ]; then
      echo "--- $(basename "$f") ---"
      python3 -m json.tool "$f" >/dev/null 2>&1 && echo "json_ok=true" || echo "json_ok=false"
    fi
  done
  echo

  echo "=== blocked private route status codes ==="
  BLOCKED_ROUTES=(
    "/rpc"
    "/admin"
    "/operator"
    "/validator/admin"
    "/debug"
    "/.env"
    "/keys"
    "/wallet"
    "/secrets"
  )

  BLOCK_FAIL=0
  for route in "${BLOCKED_ROUTES[@]}"; do
    code="$(status_of "$BASE$route")"
    echo "$code $route"
    if [ "$code" = "200" ]; then
      BLOCK_FAIL=$((BLOCK_FAIL + 1))
    fi
  done
  echo "blocked_routes_returning_200=$BLOCK_FAIL"
  echo

  echo "=== public 8545 reachability probe ==="
  HOSTPORT="${BASE#http://}"
  HOSTPORT="${HOSTPORT#https://}"
  HOSTPORT="${HOSTPORT%%/*}"
  HOST="${HOSTPORT%%:*}"

  if command -v nc >/dev/null 2>&1; then
    if nc -z -w 5 "$HOST" 8545 >/dev/null 2>&1; then
      echo "[FAIL] tcp/8545 reachable on public host"
      exit 1
    else
      echo "[ok] tcp/8545 not reachable on public host"
    fi
  else
    echo "[warn] nc not installed; skipping tcp/8545 probe"
  fi
  echo

  if [ "$PUBLIC_OK" -lt 1 ]; then
    echo "[FAIL] no expected public routes reachable"
    exit 1
  fi

  if [ "$BLOCK_FAIL" -gt 0 ]; then
    echo "[FAIL] one or more private routes returned HTTP 200"
    exit 1
  fi

  echo "[ok] remote public seed proof completed"
  echo "out=$OUT"
} | tee "$LOG"
