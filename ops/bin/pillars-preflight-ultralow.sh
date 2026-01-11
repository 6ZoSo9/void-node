#!/usr/bin/env bash
set -euo pipefail

REPO="${REPO:-$HOME/dev/void-node}"
cd "$REPO" || exit 1

TS="$(date +%Y%m%d-%H%M%S)"
OUT="/tmp/void-pillars-preflight-ultralow.$TS.out.txt"

# warm sudo so nothing prompts mid-run
sudo -v

run_one() {
  local cmd="$1"
  echo "=== running: $cmd ===" >>"$OUT"
  bash -lc "$cmd" >>"$OUT" 2>&1
}

set +e
{
  echo "[saved] $OUT"
  echo "ts=$TS"
  echo
} >"$OUT"

# Pick the most likely runner(s) without scanning the whole repo.
if [[ -x "ops/void-pillars-preflight.sh" ]]; then
  run_one "bash ops/void-pillars-preflight.sh"
elif [[ -x "ops/void-pillars-health-all.sh" ]]; then
  run_one "bash ops/void-pillars-health-all.sh"
elif command -v make >/dev/null 2>&1; then
  # try common targets quietly; first one that exists will run
  make -n pillars-preflight >/dev/null 2>&1 && run_one "make pillars-preflight" || true
  make -n pillars-preflight >/dev/null 2>&1 || make -n preflight >/dev/null 2>&1 && run_one "make preflight" || true
fi

rc="$?"
set -e

echo >>"$OUT"
echo "[exit] rc=$rc" >>"$OUT"

# ultralow output to terminal:
echo "[saved] $OUT"
echo "=== last 80 lines ==="
tail -n 80 "$OUT" || true

exit "$rc"
