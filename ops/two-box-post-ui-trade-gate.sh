#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

TS="$(date +%Y%m%d-%H%M%S)"
OUT="/tmp/two-box-post-ui-trade-gate-$TS"
mkdir -p "$OUT"

run_step() {
  local name="$1"
  local cmd="$2"
  local log="$OUT/$name.log"
  echo
  echo "=== [$name] begin ==="
  echo "[cmd] $cmd"
  bash -lc "$cmd" | tee "$log"
  local rc="${PIPESTATUS[0]}"
  if [ "$rc" -ne 0 ]; then
    echo "[fail] $name rc=$rc"
    echo "[log] $log"
    exit "$rc"
  fi
  echo "[ok] $name"
  echo "[log] $log"
}

echo "=== canonical gate baseline ==="
git branch --show-current
git rev-parse --short HEAD
git describe --tags --abbrev=0 2>/dev/null || true

echo
echo "=== local node preflight ==="
systemctl --user restart void-node.service
sleep 8
curl -fsS --max-time 20 http://127.0.0.1:4100/health > "$OUT/local.health.preflight.json"
cat "$OUT/local.health.preflight.json"

run_step "participant_golden_path" "bash ops/two-box-participant-golden-path-proof.sh"
run_step "product_ui_smoke" "bash ops/two-box-product-ui-smoke.sh"
run_step "datanet_proof" "bash ops/two-box-datanet-proof.sh"

echo
echo "=== canonical gate summary ==="
python3 - <<'PY' "$OUT"
import json, os, sys, glob
out = sys.argv[1]
logs = sorted(glob.glob(os.path.join(out, "*.log")))
summary = {
    "ok": True,
    "out_dir": out,
    "logs": logs,
    "steps": [os.path.basename(x) for x in logs],
}
print(json.dumps(summary, indent=2))
PY

echo "[ok] canonical two-box post-ui-trade gate green"
echo "out=$OUT"
