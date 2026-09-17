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
need sort

pick_first() {
  find ops -maxdepth 1 -type f \( "$@" \) | LC_ALL=C sort | head -n 1
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
    echo "=== [$label] not found; skipping ==="
  fi
}

echo "=== [0] git truth ==="
git branch --show-current
git rev-parse --short HEAD
git status --short || true

echo
echo "=== [1] required main runtime proposer proof ==="
MODE=idle make prove-main-runtime-autoprop

echo
echo "=== [2] required Alienware follower autostart proof ==="
make prove-alienware-follower-autostart

PRE="$(pick_first -name 'mainnet0-mainnet-exec-preflight.sh')"
READINESS="$(pick_first -name 'mainnet0-launch-readiness.sh')"
GONOGO="$(pick_first -name 'mainnet0-go-no-go-bundle.sh')"

echo
echo "=== [3] discovered runners ==="
printf 'preflight=%s\n' "${PRE:-}"
printf 'readiness=%s\n' "${READINESS:-}"
printf 'gonogo=%s\n' "${GONOGO:-}"

run_if_found 4 "$PRE"
run_if_found 5 "$READINESS"
run_if_found 6 "$GONOGO"

echo
echo "[ok] mainnet0 runtime+follower wrapper passed"
