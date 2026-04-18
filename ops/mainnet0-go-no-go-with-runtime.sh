#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

ROOT="${ROOT:-$HOME/dev/void-node}"
cd "$ROOT"

need() {
  command -v "$1" >/dev/null 2>&1 || { echo "[ERR] missing command: $1" >&2; exit 1; }
}
need bash
need find
need awk
need sort

pick_first() {
  find ops -maxdepth 1 -type f \
    \( "$@" \) \
    | grep -v '/mainnet0-go-no-go-with-runtime\.sh$' \
    | LC_ALL=C sort \
    | head -n 1
}

run_if_found() {
  local label="$1"
  local path="$2"
  if [ -n "$path" ] && [ -f "$path" ]; then
    echo
    echo "=== [$label] $path ==="
    bash "$path"
  else
    echo
    echo "=== [$label] skipped (not found) ==="
  fi
}

echo "=== [0] git truth ==="
git branch --show-current
git rev-parse --short HEAD
git status --short || true

echo
echo "=== [1] required runtime proposer proof ==="
make prove-main-runtime-autoprop

PREFLIGHT="$(pick_first -name '*mainnet0*exec*preflight*.sh' -o -name '*mainnet0*preflight*.sh')"
READINESS="$(pick_first -name '*mainnet0*launch*readiness*.sh' -o -name '*launch*readiness*runner*.sh')"
GONOGO="$(pick_first -name '*mainnet0*go*no*go*.sh' -o -name '*go-no-go*bundle*.sh')"

echo
echo "=== [2] discovered runners ==="
printf 'preflight=%s\n' "${PREFLIGHT:-}"
printf 'readiness=%s\n' "${READINESS:-}"
printf 'gonogo=%s\n' "${GONOGO:-}"

run_if_found "3" "$PREFLIGHT"
run_if_found "4" "$READINESS"
run_if_found "5" "$GONOGO"

echo
echo "=== [6] final runtime truth ==="
curl -fsS --max-time 5 http://127.0.0.1:4100/head.txt ; echo
curl -fsS --max-time 5 http://127.0.0.1:4100/__void/metrics/commit-direct-autoprop.v1/status.json ; echo
curl -fsS --max-time 5 http://127.0.0.1:4100/__void/metrics/proposer.commit-direct.v2fs/status.json ; echo
curl -fsS --max-time 5 http://127.0.0.1:4100/__void/ready.json ; echo
